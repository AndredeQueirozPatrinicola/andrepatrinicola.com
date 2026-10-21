/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public origin used in canonical URLs, Open Graph and the sitemap. */
  readonly VITE_SITE_URL?: string;
  readonly VITE_CONTACT_API_URL?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
