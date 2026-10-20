/**
 * Reference dictionary. Every other locale must provide the same keys
 * (enforced by the `Messages` type).
 */
export const pt = {
  site: {
    name: "André Patrinicola",
    role: "Engenheiro de software",
    description:
      "Portfólio de André de Queiroz Patrinicola, engenheiro de software com foco em backend que cria jogos no navegador para entender como as coisas funcionam.",
  },
  a11y: {
    skipToContent: "Pular para o conteúdo",
    primaryNav: "Navegação principal",
    languageSwitcher: "Idioma",
    themeSwitcher: "Tema de cores",
    externalLink: "abre em nova aba",
  },
  nav: {
    home: "Início",
    games: "Jogos",
    labs: "Labs",
    about: "Sobre",
    resume: "Currículo",
  },
  theme: {
    system: "Sistema",
    light: "Claro",
    dark: "Escuro",
  },
  footer: {
    contact: "Contato",
    source: "Código-fonte do site",
  },
  keys: {
    space: "Espaço",
    enter: "Enter",
    click: "Clique",
    drag: "Arrastar",
    release: "Soltar",
    letters: "Letras",
  },
  home: {
    intro:
      "Engenheiro de software com foco em backend: Node.js, TypeScript e Python em plataformas SaaS, integrações e sistemas em produção. Fora do trabalho, escrevo jogos para o navegador a partir do zero, porque gosto de entender como as coisas funcionam por dentro.",
    playfield: {
      play: "Jogar",
      stop: "Parar",
      demo: "Demo",
      rally: "Rally",
      best: "Recorde",
      cleared: "Tudo acertado!",
      hintPointer: "Passe o mouse por aqui para assumir a raquete.",
      hintTouch: "Arraste o dedo na área para mover a raquete.",
      hintKeys: "Use ← → ou A e D. Esc para sair.",
      playing: "Modo de jogo ativo. Use as setas para mover a raquete; Esc para sair.",
      shortcuts: "Atalhos",
    },
    gamesTitle: "Jogos recentes",
    allGames: "Ver todos os jogos",
  },
  games: {
    title: "Jogos",
    intro:
      "Jogos que escrevi para entender como as coisas funcionam por dentro: loop de jogo, colisão, câmera e física, quase sempre a partir do zero.",
    stats: { total: "Jogos", inBrowser: "No navegador", prototypes: "Protótipos" },
    status: { playable: "Jogável", prototype: "Protótipo" },
    external: "Externo",
    inputs: { keyboard: "Teclado", mouse: "Mouse" },
    play: "Jogar",
    playExternal: "Abrir o jogo",
    startHint: "O jogo carrega quando você clicar.",
    howToPlay: "Como jogar",
    goal: "Objetivo",
    controls: "Controles",
    rules: "Regras",
    beforePlaying: "Antes de jogar",
    internals: "Por dentro",
    tech: "Tecnologias",
    source: "Código-fonte",
    year: "Ano",
    fullscreen: "Tela cheia",
    restart: "Reiniciar",
    openStandalone: "Abrir em nova aba",
    focusHint: "Se as teclas não responderem, clique dentro do jogo.",
    keyboardRequired: "Este jogo precisa de teclado físico; em telas de toque ele não responde.",
    others: "Outros jogos",
    all: "Todos os jogos",
    breadcrumb: "Caminho",
  },
  share: {
    label: "Compartilhar",
    copied: "Link copiado",
    failed: "Não foi possível copiar o link",
  },
  notFound: {
    title: "Página não encontrada",
    body: "O endereço pode ter mudado ou nunca ter existido.",
    back: "Voltar ao início",
  },
  languagePicker: {
    title: "Escolha o idioma",
  },
};

type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof pt>;
