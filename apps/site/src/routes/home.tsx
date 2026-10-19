import { repositories } from "../data";
import { HomePage } from "../pages/HomePage";
import type { Route } from "./+types/home";

export async function loader() {
  return { games: await repositories.games.list("pt") };
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
