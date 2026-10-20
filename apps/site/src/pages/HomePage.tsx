import { Header } from "../components/Header/Header";
import { Nav } from "../components/Nav/Nav";
import { NavItem } from "../components/NavItem/NavItem";
import { TextType } from "../components/TextType/TextType";
import { NoContentPlaceHolder } from "../components/NoContentPlaceHolder/NoContentPlaceHolder";
import { ContentContainer } from "../components/ContentContainer/ContentContainer";
import { Loader } from "../components/Loader/Loader";
import { useLoadContent } from "../hooks/useLoadContent";

import { GamesPage } from "./GamesPage/GamesPage";
import type { MouseEvent, ReactNode} from "react";
import { useEffect, useState } from "react";
import { GameRenderer } from "../components/GameRenderer/GameRenderer";
import type { Game } from "../domain/game";

export function HomePage({ games }: { games: Game[] }) {
  const [currentContent, setCurrentContent] = useState<ReactNode>(
    <NoContentPlaceHolder id="no-content" />
  );
  const { isLoading, load } = useLoadContent(setCurrentContent);
  const onClickNavItem = (_: MouseEvent, content: ReactNode) => {
    load(content);
  };
  useEffect(() => {
    const [firstGame] = games;
    if (firstGame?.hosting.kind === "embedded") {
      load(<GameRenderer id={firstGame.slug} src={firstGame.hosting.path} title={firstGame.title}/>);
    }
  }, [load, games]);


  return (
    <div className="page-shell">
      <Header id='header'>
        <h1>
          <TextType id="header-text-type" text={["Olá, seja bem-vindo!"]} typingSpeed={150}/>
        </h1>
        <p>
          <TextType id="header-text-type" text={["Escolha uma opção para continuar: "]} typingSpeed={50}/>
        </p>
      </Header>
      <Nav id="nav">
        <NavItem id="games" label="Jogos" content={<GamesPage games={games} onGameClicked={onClickNavItem}/>} onClick={onClickNavItem}/>
        <NavItem id="labs" label="Labs" content={null} onClick={onClickNavItem}/>
        <NavItem id="me" label="Sobre mim" content={null} onClick={onClickNavItem}/>
        <NavItem id="curriculum" label="Curriculo" content={null} onClick={onClickNavItem}/>
      </Nav>
      <ContentContainer id="content-container"> 
          {isLoading ? <Loader id="loader" pixelNumber={4}/> : currentContent}
      </ContentContainer>
    </div>
  );
}
