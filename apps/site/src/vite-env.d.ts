/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public origin used in canonical URLs, Open Graph and the sitemap. */
  readonly VITE_SITE_URL?: string;
  readonly VITE_CONTACT_API_URL?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Portfolio assistant: POST endpoint of the API (output ai_chat_url). */
  readonly VITE_AI_CHAT_API_URL?: string;
  /** Portfolio Studio (/admin): API origin and the Cognito app client. */
  readonly VITE_STUDIO_API_URL?: string;
  readonly VITE_COGNITO_AUTHORITY?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_COGNITO_DOMAIN?: string;
  readonly VITE_COGNITO_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
