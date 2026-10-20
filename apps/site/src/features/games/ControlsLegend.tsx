import { Kbd } from "../../components/ui/Kbd";
import type { GameControl, InputKey } from "../../domain/game";
import { useI18n } from "../../i18n/context";
import type { Messages } from "../../i18n/messages";

import "./controls-legend.css";

const letterKeys = new Set<InputKey>(["W", "A", "S", "D"]);

function keyLabel(key: InputKey, labels: Messages["keys"]): string {
  return letterKeys.has(key) ? key : labels[key as keyof Messages["keys"]];
}

function isWasd(keys: InputKey[]) {
  return keys.length === 4 && ["W", "A", "S", "D"].every((key) => keys.includes(key as InputKey));
}

export function ControlsLegend({ controls }: { controls: GameControl[] }) {
  const { messages } = useI18n();

  return (
    <dl className="controls-legend">
      {controls.map((control) => (
        <div key={control.keys.join("+")} className="controls-legend-row">
          <dt className={isWasd(control.keys) ? "controls-keys controls-keys-wasd" : "controls-keys"}>
            {control.keys.map((key) => (
              <Kbd key={key} wide={!letterKeys.has(key)}>
                {keyLabel(key, messages.keys)}
              </Kbd>
            ))}
          </dt>
          <dd>{control.action}</dd>
        </div>
      ))}
    </dl>
  );
}
