import { describe, expect, it, vi } from "vitest";

import { ApiError, createStudioApi } from "./api";

function setup(response: () => Response, token: string | null = "token") {
  const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response());
  const onUnauthorized = vi.fn();
  const api = createStudioApi({ apiUrl: "https://api.test", getAccessToken: async () => token, onUnauthorized, fetch });
  return { api, fetch, onUnauthorized };
}

describe("studio API client", () => {
  it("sends the access token and JSON body", async () => {
    const { api, fetch } = setup(() => new Response(JSON.stringify({ article: { id: "a" }, warnings: [] }), { status: 200 }));
    await api.articles.update("a b", { version: 3, article: { tags: ["aws"] } });
    expect(fetch).toHaveBeenCalledWith("https://api.test/admin/articles/a%20b", {
      method: "PATCH",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({ version: 3, article: { tags: ["aws"] } }),
    });
  });

  it("builds list queries without empty parameters", async () => {
    const { api, fetch } = setup(() => new Response(JSON.stringify({ items: [], cursor: null }), { status: 200 }));
    await api.articles.list({ status: "draft", cursor: null });
    expect(fetch.mock.calls[0]![0]).toBe("https://api.test/admin/articles?status=draft");
  });

  it("ends the session on 401 and when there is no token", async () => {
    const expired = setup(() => new Response("{}", { status: 401 }));
    await expect(expired.api.me()).rejects.toMatchObject({ status: 401 });
    expect(expired.onUnauthorized).toHaveBeenCalled();

    const signedOut = setup(() => new Response("{}"), null);
    await expect(signedOut.api.me()).rejects.toBeInstanceOf(ApiError);
    expect(signedOut.fetch).not.toHaveBeenCalled();
    expect(signedOut.onUnauthorized).toHaveBeenCalled();
  });

  it("exposes the API's error code and fields", async () => {
    const { api } = setup(() => new Response(JSON.stringify({ error: "invalid_request", fields: ["locales.pt.title"] }), { status: 400 }));
    const error = (await api.articles.get("a").catch((reason: unknown) => reason)) as ApiError;
    expect(error).toMatchObject({ status: 400, code: "invalid_request" });
    expect(error.fields).toEqual(["locales.pt.title"]);
  });

  it("reports network failures distinctly", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const api = createStudioApi({ apiUrl: "https://api.test", getAccessToken: async () => "t", onUnauthorized: vi.fn(), fetch });
    await expect(api.me()).rejects.toMatchObject({ status: 0, code: "network_error" });
  });

  it("returns nothing for 204", async () => {
    const { api } = setup(() => new Response(null, { status: 204 }));
    await expect(api.articles.remove("a")).resolves.toBeUndefined();
  });
});
