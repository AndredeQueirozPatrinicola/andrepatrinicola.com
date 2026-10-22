import type { ContentDoc, ContentType } from "../../domain/blog";
import type { Locale } from "../../i18n/config";

/** Shapes returned by the Portfolio Studio API (andrepatrinicola-api). */

export type ArticleStatus = "draft" | "publishing" | "published" | "archived";
export type TranslationStatus = "draft" | "ready";
export type LocaleSlugs = Partial<Record<Locale, string>>;

export type LocaleDraft = {
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  content: ContentDoc;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogMediaId?: string;
  translationStatus: TranslationStatus;
  updatedAt: string;
};

export type Article = {
  id: string;
  type: ContentType;
  status: ArticleStatus;
  tags: string[];
  coverMediaId?: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  revisionCount: number;
  live?: { revision: number; seq: number; slugs: LocaleSlugs; publishedAt: string; updatedAt: string };
  pending?: {
    action: "publish" | "unpublish";
    deploymentId: string;
    revision?: number;
    slugs?: LocaleSlugs;
    requestedAt: string;
    requestedBy: string;
  };
  lastError?: { deploymentId: string; message: string; at: string };
  publishedAt?: string;
  publishedRevision?: number;
  pendingStale: boolean;
  locales: Partial<Record<Locale, LocaleDraft>>;
};

export type ArticleListItem = Omit<Article, "locales"> & {
  locales: Partial<Record<Locale, Pick<LocaleDraft, "title" | "slug" | "translationStatus">>>;
};

export type RevisionSummary = {
  revision: number;
  createdAt: string;
  createdBy: string;
  reason: "checkpoint" | "publish" | "before-restore";
  size: number;
  sha256: string;
  locales: { locale: Locale; title: string; translationStatus: TranslationStatus }[];
};

export type RevisionDocument = {
  revision: number;
  createdAt: string;
  createdBy: string;
  reason: RevisionSummary["reason"];
  article: { type: ContentType; tags: string[]; coverMediaId?: string };
  locales: LocaleDraft[];
};

export type DeploymentStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "superseded";

export type Deployment = {
  id: string;
  trigger: "publish" | "unpublish" | "push";
  status: DeploymentStatus;
  articleId?: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  seq?: number;
  frozenAt?: string;
  runId?: string;
  runUrl?: string;
  sha?: string;
  finishedAt?: string;
  message?: string;
  articleCount: number | null;
  stale: boolean;
};

export type Media = {
  id: string;
  status: "pending" | "ready" | "rejected";
  filename: string;
  name: string;
  alt: Partial<Record<Locale, string>>;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  previewUrl: string | null;
};

export type PublicationStatus = "draft" | "approved" | "scheduled" | "publishing" | "published" | "failed";

export type Publication = {
  id: string;
  articleId: string;
  articleRevision: number;
  platform: "linkedin";
  locale: Locale;
  text: string;
  url: string;
  articleTitle: string;
  articleExcerpt: string;
  status: PublicationStatus;
  version: number;
  scheduledAt?: string;
  publishingSince?: string;
  publishedAt?: string;
  publishedVia?: "api" | "manual";
  remotePostId?: string;
  remoteUrl?: string;
  lastError?: { code: string; message: string; at: string; uncertain: boolean };
  attempts: number;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

export type LinkedInStatus = {
  configured: boolean;
  connected: boolean;
  name?: string;
  memberUrn?: string;
  expiresAt?: string;
  refreshable?: boolean;
  connectedAt?: string;
  status?: "connected" | "expired";
};

export type Page<T> = { items: T[]; cursor: string | null };
