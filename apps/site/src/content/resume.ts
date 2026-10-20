import type { Localized } from "../domain/localized";
import type { YearMonth } from "../domain/resume";
import type { Locale } from "../i18n/config";
import { profile } from "./profile";

/**
 * Source: résumé v4 (pt and en), plus public GitHub repositories for the
 * personal projects and the "games and graphics" skills. Nothing here should
 * go beyond what those sources document.
 */

type SkillEntry = { id: string; name: string | Localized };

type SkillAreaEntry = {
  id: string;
  title: Localized;
  note?: Localized;
  skills: SkillEntry[];
};

type ExperienceEntry = {
  id: string;
  role: Localized;
  company: string;
  start: YearMonth;
  end?: YearMonth;
  context: Localized;
  highlights: Localized<string[]>;
  skills: string[];
};

type ProjectEntry = {
  id: string;
  title: string;
  description: Localized;
  /** Internal paths are relative to the locale prefix. */
  path?: string;
  url?: string;
  skills: string[];
};

export const skillAreas: SkillAreaEntry[] = [
  {
    id: "backend",
    title: { pt: "Backend", en: "Backend", es: "Backend" },
    skills: [
      { id: "nodejs", name: "Node.js" },
      { id: "typescript", name: "TypeScript" },
      { id: "javascript", name: "JavaScript" },
      { id: "adonisjs", name: "AdonisJS" },
      { id: "python", name: "Python" },
      { id: "django", name: "Django" },
      { id: "flask", name: "Flask" },
      { id: "php", name: "PHP" },
      { id: "laravel", name: "Laravel" },
    ],
  },
  {
    id: "data",
    title: { pt: "Dados e integrações", en: "Data and integration", es: "Datos e integraciones" },
    skills: [
      { id: "mysql", name: "MySQL" },
      { id: "postgresql", name: "PostgreSQL" },
      { id: "sql", name: "SQL" },
      { id: "rest", name: { pt: "APIs REST", en: "REST APIs", es: "APIs REST" } },
      { id: "etl", name: "ETL" },
      {
        id: "migrations",
        name: { pt: "Migração de dados", en: "Data migrations", es: "Migración de datos" },
      },
    ],
  },
  {
    id: "infra",
    title: { pt: "Infraestrutura e frontend", en: "Infrastructure and frontend", es: "Infraestructura y frontend" },
    skills: [
      { id: "aws", name: "AWS" },
      { id: "docker", name: "Docker" },
      { id: "linux", name: "Linux" },
      { id: "git", name: "Git" },
      { id: "react", name: "React" },
    ],
  },
  {
    id: "games",
    title: { pt: "Jogos e gráficos", en: "Games and graphics", es: "Juegos y gráficos" },
    note: {
      pt: "Em projetos pessoais",
      en: "In personal projects",
      es: "En proyectos personales",
    },
    skills: [
      { id: "canvas", name: "Canvas 2D" },
      { id: "lua", name: "Lua" },
      { id: "love2d", name: "LÖVE" },
    ],
  },
];

export const experiences: ExperienceEntry[] = [
  {
    id: "pixit",
    role: { pt: "Desenvolvedor Full Stack", en: "Full Stack Developer", es: "Desarrollador Full Stack" },
    company: "Pixit Innovative Solutions",
    start: "2024-05",
    context: {
      pt: "Produtos SaaS, plataformas de educação corporativa e experiências digitais interativas.",
      en: "SaaS products, corporate learning platforms and interactive digital experiences.",
      es: "Productos SaaS, plataformas de educación corporativa y experiencias digitales interactivas.",
    },
    highlights: {
      pt: [
        "Responsável técnico por grande parte da construção do Lumoos, SaaS multi-tenant do Banco John Deere que unifica ferramentas e automatiza processos internos.",
        "Arquitetura e backend: estruturação de módulos, subdomínios, schemas e serviços reutilizáveis; APIs REST em Node.js, TypeScript e AdonisJS.",
        "Integrações corporativas, regras de negócio e customizações por empresa: funcionalidades, permissões, identidade visual e dados.",
        "Plataformas EAD e experiências 3D interativas para clientes como Syngenta, BASF e AstraZeneca; ETL, migrações, otimizações e suporte à produção.",
      ],
      en: [
        "Took technical ownership of much of the architecture and implementation of Lumoos, a multi-tenant SaaS platform for Banco John Deere that unifies tools and automates internal workflows.",
        "Architecture and backend: designed modules, subdomains, database schemas and reusable services; built REST APIs with Node.js, TypeScript and AdonisJS.",
        "Built enterprise integrations, business logic and tenant-specific features, permissions, branding and data structures.",
        "Built corporate learning and 3D interactive platforms for clients including Syngenta, BASF and AstraZeneca; handled ETL, migrations, optimizations and production support.",
      ],
      es: [
        "Responsable técnico de gran parte de la construcción de Lumoos, SaaS multi-tenant del Banco John Deere que unifica herramientas y automatiza procesos internos.",
        "Arquitectura y backend: estructuración de módulos, subdominios, esquemas y servicios reutilizables; APIs REST con Node.js, TypeScript y AdonisJS.",
        "Integraciones corporativas, reglas de negocio y personalizaciones por empresa: funcionalidades, permisos, identidad visual y datos.",
        "Plataformas de e-learning y experiencias 3D interactivas para clientes como Syngenta, BASF y AstraZeneca; ETL, migraciones, optimizaciones y soporte en producción.",
      ],
    },
    skills: ["nodejs", "typescript", "adonisjs", "rest", "etl", "migrations"],
  },
  {
    id: "technext",
    role: { pt: "Desenvolvedor de Software", en: "Software Developer", es: "Desarrollador de Software" },
    company: "Technext Automação",
    start: "2023-06",
    end: "2024-05",
    context: {
      pt: "Sistemas de automação industrial e comercial, IoT e controle de acesso.",
      en: "Industrial and commercial automation, IoT and access-control systems.",
      es: "Sistemas de automatización industrial y comercial, IoT y control de acceso.",
    },
    highlights: {
      pt: [
        "Aplicações para Raspberry Pi integradas a servidores Python/Django, APIs e PostgreSQL, em sistemas de automação e controle de acesso.",
        "Evolução de sistema da Votorantim Cimentos utilizado em mais de 20 centros de distribuição no Brasil.",
        "Desenvolvimento de funcionalidades, otimizações e resolução de incidentes em software em operação.",
      ],
      en: [
        "Built Raspberry Pi apps integrated with Python/Django backend servers, REST APIs and PostgreSQL for automation and access control.",
        "Enhanced a system for Votorantim Cimentos deployed across 20+ distribution centers in Brazil.",
        "Implemented features, optimizations and production incident fixes for operational software.",
      ],
      es: [
        "Aplicaciones para Raspberry Pi integradas con servidores Python/Django, APIs REST y PostgreSQL, en sistemas de automatización y control de acceso.",
        "Evolución de un sistema de Votorantim Cimentos utilizado en más de 20 centros de distribución en Brasil.",
        "Desarrollo de funcionalidades, optimizaciones y resolución de incidentes en software en operación.",
      ],
    },
    skills: ["python", "django", "rest", "postgresql"],
  },
  {
    id: "fflch",
    role: {
      pt: "Estagiário de Desenvolvimento",
      en: "Software Development Intern",
      es: "Pasante de Desarrollo",
    },
    company: "STI – FFLCH / USP",
    start: "2022-04",
    end: "2023-06",
    context: {
      pt: "Plataformas de publicação e visualização de dados públicos da universidade.",
      en: "Public-data publishing and visualization platforms at the university.",
      es: "Plataformas de publicación y visualización de datos públicos de la universidad.",
    },
    highlights: {
      pt: [
        "Criação de aplicação em Python/Django para visualização de dados públicos em gráficos e painéis.",
        "Desenvolvimento de funcionalidades e APIs, consultas SQL e modelagem de dados.",
        "Manutenção de sistemas legados em PHP/Laravel, incluindo correção de bugs e melhorias.",
      ],
      en: [
        "Built a Python/Django application to visualize public data through charts and dashboards.",
        "Built features and APIs, wrote SQL queries and worked on relational data modeling.",
        "Maintained legacy PHP/Laravel systems, fixing bugs and delivering improvements.",
      ],
      es: [
        "Creación de una aplicación en Python/Django para visualizar datos públicos en gráficos y paneles.",
        "Desarrollo de funcionalidades y APIs, consultas SQL y modelado de datos.",
        "Mantenimiento de sistemas heredados en PHP/Laravel, con corrección de errores y mejoras.",
      ],
    },
    skills: ["python", "django", "sql", "rest", "php", "laravel"],
  },
];

export const projects: ProjectEntry[] = [
  {
    id: "games",
    title: "andevengine",
    description: {
      pt: "Quatro jogos em Canvas sobre um mini motor próprio (loop, entrada e vetores), com colisões e câmera escritas à mão.",
      en: "Four Canvas games on a small engine of my own (game loop, input and vectors), with hand-written collisions and camera.",
      es: "Cuatro juegos en Canvas sobre un pequeño motor propio (bucle, entrada y vectores), con colisiones y cámara escritas a mano.",
    },
    path: "/games",
    skills: ["typescript", "canvas", "git"],
  },
  {
    id: "site",
    title: "andrepatrinicola.com",
    description: {
      pt: "Este site: React Router com pré-renderização estática, três idiomas e deploy em AWS (S3 e CloudFront) pelo GitHub Actions.",
      en: "This site: React Router with static pre-rendering, three languages and AWS deployment (S3 and CloudFront) through GitHub Actions.",
      es: "Este sitio: React Router con pre-renderizado estático, tres idiomas y despliegue en AWS (S3 y CloudFront) con GitHub Actions.",
    },
    url: "https://github.com/AndredeQueirozPatrinicola/andrepatrinicola.com",
    skills: ["typescript", "react", "aws", "git"],
  },
  {
    id: "letritas",
    title: "Letritas",
    description: {
      pt: "Jogo de palavras em React que valida cada tentativa numa API pública de dicionário.",
      en: "A React word game that checks every guess against a public dictionary API.",
      es: "Juego de palabras en React que valida cada intento contra una API pública de diccionario.",
    },
    path: "/games/letritas",
    skills: ["javascript", "react", "rest"],
  },
  {
    id: "truco",
    title: "Truco",
    description: {
      pt: "O jogo de cartas brasileiro em Lua com LÖVE, em desenvolvimento.",
      en: "The Brazilian card game in Lua with LÖVE, in progress.",
      es: "El juego de cartas brasileño en Lua con LÖVE, en desarrollo.",
    },
    url: "https://github.com/AndredeQueirozPatrinicola/Truco",
    skills: ["lua", "love2d"],
  },
];

export const education = [
  {
    degree: {
      pt: "Bacharelado em Sistemas de Informação",
      en: "Bachelor's Degree in Information Systems",
      es: "Licenciatura en Sistemas de Información",
    } satisfies Localized,
    institution: "Centro Universitário Senac",
    start: 2022,
    end: 2026,
    note: {
      pt: "Conclusão prevista para dezembro de 2026",
      en: "Expected completion: December 2026",
      es: "Finalización prevista: diciembre de 2026",
    } satisfies Localized,
  },
];

export const spokenLanguages: { name: Localized; level: Localized }[] = [
  {
    name: { pt: "Português", en: "Portuguese", es: "Portugués" },
    level: { pt: "Nativo", en: "Native", es: "Nativo" },
  },
  { name: { pt: "Inglês", en: "English", es: "Inglés" }, level: { pt: "C1", en: "C1", es: "C1" } },
  { name: { pt: "Espanhol", en: "Spanish", es: "Español" }, level: { pt: "B1", en: "B1", es: "B1" } },
];

const PDF_PT = "/resume/andre-patrinicola-curriculo.pdf";
const PDF_EN = "/resume/andre-patrinicola-resume.pdf";

/** PDFs offered per page language; there is no Spanish version yet. */
export const resumeDocuments: Record<Locale, { label: Localized; href: string; language: string }[]> = {
  pt: [
    { label: { pt: "PDF em português", en: "PDF in Portuguese", es: "PDF en portugués" }, href: PDF_PT, language: "pt-BR" },
    { label: { pt: "PDF em inglês", en: "PDF in English", es: "PDF en inglés" }, href: PDF_EN, language: "en" },
  ],
  en: [
    { label: { pt: "PDF em inglês", en: "PDF in English", es: "PDF en inglés" }, href: PDF_EN, language: "en" },
    { label: { pt: "PDF em português", en: "PDF in Portuguese", es: "PDF en portugués" }, href: PDF_PT, language: "pt-BR" },
  ],
  es: [
    { label: { pt: "PDF em inglês", en: "PDF in English", es: "PDF en inglés" }, href: PDF_EN, language: "en" },
    { label: { pt: "PDF em português", en: "PDF in Portuguese", es: "PDF en portugués" }, href: PDF_PT, language: "pt-BR" },
  ],
};

export const resumeSummary = profile.summary;
