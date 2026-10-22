import type { Page, Route } from "@playwright/test";

/**
 * Stand-ins for Cognito and the Portfolio Studio API, so the admin can be
 * exercised end to end against the production build without AWS. The build
 * for these tests points VITE_STUDIO_API_URL / VITE_COGNITO_* here (see ci.yml).
 */
export const STUDIO_API = "https://studio-api.example.test";
export const AUTHORITY = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_E2ETEST";
export const AUTH_DOMAIN = "https://auth.example.test";
export const CLIENT_ID = "e2e-client";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE",
};

export const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill({
    status,
    headers: { ...cors, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** An unsigned JWT with the given claims (oidc-client-ts reads, the API verifies). */
export function fakeJwt(claims: Record<string, unknown>) {
  return `${base64url({ alg: "RS256", kid: "test" })}.${base64url(claims)}.signature`;
}

export async function stubCognito(page: Page, onToken?: (body: URLSearchParams) => void) {
  await page.route(`${AUTHORITY}/.well-known/openid-configuration`, (route) =>
    json(route, 200, {
      issuer: AUTHORITY,
      authorization_endpoint: `${AUTH_DOMAIN}/oauth2/authorize`,
      token_endpoint: `${AUTH_DOMAIN}/oauth2/token`,
      userinfo_endpoint: `${AUTH_DOMAIN}/oauth2/userInfo`,
      jwks_uri: `${AUTHORITY}/.well-known/jwks.json`,
      response_types_supported: ["code"],
      scopes_supported: ["openid", "email", "profile"],
      code_challenge_methods_supported: ["S256"],
    }),
  );
  await page.route(`${AUTH_DOMAIN}/oauth2/token`, async (route) => {
    const body = new URLSearchParams(route.request().postData() ?? "");
    onToken?.(body);
    const now = Math.floor(Date.now() / 1000);
    await json(route, 200, {
      id_token: fakeJwt({ iss: AUTHORITY, aud: CLIENT_ID, sub: "admin-sub", email: "andre@example.test", iat: now, exp: now + 3600, token_use: "id" }),
      access_token: fakeJwt({ iss: AUTHORITY, client_id: CLIENT_ID, sub: "admin-sub", token_use: "access", scope: "openid portfolio-studio/admin", exp: now + 3600 }),
      refresh_token: "refresh-token",
      token_type: "Bearer",
      expires_in: 3600,
    });
  });
  await page.route(`${AUTH_DOMAIN}/oauth2/revoke`, (route) => json(route, 200, {}));
}

/** Puts a signed-in user in sessionStorage before the app starts. */
export async function signIn(page: Page, expiresInSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id_token: fakeJwt({ iss: AUTHORITY, aud: CLIENT_ID, sub: "admin-sub", email: "andre@example.test", exp: now + expiresInSeconds }),
    access_token: fakeJwt({ sub: "admin-sub", exp: now + expiresInSeconds }),
    refresh_token: "refresh-token",
    token_type: "Bearer",
    scope: "openid email profile portfolio-studio/admin",
    profile: { sub: "admin-sub", email: "andre@example.test", iss: AUTHORITY, aud: CLIENT_ID, exp: now + expiresInSeconds, iat: now },
    expires_at: now + expiresInSeconds,
  };
  await page.addInitScript(
    ([key, value]) => window.sessionStorage.setItem(key, value),
    [`oidc.user:${AUTHORITY}:${CLIENT_ID}`, JSON.stringify(user)] as const,
  );
}

// ------------------------------------------------------------------ fake API

type Locale = "pt" | "en" | "es";
type Draft = {
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  content: unknown;
  translationStatus: "draft" | "ready";
  updatedAt: string;
  seoTitle?: string;
  seoDescription?: string;
};
type Article = Record<string, unknown> & {
  id: string;
  status: string;
  version: number;
  locales: Partial<Record<Locale, Draft>>;
  live?: { revision: number; slugs: Partial<Record<Locale, string>>; publishedAt: string; updatedAt: string; seq: number };
  pending?: Record<string, unknown>;
};

export type FakeStudio = {
  articles: Map<string, Article>;
  media: Record<string, unknown>[];
  publications: Record<string, unknown>[];
  deployments: Map<string, { id: string; status: string; polls: number; articleId?: string; action: string }>;
  requests: { method: string; path: string; body: unknown }[];
  /** Make the next PATCH of an article answer 409. */
  failNextPatch: boolean;
  /** Every request answers 401 (expired session). */
  expired: boolean;
};

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

export function seedArticle(fake: FakeStudio, overrides: Partial<Article> = {}): Article {
  const now = new Date().toISOString();
  const id = overrides.id ?? `00000000-0000-4000-8000-${String(fake.articles.size + 1).padStart(12, "0")}`;
  const article: Article = {
    id,
    type: "article",
    status: "draft",
    tags: ["aws"],
    authorId: "admin-sub",
    createdAt: now,
    updatedAt: now,
    updatedBy: "andre",
    version: 1,
    revisionCount: 0,
    pendingStale: false,
    locales: {
      pt: { locale: "pt", slug: "arquitetura-do-studio", title: "Arquitetura do Studio", excerpt: "Como o CMS funciona.", content: doc("Corpo."), translationStatus: "ready", updatedAt: now },
    },
    ...overrides,
  };
  fake.articles.set(id, article);
  return article;
}

const listItem = (article: Article) => ({
  ...article,
  locales: Object.fromEntries(
    Object.entries(article.locales).map(([locale, draft]) => [locale, { title: draft!.title, slug: draft!.slug, translationStatus: draft!.translationStatus }]),
  ),
});

export async function fakeStudio(page: Page): Promise<FakeStudio> {
  const fake: FakeStudio = {
    articles: new Map(),
    media: [],
    publications: [],
    deployments: new Map(),
    requests: [],
    failNextPatch: false,
    expired: false,
  };

  await page.route("https://uploads.example.test/**", (route) => route.fulfill({ status: 204, headers: cors }));
  await page.route("https://previews.example.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
    }),
  );

  await page.route(`${STUDIO_API}/**`, async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: cors });

    const url = new URL(request.url());
    const path = url.pathname;
    const body = request.postData() ? (JSON.parse(request.postData()!) as Record<string, unknown>) : undefined;
    fake.requests.push({ method, path, body });
    if (fake.expired) return json(route, 401, { message: "Unauthorized" });
    if (!request.headers().authorization?.startsWith("Bearer ")) return json(route, 401, {});

    const now = new Date().toISOString();
    const segments = path.split("/").filter(Boolean); // ["admin", ...]
    const [, resource, id, action] = segments;

    if (resource === "me") return json(route, 200, { sub: "admin-sub", username: "andre" });

    if (resource === "articles") {
      if (!id && method === "GET") {
        const status = url.searchParams.get("status");
        const items = [...fake.articles.values()].filter((article) => !status || article.status === status).map(listItem);
        return json(route, 200, { items, cursor: null });
      }
      if (!id && method === "POST") {
        const locale = (body?.locale as Locale) ?? "pt";
        const title = String(body?.title ?? "");
        const article = seedArticle(fake, {
          type: (body?.type as string) ?? "article",
          tags: [],
          locales: { [locale]: { locale, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), title, excerpt: "", content: { type: "doc", content: [] }, translationStatus: "draft", updatedAt: now } },
        });
        return json(route, 201, article);
      }
      const article = fake.articles.get(id!);
      if (!article) return json(route, 404, { error: "not_found" });

      if (!action && method === "GET") return json(route, 200, article);
      if (!action && method === "PATCH") {
        if (fake.failNextPatch || body?.version !== article.version) {
          fake.failNextPatch = false;
          return json(route, 409, { error: "version_conflict", currentVersion: article.version + 1 });
        }
        for (const [locale, draft] of Object.entries((body?.locales as Record<string, Draft>) ?? {})) {
          article.locales[locale as Locale] = { ...draft, locale: locale as Locale, updatedAt: now };
        }
        Object.assign(article, (body?.article as object) ?? {});
        article.version += 1;
        article.updatedAt = now;
        return json(route, 200, { article, warnings: [] });
      }
      if (action === "publish" && method === "POST") {
        const deploymentId = `deploy-${fake.deployments.size + 1}`;
        fake.deployments.set(deploymentId, { id: deploymentId, status: "queued", polls: 0, articleId: article.id, action: "publish" });
        const locales = (body?.locales as Locale[]) ?? [];
        article.status = "publishing";
        article.pending = { action: "publish", deploymentId, requestedAt: now, requestedBy: "andre", slugs: Object.fromEntries(locales.map((locale) => [locale, article.locales[locale]!.slug])) };
        return json(route, 202, { deployment: { id: deploymentId, status: "queued", trigger: "publish", createdAt: now }, article });
      }
      if (action === "revisions" && method === "GET") return json(route, 200, { items: [], cursor: null });
      return json(route, 404, { error: "not_found" });
    }

    if (resource === "deployments") {
      if (!id) return json(route, 200, { items: [...fake.deployments.values()].map((item) => ({ ...item, trigger: item.action, createdAt: now, updatedAt: now, articleCount: 1, stale: false, requestedBy: "andre" })), cursor: null });
      const deployment = fake.deployments.get(id);
      if (!deployment) return json(route, 404, { error: "not_found" });
      // queued → running → succeeded, one step per poll; success updates the article.
      deployment.polls += 1;
      deployment.status = deployment.polls === 1 ? "running" : "succeeded";
      if (deployment.status === "succeeded" && deployment.articleId) {
        const article = fake.articles.get(deployment.articleId)!;
        const pending = article.pending as { slugs: Partial<Record<Locale, string>> } | undefined;
        if (pending) {
          article.live = { revision: 1, seq: 1, slugs: pending.slugs, publishedAt: now, updatedAt: now };
          delete article.pending;
          article.status = "published";
          article.publishedAt = now;
        }
      }
      return json(route, 200, { ...deployment, trigger: deployment.action, createdAt: now, updatedAt: now, articleCount: 1, stale: false, requestedBy: "andre", runUrl: "https://github.com/owner/site/actions/runs/1" });
    }

    if (resource === "slugs") return json(route, 200, { available: true });

    if (resource === "media") {
      if (id === "upload-url") {
        const mediaId = `0b3e7d7a-2f7c-4a51-9f2e-${String(fake.media.length + 1).padStart(12, "0")}`;
        const media = { id: mediaId, status: "pending", filename: body?.filename, name: String(body?.filename).replace(/\.[^.]+$/, ""), alt: {}, contentType: body?.contentType, size: body?.size, createdAt: now, createdBy: "andre", updatedAt: now, previewUrl: null };
        fake.media.unshift(media);
        return json(route, 201, { media, upload: { url: "https://uploads.example.test/", fields: { key: `uploads/${mediaId}`, "Content-Type": String(body?.contentType) } } });
      }
      if (action === "complete") {
        const media = fake.media.find((item) => item.id === id)!;
        Object.assign(media, { status: "ready", width: 1, height: 1, previewUrl: `https://previews.example.test/${id}.png` });
        return json(route, 200, media);
      }
      if (!id) return json(route, 200, { items: fake.media.filter((item) => item.status === "ready"), cursor: null });
      const media = fake.media.find((item) => item.id === id);
      if (!media) return json(route, 404, { error: "not_found" });
      if (method === "PATCH") {
        Object.assign(media, body);
        return json(route, 200, media);
      }
      if (method === "DELETE") return json(route, 409, { error: "in_use", message: "The image is used by articles.", articles: ["x"] });
      return json(route, 200, { ...media, usages: [] });
    }

    if (resource === "publications") {
      if (!id && method === "GET") return json(route, 200, { items: fake.publications, cursor: null });
      if (!id && method === "POST") {
        const article = fake.articles.get(String(body?.articleId))!;
        const draft = article.locales[body?.locale as Locale]!;
        const publication = {
          id: `pub-${fake.publications.length + 1}`,
          articleId: article.id,
          articleRevision: 1,
          platform: "linkedin",
          locale: body?.locale,
          text: `${draft.title}\n\n${draft.excerpt}\n\nhttps://andrepatrinicola.com.br/${String(body?.locale)}/blog/${draft.slug}`,
          url: `https://andrepatrinicola.com.br/${String(body?.locale)}/blog/${draft.slug}`,
          articleTitle: draft.title,
          articleExcerpt: draft.excerpt,
          status: "draft",
          version: 1,
          attempts: 0,
          createdAt: now,
          createdBy: "andre",
          updatedAt: now,
        };
        fake.publications.unshift(publication);
        return json(route, 201, publication);
      }
      const publication = fake.publications.find((item) => item.id === id);
      if (!publication) return json(route, 404, { error: "not_found" });
      const bump = (change: Record<string, unknown>) => {
        Object.assign(publication, change, { version: Number(publication.version) + 1, updatedAt: now });
        return json(route, 200, publication);
      };
      if (!action && method === "GET") return json(route, 200, publication);
      if (!action && method === "PATCH") return bump({ text: body?.text, status: "draft" });
      if (action === "approve") return bump({ status: "approved", approvedAt: now, approvedBy: "andre" });
      if (action === "mark-published") return bump({ status: "published", publishedVia: "manual", publishedAt: now, ...(body?.remoteUrl ? { remoteUrl: body.remoteUrl } : {}) });
      return json(route, 404, { error: "not_found" });
    }

    if (resource === "integrations") return json(route, 200, { configured: false, connected: false });

    return json(route, 404, { error: "not_found" });
  });

  return fake;
}
