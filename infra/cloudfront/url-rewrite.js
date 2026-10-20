// CloudFront Function (runtime cloudfront-js-2.0), viewer request event.
//
// The site is pre-rendered to `<path>/index.html` files in a private S3
// bucket, which only resolves the root object by itself. This function maps
// clean URLs to those files:
//   /pt/games/pong     -> /pt/games/pong/index.html   (rewrite)
//   /pt/games/pong/    -> 301 /pt/games/pong          (one canonical URL)
//   /play/pong         -> 301 /play/pong/             (games use relative assets)
//   /play/pong/        -> /play/pong/index.html       (rewrite)
//   files with an extension and / pass through unchanged.
//
// scripts/serve-deploy.mjs runs this same file locally, so the preview server
// and production follow identical rules.

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var lastSegment = uri.substring(uri.lastIndexOf("/") + 1);
  var isGame = uri.indexOf("/play/") === 0;

  if (uri === "/" || lastSegment.indexOf(".") !== -1) {
    return request;
  }

  // "//evil.com/" must not become a redirect to another host.
  if (uri.indexOf("//") === 0 || uri.indexOf("\\") !== -1) {
    return notFound();
  }

  if (uri.charAt(uri.length - 1) === "/") {
    if (isGame) {
      request.uri = uri + "index.html";
      return request;
    }
    return redirect(uri.substring(0, uri.length - 1), request.querystring);
  }

  if (isGame) {
    return redirect(uri + "/", request.querystring);
  }

  request.uri = uri + "/index.html";
  return request;
}

function notFound() {
  return { statusCode: 404, statusDescription: "Not Found" };
}

function redirect(location, querystring) {
  var query = [];
  for (var key in querystring) {
    var entry = querystring[key];
    var values = entry.multiValue ? entry.multiValue : [entry];
    for (var i = 0; i < values.length; i++) {
      query.push(key + (values[i].value === "" ? "" : "=" + values[i].value));
    }
  }
  return {
    statusCode: 301,
    statusDescription: "Moved Permanently",
    headers: { location: { value: location + (query.length ? "?" + query.join("&") : "") } },
  };
}
