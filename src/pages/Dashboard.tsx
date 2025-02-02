import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaSync } from "react-icons/fa";
import { ServerInfo, ConnectedClient } from "../components/types";
import ServerInfoComponent from "../components/ServerInfo";
import ClientsTable from "../components/ClientsTable";

export function Dashboard() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(60);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [serverRes, clientsRes] = await Promise.all([
        axios.get<ServerInfo>("http://localhost:5580/OpenVpnServer/GetServerInfo"),
        axios.get<ConnectedClient[]>("http://localhost:5580/OpenVpnServer/GetAllConnectedClients"),
      ]);

      setServerInfo(serverRes.data);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (intervalId) clearInterval(intervalId); // Очищаем старый интервал перед установкой нового
    const id = setInterval(fetchData, refreshInterval * 1000);
    setIntervalId(id);
    return () => clearInterval(id);
  }, [refreshInterval]);

  return (
    <div>
      <h2>VPN Server:</h2>
      <ServerInfoComponent serverInfo={serverInfo} />
      
      <button className="btn secondary" onClick={fetchData} disabled={loading}>
        <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
      </button>

      <h2>VPN Clients:</h2>
      <ClientsTable clients={clients} />

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

export default Dashboard;
