import { Section } from "../components/Section";
import { games, projects } from "../content/portfolio";

export function HomePage() {
  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">Portfolio pessoal</p>
        <h1>Portfolio</h1>
        <p className="professional-title">
          Desenvolvedor de software focado em produtos web e experiencias digitais.
        </p>
        <nav className="nav" aria-label="Navegacao principal">
          <a href="#sobre">Sobre</a>
          <a href="#projetos">Projetos</a>
          <a href="#jogos">Jogos</a>
          <a href="#contato">Contato</a>
        </nav>
      </header>

      <Section id="sobre" title="Sobre">
        <p>
          Sou um profissional de tecnologia construindo um ecossistema pessoal
          para reunir curriculo, portfolio, estudos e projetos independentes. A
          proposta deste site e ser direto, facil de manter e pronto para evoluir
          com novas publicacoes.
        </p>
      </Section>

      <Section id="projetos" title="Projetos">
        <div className="item-list">
          {projects.map((project) => (
            <article className="item" key={project.name}>
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <span>{project.status}</span>
            </article>
          ))}
        </div>
      </Section>

      <Section id="jogos" title="Jogos">
        <div className="item-list">
          {games.map((game) => (
            <article className="item" key={game.name}>
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <span>{game.status}</span>
            </article>
          ))}
        </div>
      </Section>

      <Section id="contato" title="Contato">
        <p>
          Para contato profissional, conecte-se comigo pelos canais que serao
          adicionados nesta secao na proxima versao do site.
        </p>
      </Section>
    </main>
  );
}
