import { describe, expect, it } from "vitest";
import {
  buildServerGroupSections,
  currentGroupAssignKey,
  nextMemberIdsForAssign,
  parseGroupAssignTarget,
  shouldPersistGroupAssign,
  sumConnectedClients,
  ungroupedServerIds,
  UNGROUPED_GROUP_ID,
} from "./serverGroups";

describe("buildServerGroupSections", () => {
  it("orders groups and servers, then ungrouped", () => {
    const sections = buildServerGroupSections(
      [
        { id: 1, groupId: 10, sortOrder: 1 },
        { id: 2, groupId: 10, sortOrder: 0 },
        { id: 3, groupId: null, sortOrder: 5 },
        { id: 4, groupId: 20, sortOrder: 0 },
      ],
      [
        { id: 20, name: "US", sortOrder: 1, serverIds: [4] },
        { id: 10, name: "EU", sortOrder: 0, serverIds: [2, 1] },
      ],
    );

    expect(sections.map((s) => s.key)).toEqual([10, 20, UNGROUPED_GROUP_ID]);
    expect(sections[0].servers.map((s) => s.id)).toEqual([2, 1]);
    expect(sections[1].servers.map((s) => s.id)).toEqual([4]);
    expect(sections[2].servers.map((s) => s.id)).toEqual([3]);
  });

  it("keeps empty named groups and puts orphans in the named group by groupId", () => {
    const sections = buildServerGroupSections(
      [{ id: 9, groupId: 1, sortOrder: 0 }],
      [{ id: 1, name: "Empty", sortOrder: 0, serverIds: [] }],
    );
    expect(sections[0].servers.map((s) => s.id)).toEqual([9]);
    expect(sections.some((s) => s.key === UNGROUPED_GROUP_ID)).toBe(false);
  });

  it("omits Ungrouped when every server is in a group", () => {
    const sections = buildServerGroupSections(
      [{ id: 1, groupId: 10, sortOrder: 0 }],
      [{ id: 10, name: "EU", sortOrder: 0, serverIds: [1] }],
    );
    expect(sections.map((s) => s.key)).toEqual([10]);
  });
});

describe("sumConnectedClients", () => {
  it("sums live and stored connected counts across servers", () => {
    expect(
      sumConnectedClients([
        { wsCountConnectedClients: 3 },
        { raw: { countConnectedClients: 2 } },
        { countConnectedClients: 1 },
        { wsCountConnectedClients: null, raw: { countConnectedClients: 4 } },
      ]),
    ).toBe(10);
  });
});

describe("ungroupedServerIds", () => {
  it("returns servers that are not in any named group", () => {
    const ids = ungroupedServerIds(
      [1, 3, 2],
      [{ id: 10, name: "EU", sortOrder: 0, serverIds: [2] }],
    );
    expect(ids).toEqual([1, 3]);
  });
});

describe("group assign after add/edit", () => {
  const groups = [
    { id: 10, name: "EU", sortOrder: 0, serverIds: [1, 3] },
    { id: 20, name: "US", sortOrder: 1, serverIds: [4] },
  ];

  it("appends a newly created server to the selected group without dropping members", () => {
    expect(nextMemberIdsForAssign(groups, [1, 2, 3, 4, 99], 10, [99])).toEqual([1, 3, 99]);
  });

  it("moves a server into another group by appending to that group's list", () => {
    expect(nextMemberIdsForAssign(groups, [1, 2, 3, 4], 20, [1])).toEqual([4, 1]);
  });

  it("ungroups a server without wiping other ungrouped servers", () => {
    expect(nextMemberIdsForAssign(groups, [1, 2, 3, 4], UNGROUPED_GROUP_ID, [1])).toEqual([2, 1]);
  });

  it("does not persist when the form group matches current membership", () => {
    expect(shouldPersistGroupAssign(10, 10)).toBe(false);
    expect(shouldPersistGroupAssign(null, UNGROUPED_GROUP_ID)).toBe(false);
    expect(shouldPersistGroupAssign(10, UNGROUPED_GROUP_ID)).toBe(true);
    expect(shouldPersistGroupAssign(null, 10)).toBe(true);
  });

  it("parses the form select into a group target", () => {
    expect(parseGroupAssignTarget(UNGROUPED_GROUP_ID)).toBe(UNGROUPED_GROUP_ID);
    expect(parseGroupAssignTarget("10")).toBe(10);
    expect(parseGroupAssignTarget("0")).toBeNull();
    expect(parseGroupAssignTarget("nope")).toBeNull();
    expect(currentGroupAssignKey(undefined)).toBe(UNGROUPED_GROUP_ID);
  });
});
