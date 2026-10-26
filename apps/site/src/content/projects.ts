import type { Localized } from "../domain/localized";
import type { Project } from "../domain/project";

export type ProjectEntry = Omit<Project, "summary" | "explored" | "links"> & {
  summary: Localized;
  explored: Localized<string[]>;
  /** `page` and `lab` links are paths below the locale prefix. */
  links: Project["links"];
};

const GITHUB = "https://github.com/AndredeQueirozPatrinicola";

/** Labs: personal projects and experiments that are not (only) games. */
export const projects: ProjectEntry[] = [
  {
    slug: "architecture-studio",
    title: "Cloud Architecture Studio",
    status: "experiment",
    year: 2026,
    tech: ["TypeScript", "React", "React Flow", "Zod", "AWS"],
    links: [
      { kind: "lab", href: "/labs/architecture-studio" },
      { kind: "source", href: `${GITHUB}/andrepatrinicola.com/tree/main/apps/site/src/features/architecture-studio` },
    ],
    summary: {
      pt: "Um editor de arquiteturas AWS no navegador: desenhe com serviços AWS e elementos de system design, explore a arquitetura real deste site com fluxos guiados e exporte em JSON ou PNG.",
      en: "An AWS architecture editor in the browser: draw with AWS services and system design elements, explore this site's real architecture with guided flows and export JSON or PNG.",
      es: "Un editor de arquitecturas AWS en el navegador: dibuja con servicios AWS y elementos de system design, explora la arquitectura real de este sitio con flujos guiados y exporta en JSON o PNG.",
    },
    explored: {
      pt: [
        "Canvas com React Flow: nós personalizados, grupos aninhados (região, VPC, sub-rede) e conexões síncronas, assíncronas e de dados",
        "Formato JSON próprio e versionado, validado com Zod, com limites e checagem de integridade do grafo",
        "Desfazer e refazer com checkpoints: um arraste ou a digitação de um nome é um passo só",
        "Salvo só no navegador, sem backend e sem nenhuma chamada à AWS; editor carregado sob demanda",
      ],
      en: [
        "A React Flow canvas: custom nodes, nested groups (Region, VPC, subnet) and synchronous, asynchronous and data connections",
        "Its own versioned JSON format, validated with Zod, with limits and graph integrity checks",
        "Undo and redo with checkpoints: a drag or typing a name is a single step",
        "Saved only in the browser, with no backend and no calls to AWS; the editor loads on demand",
      ],
      es: [
        "Un lienzo con React Flow: nodos personalizados, grupos anidados (región, VPC, subred) y conexiones síncronas, asíncronas y de datos",
        "Formato JSON propio y versionado, validado con Zod, con límites y verificación de integridad del grafo",
        "Deshacer y rehacer con checkpoints: un arrastre o escribir un nombre es un solo paso",
        "Guardado solo en el navegador, sin backend y sin llamadas a AWS; el editor se carga bajo demanda",
      ],
    },
  },
  {
    slug: "distributed-systems",
    title: "Distributed Systems Playground",
    status: "experiment",
    year: 2026,
    tech: ["TypeScript", "React", "Amazon SQS", "AWS Lambda", "DynamoDB", "Terraform"],
    links: [
      { kind: "lab", href: "/labs/distributed-systems" },
      { kind: "source", href: `${GITHUB}/andrepatrinicola.com/tree/main/apps/site/src/features/queue-lab` },
    ],
    summary: {
      pt: "Uma fila Amazon SQS que roda no navegador: consumers, falhas, retries, visibility timeout, dead-letter queue e idempotência, com cenários prontos e métricas da simulação.",
      en: "An Amazon SQS queue that runs in the browser: consumers, failures, retries, visibility timeout, a dead-letter queue and idempotency, with ready-made scenarios and simulation metrics.",
      es: "Una cola Amazon SQS que corre en el navegador: consumers, fallos, reintentos, visibility timeout, dead-letter queue e idempotencia, con escenarios listos y métricas de la simulación.",
    },
    explored: {
      pt: [
        "Simulação por eventos discretos, determinística com seed e separada do React",
        "Visibility timeout, receive count e redrive para a DLQ como no SQS Standard",
        "Entregas duplicadas (at-least-once) e um consumer idempotente para comparar",
        "Versão real com acesso restrito: API Gateway, Lambda, SQS com DLQ e respostas parciais de lote",
      ],
      en: [
        "Discrete-event simulation, deterministic with a seed and separate from React",
        "Visibility timeout, receive count and redrive to the DLQ as in SQS Standard",
        "Duplicate deliveries (at-least-once) and an idempotent consumer to compare",
        "A real version with restricted access: API Gateway, Lambda, SQS with a DLQ and partial batch responses",
      ],
      es: [
        "Simulación por eventos discretos, determinista con seed y separada de React",
        "Visibility timeout, receive count y redrive a la DLQ como en SQS Standard",
        "Entregas duplicadas (at-least-once) y un consumer idempotente para comparar",
        "Versión real con acceso restringido: API Gateway, Lambda, SQS con DLQ y respuestas parciales de lote",
      ],
    },
  },
  {
    slug: "andevengine",
    title: "andevengine",
    status: "active",
    year: 2026,
    tech: ["TypeScript", "Canvas 2D"],
    links: [
      { kind: "source", href: `${GITHUB}/andrepatrinicola.com/tree/main/packages/engines` },
      { kind: "page", href: "/games" },
    ],
    summary: {
      pt: "Motor 2D em TypeScript sobre o qual rodam os quatro jogos em Canvas deste site. Ele cuida do loop, da entrada e do canvas; colisão, física e câmera ficam no código de cada jogo.",
      en: "A 2D TypeScript engine that runs the four Canvas games on this site. It takes care of the loop, input and the canvas; collision, physics and cameras live in each game's own code.",
      es: "Motor 2D en TypeScript sobre el que corren los cuatro juegos en Canvas de este sitio. Se encarga del bucle, la entrada y el canvas; colisiones, física y cámara quedan en el código de cada juego.",
    },
    explored: {
      pt: [
        "Classe Game: contexto 2D, loop com requestAnimationFrame, delta time em segundos e os ganchos load, update e render",
        "Input: guarda as teclas pressionadas e trata o botão do mouse como mais uma tecla",
        "Cursor: posição do mouse convertida para as coordenadas do canvas",
        "Vector2 para posições, velocidades e direções",
        "Usado no Classic Pong, Spaceship Meteor, Flappy Thing e Angry Blocks; cada jogo leva uma cópia do motor no próprio repositório",
      ],
      en: [
        "Game class: 2D context, a requestAnimationFrame loop, delta time in seconds and load, update and render hooks",
        "Input: keeps the set of pressed keys and treats the mouse button as one more key",
        "Cursor: mouse position converted to canvas coordinates",
        "Vector2 for positions, velocities and directions",
        "Used by Classic Pong, Spaceship Meteor, Flappy Thing and Angry Blocks; each game ships its own copy of the engine in its repository",
      ],
      es: [
        "Clase Game: contexto 2D, bucle con requestAnimationFrame, delta time en segundos y los hooks load, update y render",
        "Input: guarda las teclas presionadas y trata el botón del mouse como una tecla más",
        "Cursor: posición del mouse convertida a las coordenadas del canvas",
        "Vector2 para posiciones, velocidades y direcciones",
        "Lo usan Classic Pong, Spaceship Meteor, Flappy Thing y Angry Blocks; cada juego lleva una copia del motor en su propio repositorio",
      ],
    },
  },
  {
    slug: "andrepatrinicola-com",
    title: "andrepatrinicola.com",
    status: "active",
    year: 2026,
    tech: ["React Router", "TypeScript", "Vite", "AWS S3", "CloudFront", "GitHub Actions"],
    links: [{ kind: "source", href: `${GITHUB}/andrepatrinicola.com` }],
    summary: {
      pt: "Este site. Um site estático, mas com rotas por idioma, temas e uma home que usa o próprio texto como fase de jogo.",
      en: "This site. Static, but with per-language routes, themes and a home page that turns its own text into a game level.",
      es: "Este sitio. Estático, pero con rutas por idioma, temas y una home que usa su propio texto como nivel de juego.",
    },
    explored: {
      pt: [
        "Pré-renderização de cada rota com React Router, servida por S3 e CloudFront",
        "Três idiomas com dicionários tipados e URLs próprias",
        "Temas claro e escuro com light-dark() e sem flash no carregamento",
        "Colisão de uma bola com caixas de texto do DOM, na home",
      ],
      en: [
        "Pre-rendering every route with React Router, served from S3 and CloudFront",
        "Three languages with typed dictionaries and their own URLs",
        "Light and dark themes with light-dark() and no flash on load",
        "A ball colliding with DOM text boxes on the home page",
      ],
      es: [
        "Pre-renderizado de cada ruta con React Router, servido desde S3 y CloudFront",
        "Tres idiomas con diccionarios tipados y URLs propias",
        "Temas claro y oscuro con light-dark() y sin parpadeo al cargar",
        "Colisión de una pelota con cajas de texto del DOM, en la home",
      ],
    },
  },
  {
    slug: "truco",
    title: "Truco",
    status: "in-progress",
    year: 2026,
    tech: ["Lua", "LÖVE"],
    links: [{ kind: "source", href: `${GITHUB}/Truco` }],
    summary: {
      pt: "O jogo de cartas brasileiro, para desktop, em Lua com o framework LÖVE.",
      en: "The Brazilian card game, for desktop, in Lua with the LÖVE framework.",
      es: "El juego de cartas brasileño, para escritorio, en Lua con el framework LÖVE.",
    },
    explored: {
      pt: [
        "Classes em Lua com a biblioteca classic",
        "Baralho, mãos, mesa e resolução de rodadas com temporizador",
        "Sprites das cartas desenhados com filtro nearest, sem suavização",
      ],
      en: [
        "Lua classes with the classic library",
        "Deck, hands, table and round resolution with a timer",
        "Card sprites drawn with nearest-neighbour filtering, no smoothing",
      ],
      es: [
        "Clases en Lua con la biblioteca classic",
        "Baraja, manos, mesa y resolución de rondas con temporizador",
        "Sprites de las cartas dibujados con filtro nearest, sin suavizado",
      ],
    },
  },
  {
    slug: "game-physics",
    title: "GamePhysics",
    status: "experiment",
    tech: ["Lua", "LÖVE"],
    links: [{ kind: "source", href: `${GITHUB}/GamePhysics` }],
    summary: {
      pt: "Quatro experimentos curtos de física para jogos: quique, gravidade, projétil e órbita.",
      en: "Four short game-physics experiments: bounce, gravity, projectile and orbit.",
      es: "Cuatro experimentos cortos de física para juegos: rebote, gravedad, proyectil y órbita.",
    },
    explored: {
      pt: [
        "Integração de velocidade e posição a cada quadro com delta time",
        "Órbita com atração proporcional ao inverso do quadrado da distância",
      ],
      en: [
        "Integrating velocity and position every frame with delta time",
        "An orbit driven by inverse-square attraction",
      ],
      es: [
        "Integración de velocidad y posición en cada cuadro con delta time",
        "Órbita con atracción proporcional al inverso del cuadrado de la distancia",
      ],
    },
  },
];
