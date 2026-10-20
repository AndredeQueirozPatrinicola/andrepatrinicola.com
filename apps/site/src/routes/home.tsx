import { repositories } from "../data";
import { requireLocale } from "../i18n/route";
import { HomePage } from "../pages/HomePage";
import type { Route } from "./+types/home";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  return { games: await repositories.games.list(locale) };
}

export function meta() {
  return [
    { title: "Andev Labs" },
    { name: "description", content: "Andev Labs." },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <HomePage games={loaderData.games} />;
}
