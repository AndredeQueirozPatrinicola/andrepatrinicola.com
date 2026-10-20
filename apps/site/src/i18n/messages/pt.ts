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
  labs: {
    title: "Labs",
    eyebrow: "Andev Labs",
    intro:
      "Projetos pessoais e experimentos que não são só jogos: um motor, física, um jogo de cartas e este próprio site.",
    status: { active: "Ativo", "in-progress": "Em andamento", experiment: "Experimento" },
    explored: "O que explorei",
    source: "Código-fonte",
    page: "Ver os jogos",
  },
  about: {
    title: "Sobre",
    lead: "Engenheiro de software em São Paulo, com foco em backend e um gosto antigo por entender como as coisas funcionam por dentro.",
    whoTitle: "Quem sou",
    who: [
      "Trabalho principalmente com backend: Node.js, TypeScript e Python, em plataformas SaaS, integrações e sistemas em produção. Hoje estou na Pixit, onde fui responsável técnico por grande parte do Lumoos, um SaaS multi-tenant.",
      "Estou concluindo o bacharelado em Sistemas de Informação no Centro Universitário Senac, com previsão de término em dezembro de 2026.",
    ],
    pathTitle: "Trajetória",
    path: {
      fflch: "Dados públicos da universidade: visualização com Django e manutenção de sistemas em Laravel.",
      technext: "Automação e controle de acesso: Raspberry Pi integrado a servidores Django e PostgreSQL.",
      pixit: "SaaS multi-tenant, educação corporativa e experiências 3D interativas.",
    },
    whyTitle: "Por que jogos",
    why: [
      "Gosto de desenvolvimento de software, de jogos e de tecnologia, e principalmente de entender como as coisas funcionam.",
      "Escrever um jogo do zero obriga a encarar o loop, a entrada, a colisão e a câmera sem uma engine escondendo os detalhes. Foi por isso que os jogos deste site rodam num motor próprio, e por isso a página inicial também é um jogo.",
    ],
    contactTitle: "Vamos conversar",
    contact: "O jeito mais rápido de falar comigo é por e-mail ou pelo LinkedIn.",
    resumeLink: "Ver o currículo completo",
  },
  resume: {
    title: "Currículo",
    onThisPage: "Nesta página",
    sections: {
      experience: "Experiência",
      skills: "Competências",
      projects: "Projetos pessoais",
      education: "Formação",
      languages: "Idiomas",
    },
    present: "atual",
    downloads: "Versão em PDF",
    skillsHint: "Agrupadas por área, sem níveis inventados. Escolha uma tecnologia para destacar onde ela aparece.",
    highlighting: "Destacando: {skill}",
    clear: "Limpar destaque",
    noMatches: "Nenhuma experiência ou projeto listado usa esta tecnologia.",
    stack: "Tecnologias",
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
