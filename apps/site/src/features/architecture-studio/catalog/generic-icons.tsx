/**
 * Icons of the generic (non-AWS) components, drawn on the same 9×9 pixel
 * grid as the site's PixelIcon ("#" = filled) so they match its look.
 */
const icons = {
  user: [
    "...###...",
    "..#####..",
    "..#####..",
    "...###...",
    ".........",
    ".#######.",
    "#########",
    "#########",
    "#########",
  ],
  browser: [
    "#########",
    "#.#.#...#",
    "#########",
    "#.......#",
    "#.#####.#",
    "#.......#",
    "#.###...#",
    "#.......#",
    "#########",
  ],
  app: [
    "#########",
    "#.......#",
    "#.##.##.#",
    "#.##.##.#",
    "#.......#",
    "#.##.##.#",
    "#.##.##.#",
    "#.......#",
    "#########",
  ],
  server: [
    "#########",
    "#.#.....#",
    "#########",
    "#.#.....#",
    "#########",
    "#.#.....#",
    "#########",
    "....#....",
    "..#####..",
  ],
  database: [
    "..#####..",
    ".#.....#.",
    "..#####..",
    ".#.....#.",
    ".#.....#.",
    "..#####..",
    ".#.....#.",
    ".#.....#.",
    "..#####..",
  ],
  internet: [
    "...###...",
    ".##.#.##.",
    ".#..#..#.",
    "#########",
    "#...#...#",
    "#########",
    ".#..#..#.",
    ".##.#.##.",
    "...###...",
  ],
  external: [
    ".........",
    "...###...",
    "..#...#..",
    ".##...##.",
    "#.......#",
    "#.......#",
    ".#######.",
    ".........",
    ".........",
  ],
  pipeline: [
    ".........",
    "##.......",
    "##.##....",
    "...##.##.",
    "......##.",
    "...##.##.",
    "##.##....",
    "##.......",
    ".........",
  ],
  note: [
    "#######..",
    "#.....##.",
    "#.###.###",
    "#.......#",
    "#.#####.#",
    "#.......#",
    "#.####..#",
    "#.......#",
    "#########",
  ],
  group: [
    "###.#.###",
    "#.......#",
    "#.......#",
    ".........",
    "#.......#",
    ".........",
    "#.......#",
    "#.......#",
    "###.#.###",
  ],
  zone: [
    "#.#.#.#.#",
    ".........",
    "#.......#",
    ".........",
    "#.......#",
    ".........",
    "#.......#",
    ".........",
    "#.#.#.#.#",
  ],
} satisfies Record<string, string[]>;

export type GenericIconName = keyof typeof icons;

function toPath(rows: string[]): string {
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
) as Record<GenericIconName, string>;

export function GenericIcon({ name, size = 24 }: { name: GenericIconName; size?: number }) {
  return (
    <svg
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
