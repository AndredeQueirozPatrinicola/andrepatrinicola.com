import { Header } from "../components/Header/Header";
import { Nav } from "../components/Nav/Nav";
import { NavItem } from "../components/NavItem/NavItem";
import { TextType } from "../components/TextType/TextType";
import { NoContentPlaceHolder } from "../components/NoContentPlaceHolder/NoContentPlaceHolder";
import { ContentContainer } from "../components/ContentContainer/ContentContainer";
import { Loader } from "../components/Loader/Loader";
import { useLoadContent } from "../hooks/useLoadContent";

import { GamesPage } from "./GamesPage/GamesPage";
import { MouseEvent, ReactNode, useEffect, useState } from "react";
import { GameRenderer } from "./GameRenderer/GameRenderer";
import { gamesCatalog } from "../content/gamesCatelog";

export function HomePage() {
  const [currentContent, setCurrentContent] = useState<ReactNode>(
    <NoContentPlaceHolder id="no-content" />
  );
  const { isLoading, load } = useLoadContent(setCurrentContent);
  const onClickNavItem = (_: MouseEvent, content: ReactNode) => {
    load(content);
  };
  useEffect(() => {
    load(<GameRenderer id="tennis" gameUrl={gamesCatalog[0].playUrl} devUrl={gamesCatalog[0].devUrl} title={gamesCatalog[0].title}/>);
  }, [load]);


  return (
    <main className="page-shell">
      <Header id='header'>
        <h1>
          <TextType id="header-text-type" text={["Olá, seja bem-vindo!"]} typingSpeed={150}/>
        </h1>
        <p>
          <TextType id="header-text-type" text={["Escolha uma opção para continuar: "]} typingSpeed={50}/>
        </p>
      </Header>
      <Nav id="nav">
        <NavItem id="games" label="Jogos" content={<GamesPage onGameClicked={onClickNavItem}/>} onClick={onClickNavItem}/>
        <NavItem id="labs" label="Labs" content={null} onClick={onClickNavItem}/>
        <NavItem id="me" label="Sobre mim" content={null} onClick={onClickNavItem}/>
        <NavItem id="curriculum" label="Curriculo" content={null} onClick={onClickNavItem}/>
      </Nav>
      <ContentContainer id="content-container"> 
          {isLoading ? <Loader id="loader" pixelNumber={4}/> : currentContent}
      </ContentContainer>
    </main>
  );
}
