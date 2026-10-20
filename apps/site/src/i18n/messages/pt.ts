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
