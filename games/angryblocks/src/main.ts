import './styles/main.css'
import customFontUrl from './fonts/VCR_OSD_MONO_1.001.ttf';

import { AngryBlocks } from './game/AngryBlocks';

export async function loadGameFonts(): Promise<void> {
  const font = new FontFace(
    'CustomFont',
    `url(${customFontUrl})`
  );

  const loadedFont = await font.load();

  document.fonts.add(loadedFont);
}

function getCanvas(): HTMLCanvasElement {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');

  if (!canvas) {
    throw new Error('Canvas #game-canvas não encontrado.');
  }

  return canvas;
}

async function bootstrap(): Promise<void> {
  await loadGameFonts();

  const canvas = getCanvas();
  const game = new AngryBlocks(canvas);

  game.start();
}

bootstrap();