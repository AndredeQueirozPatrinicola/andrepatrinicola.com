/**
 * Icons drawn on a 9×9 pixel grid ("#" = filled), rendered as crisp SVG so
 * they stay sharp at any size and inherit the current text color.
 */
const icons = {
  sun: [
    "....#....",
    ".#.....#.",
    "...###...",
    "..#####..",
    "#.#####.#",
    "..#####..",
    "...###...",
    ".#.....#.",
    "....#....",
  ],
  moon: [
    "...###...",
    "..###....",
    ".###.....",
    ".###.....",
    ".###.....",
    ".####....",
    "..######.",
    "...####..",
    ".........",
  ],
  system: [
    ".........",
    "#########",
    "#.......#",
    "#.......#",
    "#.......#",
    "#########",
    "....#....",
    "...###...",
    ".........",
  ],
  arrow: [
    ".........",
    ".....#...",
    "......#..",
    ".......#.",
    "########.",
    ".......#.",
    "......#..",
    ".....#...",
    ".........",
  ],
  external: [
    "....#####",
    "......###",
    ".....#.##",
    "....#...#",
    "#..#.....",
    "#.#......",
    "#........",
    "#........",
    "#######..",
  ],
} as const;

export type PixelIconName = keyof typeof icons;

/** Merges consecutive filled pixels of each row into one rect. */
function toPath(rows: readonly string[]): string {
  let path = "";
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== "#") {
        x += 1;
        continue;
      }
      const start = x;
      while (row[x] === "#") x += 1;
      path += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  });
  return path;
}

const paths = Object.fromEntries(
  Object.entries(icons).map(([name, rows]) => [name, toPath(rows)]),
) as Record<PixelIconName, string>;

type PixelIconProps = {
  name: PixelIconName;
  size?: number;
  className?: string;
};

export function PixelIcon({ name, size = 18, className }: PixelIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 9 9"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
