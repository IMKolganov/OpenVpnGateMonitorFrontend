import React, { useState, useEffect } from "react";
import "../css/ServerList.css"; // Подключение стилей
import { FaSyncAlt, FaPlus, FaEdit, FaEye } from "react-icons/fa"; // Иконки
import { AiFillCheckCircle, AiFillCloseCircle } from "react-icons/ai";
import { FaServer } from "react-icons/fa";
import { BsClock, BsHddNetwork } from "react-icons/bs";
import { IoIosSpeedometer } from "react-icons/io";
import { RiHardDrive2Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom"; 

interface Server {
  id: string;
  name: string;
  status: boolean;
  upSince: string;
  version: string;
  serverLocalIp: string;
  serverRemoteIp: string;
  bytesIn: number;
  bytesOut: number;
}

const ServerList: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [config, setConfig] = useState<{ apiBaseUrl: string } | null>(null);

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
      const data = await response.json();
      setServers(data);
    } catch (error) {
      console.error("Error fetching servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    // Логика перехода на страницу деталей
    console.log(`View details for server with ID: ${id}`);
  };

  const handleEditServer = (id: string) => {
    // Логика перехода на страницу редактирования
    console.log(`Edit server with ID: ${id}`);
  };
  const navigate = useNavigate(); 

  const handleAddServer = () => {
    navigate("/add-server"); // Переход на страницу добавления сервера
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
          servers.map((server) => (
            <li key={server.id} className="server-item">
              <div className="server-header">
                <div className="server-icon-container">
                  <FaServer className="server-icon" />
                </div>
                <div className="server-info">
                  <strong className="server-name">{server.name}</strong>
                  <div className={`server-status ${server.status ? "status-online" : "status-offline"}`}>
                    {server.status ? "Online" : "Offline"}
                  </div>
                </div>
              </div>
              <div className="server-details">
                <div className="detail-row">
                  <BsClock className="detail-icon" />
                  <span className="detail-label">Uptime :</span>
                  <span>{server.upSince ? new Date(server.upSince).toLocaleString() : "N/A"}</span>
                </div>
                <div className="detail-row">
                  <RiHardDrive2Line className="detail-icon" />
                  <span className="detail-label">Version :</span>
                  <span>{server.version || "Unknown"}</span>
                </div>
                <div className="detail-row">
                  <BsHddNetwork className="detail-icon" />
                  <span className="detail-label">Local IP :</span>
                  <span>{server.serverLocalIp || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <BsHddNetwork className="detail-icon" />
                  <span className="detail-label">Remote IP :</span>
                  <span>{server.serverRemoteIp || "N/A"}</span>
                </div>
                <div className="detail-row">
                  <IoIosSpeedometer className="detail-icon" />
                  <span className="detail-label">Traffic IN :</span>
                  <span>{server.bytesIn} bytes</span>
                </div>
                <div className="detail-row">
                  <IoIosSpeedometer className="detail-icon" />
                  <span className="detail-label">Traffic OUT :</span>
                  <span>{server.bytesOut} bytes</span>
                </div>
              </div>
              <div className="server-actions">
                <button className="button view-button" onClick={() => handleViewDetails(server.id)}>
                  <FaEye className="icon" /> View Details
                </button>
                <button className="button edit-button" onClick={() => handleEditServer(server.id)}>
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
