import React, { useState, useEffect } from "react";
import "../css/ServerList.css";
import { FaSyncAlt, FaPlus, FaEdit, FaEye, FaTrash } from "react-icons/fa";
import { BsClock, BsHddNetwork } from "react-icons/bs";
import { RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer } from "react-icons/io";
import { useNavigate } from "react-router-dom";

interface OpenVpnServer {
  id: number;
  serverName: string;
  managementIp: string;
  managementPort: number;
  login: string;
  password: string;
  isOnline: boolean;
  lastUpdate: string;
  createDate: string;
}

interface OpenVpnServerStatusLog {
  id: number;
  vpnServerId: number;
  sessionId: string;
  upSince: string;
  serverLocalIp: string;
  serverRemoteIp: string;
  bytesIn: number;
  bytesOut: number;
  version: string;
  lastUpdate: string;
  createDate: string;
}

interface OpenVpnServerInfoResponse {
  openVpnServer: OpenVpnServer;
  openVpnServerStatusLog?: OpenVpnServerStatusLog | null;
}

const ServerList: React.FC = () => {
  const [servers, setServers] = useState<OpenVpnServerInfoResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [config, setConfig] = useState<{ apiBaseUrl: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/config.json");
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error("Failed to load configuration:", error);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      fetchData();
    }
  }, [config]);

  const fetchData = async () => {
    if (!config) return;

    setLoading(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/OpenVpnServers/GetAllServers`);
      if (!response.ok) throw new Error("Failed to fetch servers");
      const data: OpenVpnServerInfoResponse[] = await response.json();
      setServers(data);
    } catch (error) {
      console.error("Error fetching servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id: number) => {
    navigate(`/server-details/${id}`);
  };

  const handleEditServer = (id: number) => {
    navigate(`/servers/edit/${id}`);
  };

  const handleDeleteServer = async (id: number) => {
    if (!config) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this server?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${config.apiBaseUrl}/OpenVpnServers/DeleteServer?vpnServerId=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete server");

      alert("Server deleted successfully!");
      setServers((prev) => prev.filter((server) => server.openVpnServer.id !== id));
    } catch (error) {
      console.error("Error deleting server:", error);
      alert("Failed to delete server.");
    }
  };

  const handleAddServer = () => {
    navigate("/servers/add");
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
    <div>
      <div className="header-container">
        <div className="action-buttons">
          <button className="btn primary" onClick={handleAddServer}>
            <FaPlus className="icon" /> Add Server
          </button>
          <button className="btn secondary" onClick={fetchData} disabled={loading}>
            <FaSyncAlt className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading servers...</p>
        </div>
      ) : (
        <ul className="list">
          {servers.length > 0 ? (
            servers.map(({ openVpnServer, openVpnServerStatusLog }) => (
              <li key={openVpnServer.id} className="server-item">
                <div className="server-header">
                  <div className="server-info">
                    <strong className="server-name">{openVpnServer.serverName}</strong>
                    <div className={`server-status ${openVpnServer.isOnline ? "status-online" : "status-offline"}`}>
                      {openVpnServer.isOnline ? "Online" : "Offline"}
                    </div>
                  </div>
                </div>

                <div className="server-details">
                  <div className="detail-row"><BsClock className="detail-icon" /><span className="detail-label">Uptime:</span><span>{openVpnServerStatusLog?.upSince ? new Date(openVpnServerStatusLog.upSince).toLocaleString() : "N/A"}</span></div>
                  <div className="detail-row"><RiHardDrive2Line className="detail-icon" /><span className="detail-label">Version:</span><span>{openVpnServerStatusLog?.version || "Unknown"}</span></div>
                  <div className="detail-row"><BsHddNetwork className="detail-icon" /><span className="detail-label">Local IP:</span><span>{openVpnServerStatusLog?.serverLocalIp || "N/A"}</span></div>
                  <div className="detail-row"><BsHddNetwork className="detail-icon" /><span className="detail-label">Remote IP:</span><span>{openVpnServerStatusLog?.serverRemoteIp || "N/A"}</span></div>
                  <div className="detail-row"><IoIosSpeedometer className="detail-icon" /><span className="detail-label">Traffic IN:</span><span>{toHumanReadableSize(openVpnServerStatusLog?.bytesIn || 0)}</span></div>
                  <div className="detail-row"><IoIosSpeedometer className="detail-icon" /><span className="detail-label">Traffic OUT:</span><span>{toHumanReadableSize(openVpnServerStatusLog?.bytesOut || 0)}</span></div>
                </div>

                <div className="server-actions">
                  <button className="btn normal" onClick={() => handleViewDetails(openVpnServer.id)}>
                    <FaEye className="icon" /> View
                  </button>
                  <button className="btn warning" onClick={() => handleEditServer(openVpnServer.id)}>
                    <FaEdit className="icon" /> Edit
                  </button>
                  <button className="btn danger" disabled={openVpnServer.isOnline} onClick={() => handleDeleteServer(openVpnServer.id)}>
                    <FaTrash className="icon" /> Delete
                  </button>
                </div>
              </li>
            ))
          ) : (
            <p className="no-servers">No servers available</p>
          )}
        </ul>
      )}
    </div>
  );
};

export default ServerList;
