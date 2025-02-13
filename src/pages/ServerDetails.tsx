import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/ServerDetails.css";
import "../css/ServerList.css";
import { FaSync, FaArrowLeft, FaKey, FaTerminal } from "react-icons/fa";
import { BsClock, BsHddNetwork } from "react-icons/bs";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer } from "react-icons/io";
import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";

interface Config {
  apiBaseUrl: string;
}

export function ServerDetails() {
  const { id = "0" } = useParams<{ id?: string }>(); // Защита от undefined
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config | null>(null);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedData = useRef(false);

  useEffect(() => {
    console.log("🚀 Server ID from URL:", id);
    loadConfig();
  }, []);

  useEffect(() => {
    if (config?.apiBaseUrl && id !== "0" && !hasFetchedData.current) {
      fetchData();
      hasFetchedData.current = true;
    }
  }, [config, id, isLive]);

  const loadConfig = async () => {
    try {
      console.log("📡 Loading config...");
      const response = await fetch("/config.json");
      if (!response.ok) throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);

      const data: Config = await response.json();
      if (!data.apiBaseUrl) throw new Error("Config is missing 'apiBaseUrl'");

      console.log("✅ Config loaded:", data);
      setConfig(data);
    } catch (error) {
      console.error("❌ Failed to load configuration:", error);
      setError("Failed to load configuration. Please check the config file.");
    }
  };

  const fetchData = async () => {
    if (!config?.apiBaseUrl || id === "0") {
      console.warn("⚠ fetchData skipped: missing config or invalid id");
      setError("Configuration error: API base URL is missing or invalid server ID.");
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`🔄 Fetching data for server ID: ${id}`);

    try {
      const [serverRes, clientsRes] = await Promise.allSettled([
        axios.get(`${config.apiBaseUrl}/OpenVpnServers/GetServerWithStats/${id}`),
        axios.get(`${config.apiBaseUrl}/OpenVpnServers/GetAllConnectedClients/${id}`),
      ]);

      if (serverRes.status === "fulfilled") {
        console.log("✅ Server response:", serverRes.value.data);
        setServerInfo(serverRes.value.data || {});
      } else {
        console.error("❌ Server request failed:", serverRes.reason);
        setError("Failed to fetch server data.");
      }

      if (clientsRes.status === "fulfilled") {
        console.log("✅ Clients response:", clientsRes.value.data);
        setClients(clientsRes.value.data || []);
      } else {
        console.error("❌ Clients request failed:", clientsRes.reason);
        setError("Failed to fetch clients data.");
      }
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setError("Sorry, something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const toHumanReadableSize = (bytes: number): string => {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < sizes.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="content-wrapper wide-table">
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", paddingBottom: "25px" }}>
        <button className="btn secondary" onClick={() => navigate("/")}>
          <FaArrowLeft className="icon" /> Back
        </button>
        <button className="btn secondary" onClick={fetchData} disabled={loading}>
          <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
        </button>
        <button className="btn secondary" onClick={() => navigate(`/server-details/${id}/certificates`)}>
          <FaKey className="icon" /> Manage Certificates
        </button>
        <button className="btn secondary" onClick={() => navigate(`/server-details/${id}/console`)}>
          <FaTerminal className="icon" /> OpenVPN Console
        </button>

        <label className="square-toggle">
          <input type="checkbox" checked={isLive} onChange={() => setIsLive(!isLive)} />
          <span className="toggle-slider"></span>
          <span className="toggle-text">{isLive ? "Live" : "History"}</span>
        </label>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading server details...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button className="btn secondary" onClick={fetchData}>Retry</button>
        </div>
      ) : (
        <>
          {serverInfo?.openVpnServer ? (
            <div className="server-info">
              <div className="server-header">
                <div className="server-info">
                  <strong className="server-name">{serverInfo.openVpnServer.serverName}</strong>
                </div>
                <div className={`server-status ${serverInfo.openVpnServer.isOnline ? "status-online" : "status-offline"}`}>
                  {serverInfo.openVpnServer.isOnline ? "Online" : "Offline"}
                </div>
              </div>

              {serverInfo.openVpnServerStatusLog && (
                <div className="server-details">
                  <div className="detail-row"><BsClock className="detail-icon" /><span className="detail-label">Uptime:</span><span>{serverInfo.openVpnServerStatusLog?.upSince ? new Date(serverInfo.openVpnServerStatusLog.upSince).toLocaleString() : "N/A"}</span></div>
                  <div className="detail-row"><RiHardDrive2Line className="detail-icon" /><span className="detail-label">Version:</span><span>{serverInfo.openVpnServerStatusLog?.version || "Unknown"}</span></div>
                  <div className="detail-row"><BsHddNetwork className="detail-icon" /><span className="detail-label">Local IP:</span><span>{serverInfo.openVpnServerStatusLog?.serverLocalIp || "N/A"}</span></div>
                  <div className="detail-row"><BsHddNetwork className="detail-icon" /><span className="detail-label">Remote IP:</span><span>{serverInfo.openVpnServerStatusLog?.serverRemoteIp || "N/A"}</span></div>
                  <div className="detail-row"><IoIosSpeedometer className="detail-icon" /><span className="detail-label">Traffic IN:</span><span>{toHumanReadableSize(serverInfo.openVpnServerStatusLog?.bytesIn || 0)}</span></div>
                  <div className="detail-row"><IoIosSpeedometer className="detail-icon" /><span className="detail-label">Traffic OUT:</span><span>{toHumanReadableSize(serverInfo.openVpnServerStatusLog?.bytesOut || 0)}</span></div>
                  <div className="detail-row"><BsHddNetwork className="detail-icon" /><span className="detail-label">Session Id:</span><span>{serverInfo.openVpnServerStatusLog?.sessionId || "N/A"}</span></div>
                </div>
              )}
            </div>
          ) : (
            <p>No server information available.</p>
          )}

          <h3>VPN Clients ({isLive ? "Connected" : "Historical"})</h3>
          <ClientsTable clients={clients} />

          <h3>VPN Client Locations</h3>
          <VpnMap clients={clients} />
        </>
      )}
    </div>
  );
}

export default ServerDetails;
