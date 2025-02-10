import React, { useState, useEffect } from "react";
import "../css/ServerList.css"; // Подключение стилей
import { FaSyncAlt, FaPlus, FaEdit, FaEye } from "react-icons/fa"; // Иконки
import { BsClock, BsHddNetwork } from "react-icons/bs";
import { IoIosSpeedometer } from "react-icons/io";
import { RiHardDrive2Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom"; 

// Интерфейсы API
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
    navigate(`/edit-server/${id}`);
  };

  const handleAddServer = () => {
    navigate("/add-server");
  };  

  return (
    <div>
      <div className="header-container">
        <div className="action-buttons">
          <button className="button add-button" onClick={handleAddServer}>
            <FaPlus className="icon" /> Add Server
          </button>
          <button className="button refresh-button" onClick={fetchData} disabled={loading}>
            <FaSyncAlt className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>
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
                <div className="detail-row">
                  <BsClock className="detail-icon" />
                  <span className="detail-label">Uptime :</span>
                  <span>{openVpnServerStatusLog?.upSince ? new Date(openVpnServerStatusLog.upSince).toLocaleString() : "N/A"}</span>
                </div>
                <div className="detail-row">
                  <RiHardDrive2Line className="detail-icon" />
                  <span className="detail-label">Version :</span>
                  <span>{openVpnServerStatusLog?.version || "Unknown"}</span>
                </div>
                <div className="detail-row">
                  <BsHddNetwork className="detail-icon" />
                  <span className="detail-label">Local IP :</span>
                  <span>{openVpnServerStatusLog?.serverLocalIp || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <BsHddNetwork className="detail-icon" />
                  <span className="detail-label">Remote IP :</span>
                  <span>{openVpnServerStatusLog?.serverRemoteIp || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <IoIosSpeedometer className="detail-icon" />
                  <span className="detail-label">Traffic IN :</span>
                  <span>{openVpnServerStatusLog?.bytesIn?.toLocaleString() || "0"} bytes</span>
                </div>
                <div className="detail-row">
                  <IoIosSpeedometer className="detail-icon" />
                  <span className="detail-label">Traffic OUT :</span>
                  <span>{openVpnServerStatusLog?.bytesOut?.toLocaleString() || "0"} bytes</span>
                </div>
                <div className="detail-row">
                  <BsHddNetwork className="detail-icon" />
                  <span className="detail-label">Management :</span>
                  <span>{openVpnServer.managementIp || "N/A"}:{openVpnServer.managementPort || "N/A"}</span>
                </div>
              </div>
              <div className="server-actions">
                <button className="button view-button" onClick={() => handleViewDetails(openVpnServer.id)}>
                  <FaEye className="icon" /> View Details
                </button>
                <button className="button edit-button" onClick={() => handleEditServer(openVpnServer.id)}>
                  <FaEdit className="icon" /> Edit
                </button>
              </div>
            </li>
          ))
        ) : (
          <p className="no-servers">No servers available</p>
        )}
      </ul>
    </div>
  );
};

export default ServerList;
