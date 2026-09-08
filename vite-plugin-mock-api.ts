import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

type Json = Record<string, unknown> | unknown[];

function envelope(data: Json | null): string {
  return JSON.stringify({ success: true, data, errorMessage: null });
}

function sendJson(res: ServerResponse, body: string, status = 200): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function pathnameOf(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  try {
    return new URL(raw, "http://127.0.0.1").pathname;
  } catch {
    return raw.split("?")[0] ?? "/";
  }
}

const nowIso = () => new Date().toISOString();

type MockGroup = { id: number; name: string; sortOrder: number; serverIds: number[] };

let nextMockGroupId = 11;
let mockGroups: MockGroup[] = [{ id: 10, name: "EU", sortOrder: 0, serverIds: [1] }];

function cloneGroups(): MockGroup[] {
  return mockGroups.map((g) => ({ ...g, serverIds: [...g.serverIds] }));
}

function groupForServer(serverId: number): MockGroup | undefined {
  return mockGroups.find((g) => g.serverIds.includes(serverId));
}

function removeServerFromAllGroups(serverId: number): void {
  for (const g of mockGroups) {
    g.serverIds = g.serverIds.filter((id) => id !== serverId);
  }
}

function setNamedGroupServers(groupId: number, vpnServerIds: number[]): MockGroup | null {
  const group = mockGroups.find((g) => g.id === groupId);
  if (!group) return null;
  for (const id of vpnServerIds) removeServerFromAllGroups(id);
  group.serverIds = [...vpnServerIds];
  return group;
}

function setUngroupedServers(vpnServerIds: number[]): void {
  for (const id of vpnServerIds) removeServerFromAllGroups(id);
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
        resolve(parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function asIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is number => typeof id === "number");
}

function stubVpnServer(id: number, name: string, serverType: 0 | 1, extra?: Record<string, unknown>) {
  const group = groupForServer(id);
  return {
    id,
    serverType,
    serverName: name,
    isOnline: true,
    isDefault: id === 1,
    apiUrl: `https://vpn-${id}.mock.local`,
    latitude: id === 1 ? 60.17 : 50.11,
    longitude: id === 1 ? 24.94 : 8.68,
    isEnableWss: true,
    createDate: nowIso(),
    lastUpdate: nowIso(),
    isDeleted: false,
    tags: ["mock"],
    groupId: group?.id ?? null,
    groupName: group?.name ?? null,
    sortOrder: id,
    isAccessibleForUserQuotaPlan: true,
    isDisabled: false,
    ...extra,
  };
}

function serversWithStatus() {
  const openVpn = stubVpnServer(1, "Helsinki OpenVPN", 0);
  const xray = stubVpnServer(2, "Frankfurt Xray", 1);
  return {
    vpnServerWithStatuses: [
      {
        vpnServerResponses: { vpnServer: openVpn },
        vpnServerStatusLogResponse: {
          vpnServerId: 1,
          sessionId: "mock-session-1",
          upSince: nowIso(),
          serverLocalIp: "10.8.0.1",
          serverRemoteIp: "203.0.113.10",
          bytesIn: 128_000_000,
          bytesOut: 64_000_000,
          version: "2.6.12",
        },
        countConnectedClients: 3,
        countSessions: 11,
        totalBytesIn: 128_000_000,
        totalBytesOut: 64_000_000,
      },
      {
        vpnServerResponses: { vpnServer: xray },
        vpnServerStatusLogResponse: {
          vpnServerId: 2,
          sessionId: "mock-session-2",
          upSince: nowIso(),
          bytesIn: 32_000_000,
          bytesOut: 18_000_000,
          version: "1.8.0",
        },
        countConnectedClients: 1,
        countSessions: 4,
        totalBytesIn: 32_000_000,
        totalBytesOut: 18_000_000,
      },
    ],
  };
}

function overviewSeries() {
  const rows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(12, 0, 0, 0);
    return {
      ts: d.toISOString(),
      activeClients: 2 + (i % 3),
      trafficInBytes: 12_000_000 + i * 1_500_000,
      trafficOutBytes: 6_000_000 + i * 800_000,
      trafficTotalBytes: 18_000_000 + i * 2_300_000,
    };
  });
  return {
    overviewSeriesRows: rows,
    summary: {
      totalTrafficInBytes: 90_000_000,
      totalTrafficOutBytes: 48_000_000,
      peakActiveClients: 5,
    },
  };
}

function mockPayload(pathname: string, method: string, body: Record<string, unknown> = {}): Json | null {
  if (pathname.includes("/api/hubs/")) {
    return { error: "SignalR is disabled in mock mode" };
  }

  if (pathname.endsWith("/api/auth/totp/status")) {
    return { isAdmin: true, totpEnabled: true, requiresTotpSetup: false };
  }
  if (pathname.endsWith("/api/auth/session-policy")) {
    return { adminIdleTimeoutMinutes: 480 };
  }
  if (pathname.endsWith("/api/notifications/unread-count")) {
    return { count: 2 };
  }
  if (pathname.endsWith("/api/notifications/get-all")) {
    return { notifications: [], totalCount: 0 };
  }
  if (pathname.endsWith("/api/vpn-server-groups/get-all")) {
    return { groups: cloneGroups() };
  }
  if (method === "POST" && pathname.endsWith("/api/vpn-server-groups/create")) {
    const name = String(body.name ?? "").trim() || "Group";
    const group: MockGroup = {
      id: nextMockGroupId++,
      name,
      sortOrder: mockGroups.length,
      serverIds: [],
    };
    mockGroups = [...mockGroups, group];
    return { group: { ...group, serverIds: [...group.serverIds] } };
  }
  const updateGroup = pathname.match(/\/api\/vpn-server-groups\/update\/(\d+)$/);
  if (method === "PUT" && updateGroup) {
    const id = Number(updateGroup[1]);
    const group = mockGroups.find((g) => g.id === id);
    if (!group) return { group: null };
    const name = String(body.name ?? group.name).trim();
    if (name) group.name = name;
    return { group: { ...group, serverIds: [...group.serverIds] } };
  }
  const deleteGroup = pathname.match(/\/api\/vpn-server-groups\/delete\/(\d+)$/);
  if (method === "DELETE" && deleteGroup) {
    const id = Number(deleteGroup[1]);
    mockGroups = mockGroups.filter((g) => g.id !== id);
    return {};
  }
  const setServers = pathname.match(/\/api\/vpn-server-groups\/(\d+)\/set-servers$/);
  if (method === "PUT" && setServers) {
    const id = Number(setServers[1]);
    const group = setNamedGroupServers(id, asIdList(body.vpnServerIds));
    return { group: group ? { ...group, serverIds: [...group.serverIds] } : null };
  }
  if (method === "PUT" && pathname.endsWith("/api/vpn-server-groups/ungrouped/set-servers")) {
    setUngroupedServers(asIdList(body.vpnServerIds));
    return {};
  }
  if (pathname.includes("/discoveries/pending")) {
    return { discoveries: [] };
  }
  if (pathname.endsWith("/api/v3/open-vpn-servers/get-all-with-status")) {
    return serversWithStatus();
  }
  if (pathname.endsWith("/api/v3/open-vpn-servers/get-all")) {
    return {
      vpnServers: serversWithStatus().vpnServerWithStatuses.map(
        (row) => row.vpnServerResponses.vpnServer,
      ),
    };
  }

  const getById = pathname.match(/\/api\/open-vpn-servers\/get\/(\d+)$/);
  if (getById) {
    const id = Number(getById[1]);
    const row =
      serversWithStatus().vpnServerWithStatuses.find((item) => item.vpnServerResponses.vpnServer.id === id) ??
      serversWithStatus().vpnServerWithStatuses[0];
    return { vpnServer: row.vpnServerResponses.vpnServer };
  }

  const getWithStatus = pathname.match(/\/api\/open-vpn-servers\/get-server-with-status\/(\d+)$/);
  if (getWithStatus) {
    const id = Number(getWithStatus[1]);
    return (
      serversWithStatus().vpnServerWithStatuses.find((item) => item.vpnServerResponses.vpnServer.id === id) ??
      serversWithStatus().vpnServerWithStatuses[0]
    );
  }
  if (pathname.includes("/api/open-vpn-clients/overview/summary")) {
    return {
      totals: {
        sessionsCount: 15,
        usersCount: 4,
        accountsCount: 3,
        trafficInBytes: 160_000_000,
        trafficOutBytes: 82_000_000,
        trafficTotalBytes: 242_000_000,
      },
    };
  }
  if (pathname.includes("/api/open-vpn-clients/overview/series")) {
    return overviewSeries();
  }
  if (pathname.includes("/api/open-vpn-clients/overview/users/series")) {
    return { rows: [] };
  }
  if (pathname.includes("/api/open-vpn-clients/overview/users")) {
    return { overviewUserItems: [] };
  }
  if (pathname.includes("/api/open-vpn-clients/overview/points")) {
    return { points: [] };
  }
  if (pathname.includes("/api/open-vpn-clients/user-connected-server-ids")) {
    return { vpnServerIds: [1] };
  }
  if (pathname.includes("/api/open-vpn-clients/get-all-connected")) {
    return { clients: [] };
  }
  if (pathname.includes("/healthcheck")) {
    return { status: "ok", mock: true };
  }

  if (method === "GET") return {};
  return {};
}

export function mockApiPlugin(enabled: boolean): Plugin {
  return {
    name: "mock-api",
    configureServer(server) {
      if (!enabled) return;

      server.middlewares.use((req, res, next) => {
        const pathname = pathnameOf(req);
        if (!pathname.startsWith("/api")) {
          next();
          return;
        }

        const method = (req.method ?? "GET").toUpperCase();
        if (pathname.startsWith("/api/hubs/")) {
          sendJson(res, envelope({ disabled: true }), 404);
          return;
        }

        const finish = async () => {
          const body =
            method === "GET" || method === "HEAD" ? {} : await readJsonBody(req);
          sendJson(res, envelope(mockPayload(pathname, method, body)));
        };
        void finish();
      });
    },
  };
}
