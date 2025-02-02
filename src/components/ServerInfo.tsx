import React from "react";
import { ServerInfo } from "./types";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { formatBytes } from "./utils";

interface ServerInfoProps {
  serverInfo: ServerInfo | null;
}

const ServerInfoComponent: React.FC<ServerInfoProps> = ({ serverInfo }) => {
  if (!serverInfo) return <p>Loading server info...</p>;

  const infoItems = [
    {
      label: "Status",
      value: serverInfo.status === "CONNECTED" ? (
        <FaCheckCircle style={{ color: "green" }} />
      ) : (
        <FaTimesCircle style={{ color: "red" }} />
      ),
    },
    { label: "Clients", value: serverInfo.openVpnSummaryStats?.clientsCount ?? 0 },
    { label: "Total Bytes In", value: formatBytes(serverInfo.openVpnSummaryStats?.bytesIn ?? 0) },
    { label: "Total Bytes Out", value: formatBytes(serverInfo.openVpnSummaryStats?.bytesOut ?? 0) },
    {
      label: "Up Since",
      value: serverInfo.openVpnState?.upSince
        ? new Date(serverInfo.openVpnState.upSince).toLocaleString()
        : "N/A",
    },
    { label: "Local IP Address", value: serverInfo.openVpnState?.localIp || "N/A" },
    { label: "Remote IP Address", value: serverInfo.openVpnState?.remoteIp || "N/A" },
    { label: "OpenVPN Version", value: serverInfo.version || "Unknown" },
  ];

  return (
    <div className="server-info-container">
      {infoItems.map((item, index) => (
        <div key={index} className="server-info-item fade-in">
          <div className="label">{item.label}</div>
          <div className="divider"></div>
          <div className="value">{item.value}</div>
        </div>
      ))}
    </div>
  );
};

export default ServerInfoComponent;
