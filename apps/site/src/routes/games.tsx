import { HudStats } from "../components/ui/HudStats";
import { PageIntro } from "../components/ui/PageIntro";
import { repositories } from "../data";
import { GameCatalog } from "../features/games/GameCatalog";
import { useI18n } from "../i18n/context";
import { getMessages } from "../i18n/messages";
import { requireLocale } from "../i18n/route";
import { buildMeta } from "../seo/meta";
import type { Route } from "./+types/games";

export { shouldRevalidate } from "../i18n/route";

export async function loader({ params }: Route.LoaderArgs) {
  const locale = requireLocale(params);
  const messages = getMessages(locale);
  return {
    games: await repositories.games.list(locale),
    meta: buildMeta({
      locale,
      path: "/games",
      title: messages.games.title,
      siteName: messages.site.name,
      description: messages.games.intro,
    }),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return loaderData.meta;
}

export default function GamesRoute({ loaderData }: Route.ComponentProps) {
  const { messages } = useI18n();
  const { games } = loaderData;
  const text = messages.games;

  return (
    <div className="page">
      <PageIntro
        title={text.title}
        lead={text.intro}
        aside={
          <HudStats
            stats={[
              { label: text.stats.total, value: games.length },
              {
                label: text.stats.inBrowser,
                value: games.filter((game) => game.hosting.kind === "embedded").length,
              },
              {
                label: text.stats.prototypes,
                value: games.filter((game) => game.status === "prototype").length,
              },
            ]}
          />
        }
      />
      <section className="section-block" aria-label={text.title}>
        <GameCatalog games={games} />
      </section>
    </div>
  );
}
