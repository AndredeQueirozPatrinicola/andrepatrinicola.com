import type { Localized } from "../domain/localized";
import type { ProfileLink } from "../domain/profile";

/** Source: résumé v4 (pt/en). The phone number is intentionally left out. */
export const profile = {
  name: "André de Queiroz Patrinicola",
  email: "andrepatrinicola@gmail.com",
  role: {
    pt: "Engenheiro de software · Backend",
    en: "Software engineer · Backend",
    es: "Ingeniero de software · Backend",
  } satisfies Localized,
  location: {
    pt: "São Paulo, Brasil",
    en: "São Paulo, Brazil",
    es: "São Paulo, Brasil",
  } satisfies Localized,
  summary: {
    pt: "Engenheiro de software com mais de 4 anos de experiência em aplicações corporativas, plataformas SaaS e integrações. Foco em backend com Node.js, TypeScript e Python, atuando em arquitetura de sistemas multi-tenant, APIs, bancos de dados e sustentação de soluções em produção.",
    en: "Software engineer with 4+ years of experience building enterprise applications, SaaS platforms and system integrations. Backend-focused, with Node.js, TypeScript and Python experience spanning multi-tenant architecture, APIs, relational databases and production support.",
    es: "Ingeniero de software con más de 4 años de experiencia en aplicaciones corporativas, plataformas SaaS e integraciones. Enfocado en backend con Node.js, TypeScript y Python, con experiencia en arquitectura multi-tenant, APIs, bases de datos relacionales y soporte de soluciones en producción.",
  } satisfies Localized,
  links: [
    { kind: "email", label: "andrepatrinicola@gmail.com", href: "mailto:andrepatrinicola@gmail.com" },
    {
      kind: "linkedin",
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/andredequeirozpatrinicola",
    },
    { kind: "github", label: "GitHub", href: "https://github.com/AndredeQueirozPatrinicola" },
  ] satisfies ProfileLink[],
};
