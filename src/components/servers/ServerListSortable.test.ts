import { describe, expect, it } from "vitest";
import {
  groupDragId,
  groupDropId,
  parseGroupDragId,
  parseGroupDropId,
  parseServerDragId,
  serverDragId,
} from "./ServerListSortable";

describe("server list drag ids", () => {
  it("round-trips named groups and ungrouped drop targets", () => {
    expect(parseGroupDragId(groupDragId(10))).toBe(10);
    expect(parseGroupDragId("g:ungrouped")).toBeNull();
    expect(parseGroupDropId(groupDropId("10"))).toBe("10");
    expect(parseGroupDropId(groupDropId("ungrouped"))).toBe("ungrouped");
  });

  it("parses server ids without treating group drop ids as servers", () => {
    expect(parseServerDragId(serverDragId("10", 3))).toEqual({ groupKey: "10", serverId: 3 });
    expect(parseServerDragId(serverDragId("ungrouped", 2))).toEqual({
      groupKey: "ungrouped",
      serverId: 2,
    });
    expect(parseServerDragId(groupDropId("10"))).toBeNull();
    expect(parseGroupDropId(serverDragId("10", 3))).toBeNull();
  });
});
