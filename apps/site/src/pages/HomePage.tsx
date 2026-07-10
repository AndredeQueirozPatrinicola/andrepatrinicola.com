import { Section } from "../components/Section/Section";
import { Header } from "../components/Header/Header";
import { TextType } from "../components/TextType/TextType";
import { games, projects } from "../content/portfolio";

export function HomePage() {
  return (
    <main className="page-shell">
      
      <Header id='header'>
        <h1>
          <TextType id="header-text-type" text={["Ola, seja bem vindo!"]}/>
        </h1>
      </Header>

      {/* <Section id="sobre" title="Sobre">
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
      </Section> */}
    </main>
  );
}
