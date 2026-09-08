import {
  putApiVpnServerGroupsIdSetServers,
  putApiVpnServerGroupsUngroupedSetServers,
} from "../api/orval/vpn-server-groups/vpn-server-groups";
import type { VpnServerGroupsDtoVpnServerGroupDto } from "../api/orval/model/vpnServerGroupsDtoVpnServerGroupDto";
import {
  UNGROUPED_GROUP_ID,
  nextMemberIdsForAssign,
  type GroupAssignTarget,
} from "./serverGroups";

export async function assignServersToGroup(options: {
  target: GroupAssignTarget;
  groups: VpnServerGroupsDtoVpnServerGroupDto[];
  allServerIds: number[];
  addServerIds: number[];
}): Promise<void> {
  const { target, groups, allServerIds, addServerIds } = options;
  const vpnServerIds = nextMemberIdsForAssign(groups, allServerIds, target, addServerIds);

  if (target === UNGROUPED_GROUP_ID) {
    await putApiVpnServerGroupsUngroupedSetServers({ vpnServerIds });
    return;
  }

  await putApiVpnServerGroupsIdSetServers(target, { vpnServerIds });
}
