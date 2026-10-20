import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderLocalized } from "../../test/render";
import { ControlsLegend } from "./ControlsLegend";

describe("ControlsLegend", () => {
  it("pairs translated key labels with their actions", () => {
    renderLocalized(
      <ControlsLegend
        controls={[
          { keys: ["W", "A", "S", "D"], action: "Mover" },
          { keys: ["space", "click"], action: "Impulso" },
        ]}
      />,
      { locale: "pt" },
    );

    const rows = screen.getAllByRole("definition");
    expect(rows.map((row) => row.textContent)).toEqual(["Mover", "Impulso"]);

    const keys = screen.getAllByRole("term");
    expect(within(keys[0]).getAllByText(/^[WASD]$/)).toHaveLength(4);
    expect(keys[1]).toHaveTextContent("EspaçoClique");
  });
});
