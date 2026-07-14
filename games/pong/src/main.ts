import './styles/main.css'

import { PongGame } from './game/PongGame';

function getCanvas(): HTMLCanvasElement {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');

  if (!canvas) {
    throw new Error('Canvas #game-canvas não encontrado.');
  }

  return canvas;
}

function bootstrap(): void {
  const canvas = getCanvas();
  const game = new PongGame(canvas);

  game.start();
}

bootstrap();