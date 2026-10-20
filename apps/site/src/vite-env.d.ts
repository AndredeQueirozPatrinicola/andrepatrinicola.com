/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public origin used in canonical URLs, Open Graph and the sitemap. */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
