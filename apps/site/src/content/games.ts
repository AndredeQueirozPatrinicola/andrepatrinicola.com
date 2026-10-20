import type { Game, GameControl } from "../domain/game";
import type { Localized } from "../domain/localized";

type LocalizedControl = Omit<GameControl, "action"> & { action: Localized };

export type GameEntry = Omit<
  Game,
  "tagline" | "goal" | "rules" | "controls" | "internals" | "notes"
> & {
  tagline: Localized;
  goal: Localized;
  rules: Localized<string[]>;
  controls: LocalizedControl[];
  internals: Localized<string[]>;
  notes: Localized<string[]>;
};

const GITHUB = "https://github.com/AndredeQueirozPatrinicola";

const engineTech = ["TypeScript", "Canvas 2D", "andevengine"];

const engineInternals: Localized<string> = {
  pt: "Loop com requestAnimationFrame e delta time do andevengine, o mini motor escrito para estes jogos",
  en: "requestAnimationFrame loop with delta time from andevengine, the small engine written for these games",
  es: "Bucle con requestAnimationFrame y delta time de andevengine, el pequeño motor escrito para estos juegos",
};

const keyboardOnly: Localized<string[]> = {
  pt: ["Precisa de teclado físico."],
  en: ["Requires a physical keyboard."],
  es: ["Requiere un teclado físico."],
};

/**
 * Games shown in the catalog, in display order. Descriptions follow what each
 * game's source code does today; update them together with the game.
 */
export const games: GameEntry[] = [
  {
    slug: "pong",
    title: "Classic Pong",
    year: 2026,
    status: "playable",
    hosting: { kind: "embedded", path: "/play/pong/index.html" },
    cover: "/images/games/pong.png",
    inputs: ["keyboard"],
    tech: engineTech,
    sourceUrl: `${GITHUB}/ClassicPong`,
    tagline: {
      pt: "Pong clássico contra uma raquete controlada pelo computador.",
      en: "Classic Pong against a computer-controlled paddle.",
      es: "Pong clásico contra una paleta controlada por la computadora.",
    },
    goal: {
      pt: "Faça 5 pontos antes do computador.",
      en: "Score 5 points before the computer does.",
      es: "Anota 5 puntos antes que la computadora.",
    },
    rules: {
      pt: [
        "Mover a raquete no momento do toque muda o ângulo da bola.",
        "Depois de cada ponto, o jogo pausa até você apertar Enter.",
        "Quando alguém chega a 5 pontos, o placar volta a zero.",
      ],
      en: [
        "Moving the paddle as the ball hits it changes the ball's angle.",
        "After each point the game pauses until you press Enter.",
        "When someone reaches 5 points, the score resets.",
      ],
      es: [
        "Mover la paleta en el momento del golpe cambia el ángulo de la pelota.",
        "Después de cada punto, el juego se pausa hasta que presiones Enter.",
        "Cuando alguien llega a 5 puntos, el marcador vuelve a cero.",
      ],
    },
    controls: [
      { keys: ["W"], action: { pt: "Subir", en: "Move up", es: "Subir" } },
      { keys: ["S"], action: { pt: "Descer", en: "Move down", es: "Bajar" } },
      {
        keys: ["enter"],
        action: { pt: "Começar e continuar", en: "Start and resume", es: "Empezar y continuar" },
      },
    ],
    internals: {
      pt: [
        "Colisão entre círculo e retângulo pelo ponto mais próximo da borda",
        "A raquete do computador persegue a altura da bola com uma margem de tolerância",
        engineInternals.pt,
      ],
      en: [
        "Circle–rectangle collision using the closest point on the edge",
        "The computer paddle chases the ball's height within a tolerance margin",
        engineInternals.en,
      ],
      es: [
        "Colisión entre círculo y rectángulo por el punto más cercano del borde",
        "La paleta de la computadora persigue la altura de la pelota con un margen de tolerancia",
        engineInternals.es,
      ],
    },
    notes: keyboardOnly,
  },
  {
    slug: "meteor",
    title: "Spaceship Meteor",
    year: 2026,
    status: "playable",
    hosting: { kind: "embedded", path: "/play/meteor/index.html" },
    cover: "/images/games/meteor.png",
    inputs: ["keyboard"],
    tech: engineTech,
    sourceUrl: `${GITHUB}/SpaceshipMeteor`,
    tagline: {
      pt: "Desvie e destrua meteoros pelo maior tempo possível.",
      en: "Dodge and shoot meteors for as long as you can.",
      es: "Esquiva y destruye meteoritos el mayor tiempo posible.",
    },
    goal: {
      pt: "Sobreviva o máximo de segundos.",
      en: "Survive as many seconds as you can.",
      es: "Sobrevive la mayor cantidad de segundos.",
    },
    rules: {
      pt: [
        "São 5 vidas; depois de um impacto você fica 1 segundo invulnerável.",
        "Um tiro destrói um meteoro, e a arma recarrega em 1,25 s.",
        "Os meteoros ficam mais rápidos com o passar do tempo.",
      ],
      en: [
        "You have 5 lives and stay invulnerable for 1 second after a hit.",
        "One shot destroys one meteor, and the gun reloads in 1.25 s.",
        "Meteors get faster as time goes on.",
      ],
      es: [
        "Tienes 5 vidas y quedas invulnerable 1 segundo después de un impacto.",
        "Un disparo destruye un meteorito y el arma se recarga en 1,25 s.",
        "Los meteoritos se vuelven más rápidos con el tiempo.",
      ],
    },
    controls: [
      { keys: ["W", "A", "S", "D"], action: { pt: "Mover a nave", en: "Move the ship", es: "Mover la nave" } },
      { keys: ["enter"], action: { pt: "Atirar", en: "Shoot", es: "Disparar" } },
      {
        keys: ["space"],
        action: { pt: "Começar e recomeçar", en: "Start and restart", es: "Empezar y reiniciar" },
      },
    ],
    internals: {
      pt: [
        "Hitbox circular da nave testada contra meteoros retangulares",
        "Um observer simples de eventos conecta tiros, impactos e destruição",
        "A velocidade dos meteoros cresce de forma logarítmica com a pontuação",
      ],
      en: [
        "The ship's circular hitbox is tested against rectangular meteors",
        "A small event observer wires shots, hits and destruction together",
        "Meteor speed grows logarithmically with the score",
      ],
      es: [
        "El hitbox circular de la nave se prueba contra meteoritos rectangulares",
        "Un observer de eventos sencillo conecta disparos, impactos y destrucción",
        "La velocidad de los meteoritos crece de forma logarítmica con el puntaje",
      ],
    },
    notes: keyboardOnly,
  },
  {
    slug: "flappy",
    title: "Flappy Thing",
    year: 2026,
    status: "playable",
    hosting: { kind: "embedded", path: "/play/flappy/index.html" },
    cover: "/images/games/flappy.png",
    inputs: ["keyboard", "mouse"],
    tech: engineTech,
    sourceUrl: `${GITHUB}/FlappyThing`,
    tagline: {
      pt: "Não é exatamente um pássaro, mas também precisa passar pelos canos.",
      en: "Not exactly a bird, but it still has to get through the pipes.",
      es: "No es exactamente un pájaro, pero igual tiene que pasar entre las tuberías.",
    },
    goal: {
      pt: "Passe pelo maior número possível de canos.",
      en: "Get through as many pipes as you can.",
      es: "Pasa la mayor cantidad posible de tuberías.",
    },
    rules: {
      pt: [
        "Cada par de canos ultrapassado vale 1 ponto.",
        "Encostar num cano ou sair da tela reinicia a partida.",
        "Um novo par de canos aparece a cada segundo.",
      ],
      en: [
        "Each pair of pipes you pass is worth 1 point.",
        "Touching a pipe or leaving the screen restarts the run.",
        "A new pair of pipes appears every second.",
      ],
      es: [
        "Cada par de tuberías superado vale 1 punto.",
        "Tocar una tubería o salir de la pantalla reinicia la partida.",
        "Aparece un nuevo par de tuberías cada segundo.",
      ],
    },
    controls: [
      {
        keys: ["space", "click"],
        action: { pt: "Impulso (e começar)", en: "Flap (and start)", es: "Impulso (y empezar)" },
      },
    ],
    internals: {
      pt: [
        "Colisão AABB entre retângulos",
        "Gravidade constante e impulso vertical",
        "Um temporizador com observer gera os obstáculos",
      ],
      en: [
        "AABB collision between rectangles",
        "Constant gravity and a vertical flap impulse",
        "A timer with an observer spawns the obstacles",
      ],
      es: [
        "Colisión AABB entre rectángulos",
        "Gravedad constante e impulso vertical",
        "Un temporizador con observer genera los obstáculos",
      ],
    },
    notes: {
      pt: ["A física acompanha a taxa de quadros: em telas de 120 Hz ou mais o jogo fica mais rápido."],
      en: ["Physics follows the frame rate: on 120 Hz screens and above the game runs faster."],
      es: ["La física sigue la tasa de cuadros: en pantallas de 120 Hz o más el juego va más rápido."],
    },
  },
  {
    slug: "letritas",
    title: "Letritas",
    year: 2023,
    status: "playable",
    hosting: { kind: "external", url: "https://andredequeirozpatrinicola.github.io/letreco/" },
    cover: "/images/games/letritas.png",
    inputs: ["keyboard"],
    tech: ["React", "JavaScript", "Tailwind CSS", "Vite"],
    sourceUrl: `${GITHUB}/letreco`,
    tagline: {
      pt: "Adivinhe a palavra de cinco letras.",
      en: "Guess the five-letter Portuguese word.",
      es: "Adivina la palabra de cinco letras en portugués.",
    },
    goal: {
      pt: "Descubra a palavra em até 5 tentativas.",
      en: "Find the word in up to 5 attempts.",
      es: "Descubre la palabra en hasta 5 intentos.",
    },
    rules: {
      pt: [
        "Cada tentativa precisa ser uma palavra que exista no Dicionário Aberto.",
        "As cores indicam letra no lugar certo, letra em outra posição ou letra ausente.",
      ],
      en: [
        "Each guess must be a word found in the Dicionário Aberto dictionary.",
        "Colors mark letters in the right place, in another position, or missing.",
      ],
      es: [
        "Cada intento debe ser una palabra que exista en el diccionario Dicionário Aberto.",
        "Los colores indican letra en el lugar correcto, en otra posición o ausente.",
      ],
    },
    controls: [
      { keys: ["letters"], action: { pt: "Digitar a palavra", en: "Type the word", es: "Escribir la palabra" } },
      { keys: ["enter"], action: { pt: "Enviar tentativa", en: "Submit the guess", es: "Enviar el intento" } },
    ],
    internals: {
      pt: [
        "Valida cada tentativa numa API pública de dicionário",
        "Teclado na tela acompanha o estado de cada letra",
      ],
      en: [
        "Checks every guess against a public dictionary API",
        "An on-screen keyboard tracks the state of each letter",
      ],
      es: [
        "Valida cada intento contra una API pública de diccionario",
        "Un teclado en pantalla sigue el estado de cada letra",
      ],
    },
    notes: {
      pt: ["Abre em outra aba, no GitHub Pages."],
      en: ["The game is in Portuguese and opens in a new tab on GitHub Pages."],
      es: ["El juego está en portugués y se abre en otra pestaña, en GitHub Pages."],
    },
  },
  {
    slug: "angryblocks",
    title: "Angry Blocks",
    year: 2026,
    status: "prototype",
    hosting: { kind: "embedded", path: "/play/angryblocks/index.html" },
    inputs: ["mouse"],
    tech: engineTech,
    sourceUrl: `${GITHUB}/Angryblocks`,
    tagline: {
      pt: "Protótipo de estilingue com gravidade, quique e câmera.",
      en: "Slingshot prototype with gravity, bounce and a following camera.",
      es: "Prototipo de resortera con gravedad, rebote y una cámara que sigue la pelota.",
    },
    goal: {
      pt: "Puxe, solte e veja a bola quicar. Os blocos ainda estão por vir.",
      en: "Pull, release and watch the ball bounce. The blocks are still to come.",
      es: "Tira, suelta y mira cómo rebota la pelota. Los bloques todavía están por llegar.",
    },
    rules: {
      pt: [
        "Arraste a partir da esquerda do estilingue e solte para lançar.",
        "Quanto mais longe você puxar, mais forte o lançamento, até um limite.",
        "A câmera acompanha a bola quando ela passa do meio da tela.",
      ],
      en: [
        "Drag from the left of the slingshot and release to launch.",
        "The further you pull, the stronger the launch, up to a limit.",
        "The camera follows the ball once it passes the middle of the screen.",
      ],
      es: [
        "Arrastra desde la izquierda de la resortera y suelta para lanzar.",
        "Cuanto más lejos tires, más fuerte el lanzamiento, hasta un límite.",
        "La cámara sigue la pelota cuando pasa la mitad de la pantalla.",
      ],
    },
    controls: [
      {
        keys: ["drag"],
        action: { pt: "Puxar a bola", en: "Pull the ball", es: "Tirar de la pelota" },
      },
      { keys: ["release"], action: { pt: "Lançar", en: "Launch", es: "Lanzar" } },
    ],
    internals: {
      pt: [
        "Resposta de colisão com normal, penetração e coeficiente de restituição",
        "Câmera com interpolação linear (lerp) seguindo a bola",
        "Força do lançamento limitada pelo comprimento do puxão",
      ],
      en: [
        "Collision response with normal, penetration and a restitution coefficient",
        "Camera following the ball with linear interpolation (lerp)",
        "Launch force capped by the length of the pull",
      ],
      es: [
        "Respuesta de colisión con normal, penetración y coeficiente de restitución",
        "Cámara que sigue la pelota con interpolación lineal (lerp)",
        "Fuerza del lanzamiento limitada por la longitud del tirón",
      ],
    },
    notes: {
      pt: ["Em desenvolvimento: ainda não há blocos, alvos nem pontuação.", "Precisa de mouse."],
      en: ["Work in progress: there are no blocks, targets or score yet.", "Requires a mouse."],
      es: ["En desarrollo: todavía no hay bloques, objetivos ni puntaje.", "Requiere un mouse."],
    },
  },
];
