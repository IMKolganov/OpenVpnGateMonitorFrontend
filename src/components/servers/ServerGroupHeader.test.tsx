import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServerGroupHeader } from "./ServerGroupHeader";

describe("ServerGroupHeader", () => {
  it("shows the group name with summed connected clients", () => {
    render(
      <ServerGroupHeader
        name="EU"
        count={3}
        connectedCount={7}
        collapsed={false}
        onToggleCollapse={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: /EU, 7 connected, 3 servers/ })).toBeInTheDocument();
    expect(screen.getByTitle("Connected clients")).toHaveTextContent("(7)");
    expect(screen.getByTitle("Servers in group")).toHaveTextContent("3");
  });
});
