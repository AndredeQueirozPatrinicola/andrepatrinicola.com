export type PublishedGame = { slug: string; directory: string; dist: string };
export function findPublishedGames(repositoryRoot: string): Promise<PublishedGame[]>;
