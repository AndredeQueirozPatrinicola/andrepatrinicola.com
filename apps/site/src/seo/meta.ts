import type { MetaDescriptor } from "react-router";

type PageMeta = {
  /** Page-specific title; the site name is appended. Omit for the home page. */
  title?: string;
  siteName: string;
  description: string;
};

export function buildMeta({ title, siteName, description }: PageMeta): MetaDescriptor[] {
  return [
    { title: title ? `${title} · ${siteName}` : siteName },
    { name: "description", content: description },
  ];
}
