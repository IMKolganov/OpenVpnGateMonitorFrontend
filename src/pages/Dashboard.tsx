import React, { useEffect, useState } from "react";
import axios from "axios";
import { DataTable } from "../components/DataTable";
import { FaSync, FaExclamationCircle, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

interface OpenVpnServerInfo {
  vpnMode: string;
  status: string;
  pingable: boolean;
  clients: number;
  totalBytesIn: number;
  totalBytesOut: number;
  upSince: string;
  localIpAddress: string;
}

interface OpenVpnUserStatistic {
  id: number;
  sessionId: string;
  commonName: string;
  realAddress: string;
  bytesReceived: number;
  bytesSent: number;
  connectedSince: string;
  lastUpdated: string;
}

interface OpenVpnServerFullInfo {
  openVpnServerInfo: OpenVpnServerInfo;
  openVpnUserStatistics: OpenVpnUserStatistic[];
}

export function Dashboard() {
  const [serverInfo, setServerInfo] = useState<OpenVpnServerInfo | null>(null);
  const [servers, setServers] = useState<OpenVpnUserStatistic[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(60);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const fetchData = () => {
    setLoading(true);
    axios
      .get<OpenVpnServerFullInfo>("http://localhost:5580/OpenVpnServer/servers")
      .then((response) => {
        setTimeout(() => {
          setServerInfo(response.data.openVpnServerInfo);
          setServers(response.data.openVpnUserStatistics || []);
          setError(null);
          setLoading(false);
        }, 500); // Добавляем небольшую задержку для плавности
      })
      .catch(() => {
        setError("Failed to fetch data");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, refreshInterval * 1000);
    setIntervalId(id);
    return () => clearInterval(id);
  }, [refreshInterval]);

  return (
    <div>
      <h2>VPN Server Overview</h2>

      {serverInfo && (
        <div className="server-info-container">
          {[
            { label: "VPN Mode", value: serverInfo.vpnMode },
            {
              label: "Status",
              value: serverInfo.status === "CONNECTED" ? (
                <FaCheckCircle style={{ color: "green" }} />
              ) : (
                <FaTimesCircle style={{ color: "red" }} />
              ),
            },
            { label: "Pingable", value: serverInfo.pingable ? "Yes" : "No" },
            { label: "Clients", value: serverInfo.clients },
            { label: "Total Bytes In", value: formatBytes(serverInfo.totalBytesIn) },
            { label: "Total Bytes Out", value: formatBytes(serverInfo.totalBytesOut) },
            { label: "Up Since", value: new Date(serverInfo.upSince).toLocaleString() },
            { label: "Local IP Address", value: serverInfo.localIpAddress },
          ].map((item, index) => (
            <div key={index} className="server-info-item fade-in">
              <div className="label">{item.label}</div>
              <div className="divider"></div>
              <div className="value">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="button-group">
        <button className="btn secondary" onClick={fetchData} disabled={loading}>
          <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div style={{ position: "relative" }}>
        {loading && (
          <div className="loading-overlay">
            <img src="/loading.gif" alt="Loading..." width={50} height={50} />
          </div>
        )}
        <table border={1} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Common Name</th>
              <th>Real Address</th>
              <th>Bytes Received</th>
              <th>Bytes Sent</th>
              <th>Connected Since</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {servers.length > 0 ? (
              servers.map((server) => (
                <tr key={server.id} className="fade-in">
                  <td>{server.id}</td>
                  <td>{server.commonName}</td>
                  <td>{server.realAddress}</td>
                  <td>{formatBytes(server.bytesReceived)}</td>
                  <td>{formatBytes(server.bytesSent)}</td>
                  <td>{new Date(server.connectedSince).toLocaleString()}</td>
                  <td>{new Date(server.lastUpdated).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center" }}>📭 No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "10px" }}>
        <label>
          Auto-refresh every (seconds):&nbsp;
          <input
            type="number"
            className="input-number"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Math.max(5, Number(e.target.value)))}
            min="5"
          />
        </label>
      </div>
    </div>
  );
}

const formatBytes = (bytes: number): string => {
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  while (bytes >= 1024 && i < sizes.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${sizes[i]}`;
};

export default Dashboard;
