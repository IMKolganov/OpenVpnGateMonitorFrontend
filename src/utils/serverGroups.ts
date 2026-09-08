import type { VpnServerGroupsDtoVpnServerGroupDto } from "../api/orval/model/vpnServerGroupsDtoVpnServerGroupDto";

export const UNGROUPED_GROUP_ID = "ungrouped" as const;

export type ServerGroupSectionId = number | typeof UNGROUPED_GROUP_ID;

const COLLAPSE_STORAGE_KEY = "datagate.serverGroup.collapsed";

export type CollapsedGroupsMap = Record<string, boolean>;

export function loadCollapsedGroups(): CollapsedGroupsMap {
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as CollapsedGroupsMap) : {};
  } catch {
    return {};
  }
}

export function saveCollapsedGroups(map: CollapsedGroupsMap): void {
  try {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

const DETAILS_HIDDEN_STORAGE_KEY = "datagate.serverList.detailsHidden";

export function loadServerDetailsHidden(): boolean {
  try {
    return localStorage.getItem(DETAILS_HIDDEN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveServerDetailsHidden(hidden: boolean): void {
  try {
    localStorage.setItem(DETAILS_HIDDEN_STORAGE_KEY, hidden ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

export type GroupableServer = {
  id: number;
  groupId?: number | null;
  sortOrder?: number | null;
};

export type ServerGroupSection<T extends GroupableServer> = {
  key: ServerGroupSectionId;
  name: string;
  sortOrder: number;
  servers: T[];
};

/** Build ordered sections: API groups first (by sortOrder), then Ungrouped. */
export function buildServerGroupSections<T extends GroupableServer>(
  servers: T[],
  groups: VpnServerGroupsDtoVpnServerGroupDto[],
): ServerGroupSection<T>[] {
  const byId = new Map(servers.map((s) => [s.id, s]));
  const assigned = new Set<number>();
  const orderedGroups = [...groups].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0),
  );

  const sections: ServerGroupSection<T>[] = [];

  for (const g of orderedGroups) {
    if (typeof g.id !== "number") continue;
    const ids = g.serverIds ?? [];
    const members: T[] = [];
    for (const sid of ids) {
      const s = byId.get(sid);
      if (!s) continue;
      members.push(s);
      assigned.add(sid);
    }
    // Include servers that claim this groupId but are missing from serverIds (stale cache).
    for (const s of servers) {
      if (s.groupId === g.id && !assigned.has(s.id)) {
        members.push(s);
        assigned.add(s.id);
      }
    }
    members.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
    sections.push({
      key: g.id,
      name: g.name?.trim() || `Group ${g.id}`,
      sortOrder: g.sortOrder ?? 0,
      servers: members,
    });
  }

  const ungrouped = servers
    .filter((s) => !assigned.has(s.id))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);

  if (ungrouped.length > 0) {
    sections.push({
      key: UNGROUPED_GROUP_ID,
      name: "Ungrouped",
      sortOrder: Number.MAX_SAFE_INTEGER,
      servers: ungrouped,
    });
  }

  return sections;
}

export function readGroupsPayload(data: unknown): VpnServerGroupsDtoVpnServerGroupDto[] {
  if (!data || typeof data !== "object") return [];
  const raw = data as Record<string, unknown>;
  if (Array.isArray(raw.groups)) return raw.groups as VpnServerGroupsDtoVpnServerGroupDto[];
  const nested = raw.data;
  if (nested && typeof nested === "object" && Array.isArray((nested as { groups?: unknown }).groups)) {
    return (nested as { groups: VpnServerGroupsDtoVpnServerGroupDto[] }).groups;
  }
  return [];
}

export function groupServerIds(group: VpnServerGroupsDtoVpnServerGroupDto | undefined): number[] {
  return (group?.serverIds ?? []).filter((id): id is number => typeof id === "number");
}

export function findGroupForServer(
  groups: VpnServerGroupsDtoVpnServerGroupDto[],
  serverId: number,
): VpnServerGroupsDtoVpnServerGroupDto | undefined {
  return groups.find(
    (g) => typeof g.id === "number" && (g.serverIds ?? []).includes(serverId),
  );
}

export function appendUniqueId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids : [...ids, id];
}

export function ungroupedServerIds(
  allServerIds: number[],
  groups: VpnServerGroupsDtoVpnServerGroupDto[],
): number[] {
  const assigned = new Set<number>();
  for (const g of groups) {
    for (const id of g.serverIds ?? []) {
      if (typeof id === "number") assigned.add(id);
    }
  }
  return allServerIds.filter((id) => !assigned.has(id));
}

export type GroupAssignTarget = number | typeof UNGROUPED_GROUP_ID;

export function nextMemberIdsForAssign(
  groups: VpnServerGroupsDtoVpnServerGroupDto[],
  allServerIds: number[],
  target: GroupAssignTarget,
  addServerIds: number[],
): number[] {
  const current =
    target === UNGROUPED_GROUP_ID
      ? ungroupedServerIds(allServerIds, groups)
      : groupServerIds(groups.find((g) => g.id === target));
  return addServerIds.reduce(appendUniqueId, current);
}
