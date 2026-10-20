import { hudNumber } from "../../i18n/format";

import "./hud-stats.css";

export type HudStat = { label: string; value: number };

/** Counters styled like a game HUD: label over a two-digit number. */
export function HudStats({ stats }: { stats: HudStat[] }) {
  return (
    <dl className="hud-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="hud-stat">
          <dt>{stat.label}</dt>
          <dd>{hudNumber(stat.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
