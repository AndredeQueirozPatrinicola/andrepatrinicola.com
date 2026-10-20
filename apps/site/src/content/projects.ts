import type { Localized } from "../domain/localized";
import type { Project } from "../domain/project";

export type ProjectEntry = Omit<Project, "summary" | "explored" | "links" | "snippet"> & {
  summary: Localized;
  explored: Localized<string[]>;
  /** `page` links are paths below the locale prefix. */
  links: Project["links"];
  snippet?: { language: string; caption: Localized; code: string };
};

const GITHUB = "https://github.com/AndredeQueirozPatrinicola";

/** Excerpt of packages/engines/src/andevengine/game/Game.ts. */
const gameLoop = `private readonly loop = (currentTime: number): void => {
  const deltaTime = (currentTime - this.previousTime) / 1000;
  this.previousTime = currentTime;

  this.update(deltaTime);
  this.render();

  this.animationFrameId = requestAnimationFrame(this.loop);
};`;

/** Labs: personal projects and experiments that are not (only) games. */
export const projects: ProjectEntry[] = [
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
      pt: "O mini motor 2D em TypeScript que roda os jogos deste site. É pequeno de propósito: o suficiente para entender cada peça.",
      en: "The small 2D TypeScript engine behind the games on this site. It is small on purpose: just enough to understand every piece.",
      es: "El pequeño motor 2D en TypeScript detrás de los juegos de este sitio. Es pequeño a propósito: lo justo para entender cada pieza.",
    },
    explored: {
      pt: [
        "Loop com requestAnimationFrame e delta time em segundos",
        "Entrada de teclado e mouse como um conjunto de teclas pressionadas",
        "Vetores 2D e, em cada jogo, colisões AABB, círculo–retângulo e resposta com restituição",
        "Câmera com interpolação linear no Angry Blocks",
      ],
      en: [
        "A requestAnimationFrame loop with delta time in seconds",
        "Keyboard and mouse input as a set of pressed keys",
        "2D vectors and, in each game, AABB, circle–rectangle and restitution-based collisions",
        "A linearly interpolated camera in Angry Blocks",
      ],
      es: [
        "Bucle con requestAnimationFrame y delta time en segundos",
        "Entrada de teclado y mouse como un conjunto de teclas presionadas",
        "Vectores 2D y, en cada juego, colisiones AABB, círculo–rectángulo y respuesta con restitución",
        "Cámara con interpolación lineal en Angry Blocks",
      ],
    },
    snippet: {
      language: "ts",
      caption: { pt: "O loop do motor", en: "The engine loop", es: "El bucle del motor" },
      code: gameLoop,
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
