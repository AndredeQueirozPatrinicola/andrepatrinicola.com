import './styles/main.css'

import { Game } from './game/Game';

function getCanvas(): HTMLCanvasElement {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');

  if (!canvas) {
    throw new Error('Canvas #game-canvas não encontrado.');
  }

  return canvas;
}

function bootstrap(): void {
  const canvas = getCanvas();
  const game = new Game(canvas);

  game.start();
}

bootstrap();