import { repositories } from "../data";
import { buildSiteKnowledge } from "../features/assistant/knowledge";
import { getMessages } from "../i18n/messages";

/**
 * /ai-knowledge.json: the site's content as documents for the portfolio
 * assistant (see features/assistant/knowledge.ts). Pre-rendered like the
 * sitemap, then moved OUT of the public package by scripts/assemble-deploy.mjs:
 * it is never uploaded to the site's bucket.
 */
export async function loader() {
  const knowledge = await buildSiteKnowledge(repositories, {
    pt: getMessages("pt").resume.title,
    en: getMessages("en").resume.title,
    es: getMessages("es").resume.title,
  });
  return new Response(JSON.stringify(knowledge), { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
