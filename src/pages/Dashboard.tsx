import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaSync, FaExclamationCircle, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

interface OpenVpnState {
  upSince: string; 
  connected: boolean;
  success: boolean;
  localIp: string;
  remoteIp: string;
}

interface OpenVpnSummaryStats {
  clientsCount: number;
  bytesIn: number;
  bytesOut: number;
}

interface ServerInfo {
  status: string;
  openVpnState?: OpenVpnState;
  openVpnSummaryStats?: OpenVpnSummaryStats;
  version: string;
}


interface ConnectedClient {
  id: number;
  username: string;
  sessionId: string;
  commonName: string;
  remoteIp: string;
  localIp: string;
  bytesReceived: number;
  bytesSent: number;
  connectedSince: string;
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
}

export function Dashboard() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(60);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const serverResponse = await axios.get<ServerInfo>("http://localhost:5580/OpenVpnServer/GetServerInfo");
      setServerInfo(serverResponse.data);
      setError(null);
    } catch (error) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }

    try {
      const clientsResponse = await axios.get<ConnectedClient[]>("http://localhost:5580/OpenVpnServer/GetAllConnectedClients");
      setClients(clientsResponse.data || []);
      
      setError(null);
    } catch (error) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, refreshInterval * 1000);
    setIntervalId(id);
    return () => clearInterval(id);
  }, [refreshInterval]);

  return (
    <div>
      <h2>VPN Server:</h2>

      {serverInfo && (
        <div className="server-info-container">
          {[
            {
              label: "Status",
              value: serverInfo.status === "CONNECTED" ? (
                <FaCheckCircle style={{ color: "green" }} />
              ) : (
                <FaTimesCircle style={{ color: "red" }} />
              ),
            },
            { label: "Clients", value: serverInfo.openVpnSummaryStats?.clientsCount },
            { label: "Total Bytes In", value: formatBytes(serverInfo.openVpnSummaryStats?.bytesIn) },
            { label: "Total Bytes Out", value: formatBytes(serverInfo.openVpnSummaryStats?.bytesOut) },
            { label: "Up Since", value: new Date(serverInfo.upSince).toLocaleString() },
            { label: "Local IP Address", value: serverInfo.localIpAddress },
            // { label: "OpenVPN Version", value: serverInfo.version },
          ].map((item, index) => (
            <div key={index} className="server-info-item fade-in">
              <div className="label">{item.label}</div>
              <div className="divider"></div>
              <div className="value">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <h2>VPN Clients:</h2>

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
              {/* <th>User Name</th> */}
              <th>Common Name</th>
              <th>Remote Address</th>
              <th>Local Address</th>
              <th>Bytes Received</th>
              <th>Bytes Sent</th>
              <th>Connected Since</th>
              <th>Country</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {clients.length > 0 ? (
              clients.map((client) => (
                <tr key={client.id} className="fade-in">
                  <td>{client.id}</td>
                  {/* <td>{client.username}</td> */}
                  <td>{client.commonName}</td>
                  <td>{client.remoteIp}</td>
                  <td>{client.localIp}</td>
                  <td>{formatBytes(client.bytesReceived)}</td>
                  <td>{formatBytes(client.bytesSent)}</td>
                  <td>{new Date(client.connectedSince).toLocaleString()}</td>
                  <td>{client.country} {client.region} {client.city} {client.latitude} {client.longitude}</td>
                  <td>{new Date(client.lastUpdated).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={14} style={{ textAlign: "center" }}>📭 No connected clients</td>
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

const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) {
    return "0 Bytes";
  }
  
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  while (bytes >= 1024 && i < sizes.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${sizes[i]}`;
};


export default Dashboard;
