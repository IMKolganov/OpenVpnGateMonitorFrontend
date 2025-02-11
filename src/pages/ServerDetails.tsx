import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/ServerDetails.css";
import { FaSync, FaArrowLeft } from "react-icons/fa";
import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import ServerInfoComponent from "../components/ServerInfo";

interface Config {
  apiBaseUrl: string;
}

export function ServerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config | null>(null);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      fetchData();
    }
  }, [config, isLive]);

  const loadConfig = async () => {
    try {
      const response = await fetch("/config.json");
      const data: Config = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
  };

  const fetchData = async () => {
    if (!config || !id) return;
    setLoading(true);

    try {
      if (isLive) {
        const [serverRes, clientsRes] = await Promise.all([
          axios.get(`${config.apiBaseUrl}/OpenVpnServers/GetServerInfo?serverId=${id}`),
          axios.get(`${config.apiBaseUrl}/OpenVpnServers/GetAllConnectedClients?serverId=${id}`),
        ]);

        setServerInfo(serverRes.data);
        setClients(clientsRes.data || []);
      } else {
        const response = await axios.get(`${config.apiBaseUrl}/OpenVpnServers/GetAllHistoryClients?serverId=${id}`);
        setClients(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper wide-table">

    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>

        <button className="btn secondary" onClick={() => navigate("/")}>
            <FaArrowLeft className="icon" /> Back
        </button>
        <button className="btn secondary" onClick={fetchData} disabled={loading}>
            <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
        </button>

        <label className="square-toggle">
            <input type="checkbox" checked={isLive} onChange={() => setIsLive(!isLive)} />
            <span className="toggle-slider"></span>
            <span className="toggle-text">{isLive ? "Live" : "History"}</span>
        </label>

    </div>

      <h3>VPN Clients ({isLive ? "Connected" : "Historical"})</h3>
      <ClientsTable clients={clients} />

      <h3>VPN Client Locations</h3>
      <VpnMap clients={clients} />
    </div>
  );
}

export default ServerDetails;
