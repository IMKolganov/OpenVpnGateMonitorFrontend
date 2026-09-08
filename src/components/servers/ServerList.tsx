// src/components/ServerList.tsx
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FaSyncAlt, FaPlus, FaFolderPlus, FaFolder, FaExpand, FaCompress, FaChevronLeft, FaList, FaThList } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import { toast } from "react-toastify";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import "../../css/ServerList.css";

import useSignalRService from "../../hooks/useSignalRService";
import ServerItem from "./ServerItem";
import ServerGroupHeader from "./ServerGroupHeader";
import { AddServersToGroupModal } from "./AddServersToGroupModal";
import {
  DroppableGroupSection,
  SortableGroupSection,
  SortableServerRow,
  groupDragId,
  groupDropId,
  parseGroupDragId,
  parseGroupDropId,
  parseServerDragId,
  serverDragId,
  serverListCollisionDetection,
} from "./ServerListSortable";
import ServiceControls from "../ServiceControls";

import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { buildServerSwitchPath } from "../../utils/buildServerSwitchPath";
import {
  buildServerGroupSections,
  loadCollapsedGroups,
  saveCollapsedGroups,
  loadServerDetailsHidden,
  saveServerDetailsHidden,
  loadGroupAssignVisible,
  saveGroupAssignVisible,
  findGroupForServer,
  readGroupsPayload,
  sumConnectedClients,
  UNGROUPED_GROUP_ID,
  type CollapsedGroupsMap,
  type GroupAssignTarget,
} from "../../utils/serverGroups";
import { assignServersToGroup } from "../../utils/assignServerGroup";

import { deleteApiOpenVpnServersDeleteVpnServerId } from "../../api/orval/vpn-servers/vpn-servers";
import {
  getApiV3OpenVpnServersGetAllWithStatus,
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey,
} from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import {
  useGetApiVpnServerGroupsGetAll,
  usePostApiVpnServerGroupsCreate,
  usePutApiVpnServerGroupsUpdateId,
  useDeleteApiVpnServerGroupsDeleteId,
  putApiVpnServerGroupsReorder,
  putApiVpnServerGroupsIdSetServers,
  putApiVpnServerGroupsUngroupedSetServers,
  getGetApiVpnServerGroupsGetAllQueryKey,
} from "../../api/orval/vpn-server-groups/vpn-server-groups";
import { ServiceStatus } from "../../api/orvalModelShim";
import type {
  ServiceStatusDto,
  VpnServerWithStatusV2Dto,
  VpnServerWithStatusesV3Response,
} from "../../api/orvalModelShim";
import {
  isUserConnectedToServer,
  useCurrentUserConnectedServerIds,
} from "../../hooks/useCurrentUserConnectedServerIds";

type GetAllWithStatusData = Awaited<ReturnType<typeof getApiV3OpenVpnServersGetAllWithStatus>>;

type OrvalServerItem = VpnServerWithStatusV2Dto;

type MappedServer = {
  id: number;
  vpnServerId: number;
  serviceStatus: ServiceStatus | null;
  errorMessage: string | null;
  nextRunTime: string;
  wsCountConnectedClients?: number;
  wsCountSessions?: number;
  wsOnline: boolean | null;
  groupId?: number | null;
  sortOrder?: number;
  raw: OrvalServerItem;
};

const NUMBER_0 = 0 as ServiceStatus;
const NUMBER_1 = 1 as ServiceStatus;
const NUMBER_2 = 2 as ServiceStatus;

const stringToNumberStatus: Record<string, ServiceStatus> = {
  idle: NUMBER_0,
  running: NUMBER_1,
  error: NUMBER_2,
  "0": NUMBER_0,
  "1": NUMBER_1,
  "2": NUMBER_2,
};

const coerceStatus = (input: unknown): ServiceStatus => {
  if (typeof input === "number") {
    if (input === 0 || input === 1 || input === 2) return input as ServiceStatus;
    return NUMBER_0;
  }
  if (typeof input === "string") {
    const hit = stringToNumberStatus[input.toLowerCase()];
    return hit ?? NUMBER_0;
  }
  return NUMBER_0;
};

function wsStatusIsPresent(ws: ServiceStatusDto | undefined): ws is ServiceStatusDto & { status: ServiceStatus } {
  return ws != null && ws.status !== undefined && ws.status !== null;
}

function pickServiceDataEntry(
  map: Record<number, ServiceStatusDto>,
  id: number,
): ServiceStatusDto | undefined {
  return map[id] ?? (map as unknown as Record<string, ServiceStatusDto>)[String(id)];
}

const extractList = (resp: GetAllWithStatusData): OrvalServerItem[] => {
  const payload = resp as VpnServerWithStatusesV3Response;
  const list = payload.vpnServerWithStatuses ?? null;
  return Array.isArray(list) ? list : [];
};

const resolveServerId = (item: OrvalServerItem): number => {
  const id =
      item.vpnServerResponses?.vpnServer?.id ??
      item.vpnServerStatusLogResponse?.vpnServerId;

  return typeof id === "number" && Number.isFinite(id) && id !== 0 ? id : 0;
};

function serverRowIsDisabled(raw: OrvalServerItem): boolean {
  const v = raw.vpnServerResponses?.vpnServer ?? raw.openVpnServerResponses?.vpnServer;
  return Boolean(v?.isDisabled);
}

const V3_SERVERS_WITH_STATUS_KEY = [
  ...getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined),
  "mapped-list",
] as const;

function readApiIsOnline(item: OrvalServerItem): boolean {
  const vpn = item.vpnServerResponses?.vpnServer ?? item.openVpnServerResponses?.vpnServer;
  return Boolean(vpn?.isOnline);
}

type ServerListProps = {
  onHideList?: () => void;
};

const ServerList: React.FC<ServerListProps> = ({ onHideList }) => {
  const queryClient = useQueryClient();

  const user = getCurrentUser();
  const canAddServer = isAdmin(user);

  const { connectedServerIds } = useCurrentUserConnectedServerIds();

  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const { serviceData, runServiceNow, connectionState: hubConnectionState, lastError: hubLastError } =
      useSignalRService();

  const match = location.pathname.match(/\/servers\/(\d+)/);
  const selectedServerId = match ? Number.parseInt(match[1], 10) : null;

  const [collapsedMap, setCollapsedMap] = useState<CollapsedGroupsMap>(() => loadCollapsedGroups());
  const [detailsHidden, setDetailsHidden] = useState(() => loadServerDetailsHidden());
  const [groupAssignVisible, setGroupAssignVisible] = useState(() => loadGroupAssignVisible());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [addServersGroupId, setAddServersGroupId] = useState<number | null>(null);

  const [activeDrag, setActiveDrag] = useState<{ type: "group" | "server"; name: string } | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const {
    data: baseServers = [],
    isLoading: loading,
    isFetching: refreshing,
    refetch: loadServers,
  } = useQuery({
    queryKey: V3_SERVERS_WITH_STATUS_KEY,
    queryFn: async () => {
      const resp = await getApiV3OpenVpnServersGetAllWithStatus();
      const list = extractList(resp);

      return list.flatMap((item) => {
        const id = resolveServerId(item);
        if (!id) return [];
        const vpn = item.vpnServerResponses?.vpnServer;

        return [
          {
            id,
            vpnServerId: id,
            serviceStatus: null,
            errorMessage: null,
            nextRunTime: "N/A",
            wsCountConnectedClients: item.countConnectedClients,
            wsCountSessions: item.countSessions,
            wsOnline: readApiIsOnline(item),
            groupId: vpn?.groupId ?? null,
            sortOrder: vpn?.sortOrder ?? 0,
            raw: item,
          },
        ] satisfies MappedServer[];
      });
    },
  });

  // Recover if another screen wrote a different shape under the same query key.
  React.useEffect(() => {
    const poisoned =
      Array.isArray(baseServers) &&
      baseServers.length > 0 &&
      baseServers.some((s) => s == null || typeof s.id !== "number" || s.raw == null);
    if (poisoned) {
      void queryClient.invalidateQueries({ queryKey: V3_SERVERS_WITH_STATUS_KEY });
    }
  }, [baseServers, queryClient]);

  const groupsQuery = useGetApiVpnServerGroupsGetAll();
  const groups = useMemo(() => readGroupsPayload(groupsQuery.data), [groupsQuery.data]);
  const createGroupMutation = usePostApiVpnServerGroupsCreate();
  const renameGroupMutation = usePutApiVpnServerGroupsUpdateId();
  const deleteGroupMutation = useDeleteApiVpnServerGroupsDeleteId();

  const servers = useMemo(() => {
    // Guard against a poisoned React Query cache (wrong shape under the same key).
    const safeBase = (baseServers ?? []).filter(
      (s) => s != null && typeof s.id === "number" && s.raw != null && typeof s.raw === "object",
    ) as MappedServer[];

    if (!serviceData) return safeBase;

    const normalized: Record<number, ServiceStatusDto> = {};
    for (const [key, value] of Object.entries(serviceData as Record<string, ServiceStatusDto>)) {
      const id = Number(key);
      if (!Number.isFinite(id) || value == null) continue;
      normalized[id] = value;
    }

    return safeBase.map((s) => {
      const ws = pickServiceDataEntry(normalized, s.id);
      if (!ws) return s;

      const onlineRaw = (ws as ServiceStatusDto & { isOnline?: boolean }).isOnline;
      const nextWsOnline = typeof onlineRaw === "boolean" ? onlineRaw : s.wsOnline;

      return {
        ...s,
        serviceStatus: wsStatusIsPresent(ws) ? coerceStatus(ws.status) : s.serviceStatus,
        errorMessage: ws.errorMessage !== undefined ? ws.errorMessage : s.errorMessage,
        nextRunTime:
          ws.nextRunTime !== undefined && ws.nextRunTime !== "" ? ws.nextRunTime : s.nextRunTime,
        wsCountConnectedClients:
          ws.countConnectedClients !== undefined ? ws.countConnectedClients : s.wsCountConnectedClients,
        wsCountSessions: ws.countSessions !== undefined ? ws.countSessions : s.wsCountSessions,
        wsOnline: nextWsOnline,
      };
    });
  }, [baseServers, serviceData]);

  const sections = useMemo(
    () => buildServerGroupSections(servers, groups),
    [servers, groups],
  );

  const addServersGroup = groups.find((g) => g.id === addServersGroupId);
  const addableServers = useMemo(() => {
    if (addServersGroupId == null) return [];
    const memberIds = new Set(addServersGroup?.serverIds ?? []);
    return servers
      .filter((s) => !memberIds.has(s.id))
      .map((s) => {
        const current = findGroupForServer(groups, s.id);
        return {
          id: s.id,
          name: s.raw.vpnServerResponses?.vpnServer?.serverName?.trim() || `Server ${s.id}`,
          currentGroupName: current?.name?.trim() || null,
        };
      });
  }, [addServersGroupId, addServersGroup?.serverIds, servers, groups]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this server?")) return;

    try {
      await deleteApiOpenVpnServersDeleteVpnServerId(id);
      queryClient.setQueryData<MappedServer[]>(V3_SERVERS_WITH_STATUS_KEY, (prev) =>
        (prev ?? []).filter((s) => s.id !== id),
      );
    } catch {
      // ignore
    }
  };

  const toggleCollapse = (key: string) => {
    setCollapsedMap((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsedGroups(next);
      return next;
    });
  };

  const expandAllGroups = () => {
    setCollapsedMap(() => {
      const next: CollapsedGroupsMap = {};
      for (const section of sections) {
        next[String(section.key)] = false;
      }
      saveCollapsedGroups(next);
      return next;
    });
  };

  const collapseAllGroups = () => {
    setCollapsedMap(() => {
      const next: CollapsedGroupsMap = {};
      for (const section of sections) {
        next[String(section.key)] = true;
      }
      saveCollapsedGroups(next);
      return next;
    });
  };

  const toggleDetailsHidden = () => {
    setDetailsHidden((prev) => {
      const next = !prev;
      saveServerDetailsHidden(next);
      return next;
    });
  };

  const toggleGroupAssignVisible = () => {
    setGroupAssignVisible((prev) => {
      const next = !prev;
      saveGroupAssignVisible(next);
      return next;
    });
  };

  const invalidateGroupsAndServers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() }),
      queryClient.invalidateQueries({ queryKey: V3_SERVERS_WITH_STATUS_KEY }),
    ]);
  };

  const addGroup = () => {
    setCreatingGroup(true);
    setNewGroupName("");
  };

  const cancelCreateGroup = () => {
    setCreatingGroup(false);
    setNewGroupName("");
  };

  const saveNewGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      const created = await createGroupMutation.mutateAsync({ data: { name } });
      const payload = created as { group?: { id?: number }; data?: { group?: { id?: number } } };
      const id = payload?.group?.id ?? payload?.data?.group?.id;
      await queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() });
      toast.success("Group created");
      setCreatingGroup(false);
      setNewGroupName("");
      if (typeof id === "number") {
        setCollapsedMap((prev) => {
          const next = { ...prev, [String(id)]: false };
          saveCollapsedGroups(next);
          return next;
        });
      }
    } catch {
      toast.error("Failed to create group");
    }
  };

  const commitRenameGroup = async (id: number, name: string) => {
    try {
      await renameGroupMutation.mutateAsync({ id, data: { name } });
      toast.success("Group renamed");
      setRenamingKey(null);
      await queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() });
    } catch {
      toast.error("Failed to rename group");
    }
  };

  const deleteGroup = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? Servers will become ungrouped.`)) return;
    try {
      await deleteGroupMutation.mutateAsync({ id });
      toast.success("Group deleted");
      await invalidateGroupsAndServers();
    } catch {
      toast.error("Failed to delete group");
    }
  };

  const assignServer = async (serverId: number, target: GroupAssignTarget, confirmMove = true) => {
    const from = findGroupForServer(groups, serverId);
    const serverName =
      servers.find((s) => s.id === serverId)?.raw.vpnServerResponses?.vpnServer?.serverName ??
      `Server ${serverId}`;
    if (confirmMove && from && typeof from.id === "number" && from.id !== target) {
      const targetLabel =
        target === UNGROUPED_GROUP_ID
          ? "Ungrouped"
          : groups.find((g) => g.id === target)?.name?.trim() || "this group";
      const ok = window.confirm(
        `"${serverName}" is in "${from.name?.trim() || `Group ${from.id}`}". Move it to ${targetLabel}?`,
      );
      if (!ok) return;
    }
    try {
      await assignServersToGroup({
        target,
        groups,
        allServerIds: servers.map((s) => s.id),
        addServerIds: [serverId],
      });
      toast.success("Server group updated");
      await invalidateGroupsAndServers();
    } catch {
      toast.error("Failed to update server group");
    }
  };

  const persistGroupOrder = async (ids: number[]) => {
    try {
      await putApiVpnServerGroupsReorder({
        items: ids.map((groupId, sortOrder) => ({ groupId, sortOrder })),
      });
      toast.success("Group order saved");
      await queryClient.invalidateQueries({ queryKey: getGetApiVpnServerGroupsGetAllQueryKey() });
    } catch {
      toast.error("Failed to save group order");
    }
  };

  const persistServerOrder = async (groupKey: string, ids: number[]) => {
    try {
      if (groupKey === UNGROUPED_GROUP_ID) {
        await putApiVpnServerGroupsUngroupedSetServers({ vpnServerIds: ids });
      } else {
        const id = Number(groupKey);
        if (!Number.isFinite(id)) return;
        await putApiVpnServerGroupsIdSetServers(id, { vpnServerIds: ids });
      }
      toast.success("Server order saved");
      await invalidateGroupsAndServers();
    } catch {
      toast.error("Failed to save server order");
    }
  };

  const clearActiveDrag = () => setActiveDrag(null);

  const onListDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const groupId = parseGroupDragId(id);
    if (groupId != null) {
      const name = sections.find((s) => s.key === groupId)?.name ?? "Group";
      setActiveDrag({ type: "group", name });
      return;
    }
    const server = parseServerDragId(id);
    if (!server) return;
    const mapped = servers.find((s) => s.id === server.serverId);
    const name =
      mapped?.raw.vpnServerResponses?.vpnServer?.serverName?.trim() || `Server ${server.serverId}`;
    setActiveDrag({ type: "server", name });
  };

  const onListDragEnd = (event: DragEndEvent) => {
    clearActiveDrag();
    if (!canAddServer) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeGroup = parseGroupDragId(String(active.id));
    const overGroup = parseGroupDragId(String(over.id));
    if (activeGroup != null && overGroup != null) {
      const namedIds = sections
        .filter((s) => typeof s.key === "number")
        .map((s) => s.key as number);
      const oldIndex = namedIds.indexOf(activeGroup);
      const newIndex = namedIds.indexOf(overGroup);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      void persistGroupOrder(arrayMove(namedIds, oldIndex, newIndex));
      return;
    }

    const activeServer = parseServerDragId(String(active.id));
    const overServer = parseServerDragId(String(over.id));
    if (activeServer && overServer && activeServer.groupKey === overServer.groupKey) {
      const section = sections.find((s) => String(s.key) === activeServer.groupKey);
      if (!section) return;
      const ids = section.servers.map((s) => s.id);
      const oldIndex = ids.indexOf(activeServer.serverId);
      const newIndex = ids.indexOf(overServer.serverId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      void persistServerOrder(activeServer.groupKey, arrayMove(ids, oldIndex, newIndex));
      return;
    }

    if (activeServer && overServer && activeServer.groupKey !== overServer.groupKey) {
      const targetSection = sections.find((s) => String(s.key) === overServer.groupKey);
      if (!targetSection) return;
      const ids = targetSection.servers
        .map((s) => s.id)
        .filter((id) => id !== activeServer.serverId);
      const insertAt = Math.max(0, ids.indexOf(overServer.serverId));
      ids.splice(insertAt, 0, activeServer.serverId);
      void persistServerOrder(overServer.groupKey, ids);
      return;
    }

    const overDropKey = parseGroupDropId(String(over.id));
    if (activeServer && overDropKey != null && overDropKey !== activeServer.groupKey) {
      void persistServerOrder(overDropKey, [
        ...(sections.find((s) => String(s.key) === overDropKey)?.servers.map((s) => s.id) ?? []).filter(
          (id) => id !== activeServer.serverId,
        ),
        activeServer.serverId,
      ]);
    }
  };

  const handleRefresh = () => {
    void Promise.all([loadServers(), groupsQuery.refetch()]);
  };

  const normalizedServiceControlsData: Record<number, ServiceStatusDto> = useMemo(() => {
    const hub = (serviceData ?? {}) as Record<number, ServiceStatusDto>;
    const acc: Record<number, ServiceStatusDto> = {};

    for (const s of servers) {
      const id = s.id;
      const ws = pickServiceDataEntry(hub, id);

      const base: ServiceStatusDto = {
        vpnServerId: id,
        countConnectedClients: s.wsCountConnectedClients ?? s.raw?.countConnectedClients,
        countSessions: s.wsCountSessions ?? s.raw?.countSessions,
        totalBytesIn: s.raw?.totalBytesIn,
        totalBytesOut: s.raw?.totalBytesOut,
      };

      if (serverRowIsDisabled(s.raw)) {
        acc[id] = {
          ...base,
          ...(ws ?? {}),
          status: NUMBER_0,
          nextRunTime: "N/A",
          errorMessage: null,
          countConnectedClients: ws?.countConnectedClients ?? base.countConnectedClients,
          countSessions: ws?.countSessions ?? base.countSessions,
        };
      } else if (ws) {
        acc[id] = {
          ...base,
          ...ws,
          status: wsStatusIsPresent(ws) ? coerceStatus(ws.status) : undefined,
          nextRunTime: ws.nextRunTime,
          errorMessage: ws.errorMessage ?? null,
          countConnectedClients: ws.countConnectedClients ?? base.countConnectedClients,
          countSessions: ws.countSessions ?? base.countSessions,
        };
      } else {
        acc[id] = base;
      }
    }

    return acc;
  }, [servers, serviceData]);

  const renderServer = (server: MappedServer, groupKey: string) => (
    <SortableServerRow
      key={server.id}
      id={serverDragId(groupKey, server.id)}
      groupKey={groupKey}
      disabled={!canAddServer}
      sortingDisabled={activeDrag?.type === "group"}
      className={`server-item clickable ${selectedServerId === server.id ? "selected" : ""}${
        serverRowIsDisabled(server.raw) ? " server-item--polling-off" : ""
      }${detailsHidden ? " server-item--compact" : ""}`}
      onClick={() =>
        navigate(buildServerSwitchPath(server.id, location.pathname, canAddServer))
      }
    >
      <ServerItem
        server={server.raw}
        vpnServerId={server.vpnServerId}
        serviceStatus={server.serviceStatus}
        errorMessage={server.errorMessage}
        nextRunTime={server.nextRunTime}
        wsOnline={server.wsOnline}
        wsCountConnectedClients={server.wsCountConnectedClients}
        wsCountSessions={server.wsCountSessions}
        isCurrentUserConnected={isUserConnectedToServer(connectedServerIds, server.id)}
        onView={(id) => {
          const target = buildServerSwitchPath(id, location.pathname, canAddServer);
          if (isMobile) navigate(target);
          else navigate(target, { replace: true });
        }}
        onEdit={(id) => navigate(`/servers/edit/${id}`)}
        onDelete={handleDelete}
        groups={groups
          .filter((g): g is typeof g & { id: number } => typeof g.id === "number")
          .map((g) => ({ id: g.id, name: g.name?.trim() || `Group ${g.id}` }))}
        currentGroupId={findGroupForServer(groups, server.id)?.id ?? server.groupId ?? null}
        onAssignGroup={
          canAddServer && groupAssignVisible
            ? (serverId, target) => {
                void assignServer(serverId, target);
              }
            : undefined
        }
      />
    </SortableServerRow>
  );

  return (
      <div>
        {onHideList && (
          <div className="server-list-hide-row">
            <button
              type="button"
              className="btn secondary server-list-hide-btn"
              onClick={onHideList}
              title="Hide server list"
              aria-label="Hide server list"
            >
              <span className="icon">{FaChevronLeft({ className: "icon" })}</span>
              Hide servers
            </button>
          </div>
        )}
        <div className="header-container">
          <div className="header-bar">
            <div className="left-buttons">
              {canAddServer && (
                  <button className="btn primary" onClick={() => navigate("/servers/add")}>
                    <span className="icon">{FaPlus({ className: "icon" })}</span>
                    Add Server
                  </button>
              )}

              {canAddServer && (
                  <button
                    className="btn secondary"
                    onClick={addGroup}
                    disabled={creatingGroup}
                  >
                    <span className="icon">{FaFolderPlus({ className: "icon" })}</span>
                    Add Group
                  </button>
              )}

              <button
                className="btn secondary"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-busy={refreshing}
              >
              <span className={`icon ${refreshing ? "icon-spin" : ""}`}>
                {FaSyncAlt({ className: `icon ${refreshing ? "icon-spin" : ""}` })}
              </span>
                Refresh
              </button>
            </div>

            {!loading && (servers.length > 0 || sections.length > 0) && (
              <div className="header-bar__meta">
                <span className="server-list-count">
                  {servers.length} {servers.length === 1 ? "server" : "servers"}
                </span>
                <div className="server-groups-toolbar" role="group" aria-label="List view controls">
                  {sections.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="server-groups-toolbar__btn"
                        onClick={expandAllGroups}
                        title="Expand all groups"
                        aria-label="Expand all groups"
                      >
                        {FaExpand({ className: "icon" })}
                      </button>
                      <button
                        type="button"
                        className="server-groups-toolbar__btn"
                        onClick={collapseAllGroups}
                        title="Collapse all groups"
                        aria-label="Collapse all groups"
                      >
                        {FaCompress({ className: "icon" })}
                      </button>
                    </>
                  )}
                  {canAddServer && (
                    <button
                      type="button"
                      className={`server-groups-toolbar__btn${groupAssignVisible ? " is-active" : ""}`}
                      onClick={toggleGroupAssignVisible}
                      title={
                        groupAssignVisible
                          ? "Hide group assignment on cards"
                          : "Show group assignment on cards"
                      }
                      aria-label={
                        groupAssignVisible
                          ? "Hide group assignment on cards"
                          : "Show group assignment on cards"
                      }
                      aria-pressed={groupAssignVisible}
                    >
                      {FaFolder({ className: "icon" })}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`server-groups-toolbar__btn${detailsHidden ? " is-active" : ""}`}
                    onClick={toggleDetailsHidden}
                    title={detailsHidden ? "Show server details" : "Compact list — names and status only"}
                    aria-label={detailsHidden ? "Show server details" : "Hide server details"}
                    aria-pressed={detailsHidden}
                  >
                    {detailsHidden
                      ? FaThList({ className: "icon" })
                      : FaList({ className: "icon" })}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
            <ul className="list">
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className="server-item server-item-skeleton">
                  <div className="server-item-content">
                    <div className="server-header">
                      <div className="server-info">
                        <span className="skeleton skeleton--w220-h20" />
                      </div>
                      <span className="skeleton skeleton--w70-h22" />
                    </div>
                    <div className="server-details">
                      <div className="detail-row">
                        <span className="skeleton skeleton--w14-h14" />
                        <span className="skeleton skeleton--w140-h14" />
                      </div>
                      <div className="detail-row">
                        <span className="skeleton skeleton--w14-h14" />
                        <span className="skeleton skeleton--w180-h14" />
                      </div>
                      <div className="detail-row">
                        <span className="skeleton skeleton--w14-h14" />
                        <span className="skeleton skeleton--w100-h14" />
                      </div>
                    </div>
                    <div className="detail-row">
                      <span className="skeleton skeleton--w14-h14" />
                      <span className="skeleton skeleton--w80-h24" />
                    </div>
                    <div className="server-actions">
                      <div className="server-actions-buttons">
                        <span className="skeleton skeleton--w70-h32" />
                        <span className="skeleton skeleton--w65-h32" />
                        <span className="skeleton skeleton--w75-h32" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
        ) : (
            <div className="server-groups">
              {creatingGroup && (
                <div className="server-group server-group--create">
                  <form
                    className="server-group-create"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveNewGroup();
                    }}
                  >
                    <input
                      className="input"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      maxLength={64}
                      placeholder="New group name"
                      aria-label="New group name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelCreateGroup();
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="btn primary"
                      disabled={!newGroupName.trim() || createGroupMutation.isPending}
                    >
                      Save
                    </button>
                    <button type="button" className="btn secondary" onClick={cancelCreateGroup}>
                      Cancel
                    </button>
                  </form>
                </div>
              )}
              {canAddServer && (groups.length > 0 || servers.length > 1) && (
                <p className="server-groups-hint">
                  Drag the grip to reorder groups and servers. Drop a server on another group to move it.
                </p>
              )}
              {servers.length > 0 || groups.length > 0 || creatingGroup ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={serverListCollisionDetection}
                    onDragStart={onListDragStart}
                    onDragCancel={clearActiveDrag}
                    onDragEnd={onListDragEnd}
                  >
                    <SortableContext
                      items={sections
                        .filter((s) => typeof s.key === "number")
                        .map((s) => groupDragId(s.key as number))}
                      strategy={verticalListSortingStrategy}
                    >
                  {sections.map((section) => {
                    const key = String(section.key);
                    const collapsed = Boolean(collapsedMap[key]);
                    const isNamed = typeof section.key === "number";
                    const serverIds = section.servers.map((s) => serverDragId(key, s.id));
                    const connectedCount = sumConnectedClients(section.servers);
                    const inner = (dragHandle?: React.ReactNode) => (
                      <>
                        <ServerGroupHeader
                          name={section.name}
                          count={section.servers.length}
                          connectedCount={connectedCount}
                          collapsed={collapsed}
                          canManage={canAddServer && isNamed}
                          renaming={renamingKey === key}
                          dragHandle={dragHandle}
                          onToggleCollapse={() => toggleCollapse(key)}
                          onStartRename={isNamed ? () => setRenamingKey(key) : undefined}
                          onCommitRename={
                            isNamed
                              ? (name) => void commitRenameGroup(section.key as number, name)
                              : undefined
                          }
                          onCancelRename={() => setRenamingKey(null)}
                          onAddServers={
                            isNamed ? () => setAddServersGroupId(section.key as number) : undefined
                          }
                          onDelete={
                            isNamed
                              ? () => void deleteGroup(section.key as number, section.name)
                              : undefined
                          }
                        />
                        {!collapsed && (
                          <SortableContext items={serverIds} strategy={verticalListSortingStrategy}>
                            <ul className="list server-group-list">
                              {section.servers.length > 0
                                ? section.servers.map((server) => renderServer(server, key))
                                : (
                                  <li className="server-group-empty">No servers in this group.</li>
                                )}
                            </ul>
                          </SortableContext>
                        )}
                      </>
                    );
                    if (!isNamed) {
                      return (
                        <DroppableGroupSection
                          key={key}
                          dropId={groupDropId(key)}
                          groupKey={key}
                          disabled={!canAddServer}
                          collapsed={collapsed}
                        >
                          {inner()}
                        </DroppableGroupSection>
                      );
                    }
                    return (
                      <SortableGroupSection
                        key={key}
                        id={groupDragId(section.key as number)}
                        dropId={groupDropId(key)}
                        groupKey={key}
                        disabled={!canAddServer}
                        sortingDisabled={activeDrag?.type === "server"}
                        collapsed={collapsed}
                      >
                        {(dragHandle) => inner(dragHandle)}
                      </SortableGroupSection>
                    );
                  })}
                    </SortableContext>
                    <DragOverlay dropAnimation={null}>
                      {activeDrag ? (
                        <div className={`server-drag-overlay server-drag-overlay--${activeDrag.type}`}>
                          {activeDrag.name}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
              ) : (
                  <p>No servers available.</p>
              )}
            </div>
        )}

        <ServiceControls
            serviceData={normalizedServiceControlsData}
            onRunNow={runServiceNow}
            onOpenDetails={() => navigate("/servers/status-stream-logs")}
            hubConnectionState={hubConnectionState}
            hubLastError={hubLastError}
        />

        <AddServersToGroupModal
          isOpen={addServersGroupId != null}
          groupName={addServersGroup?.name?.trim() || "this group"}
          servers={addableServers}
          busy={false}
          onClose={() => setAddServersGroupId(null)}
          onAdd={(serverId) => {
            if (addServersGroupId == null) return;
            void assignServer(serverId, addServersGroupId);
          }}
        />
      </div>
  );
};

export default ServerList;
