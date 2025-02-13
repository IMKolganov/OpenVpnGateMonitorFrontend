import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import CertificatesTable from "../components/CertificatesTable";
import { FaSync } from "react-icons/fa";

interface Config {
  apiBaseUrl: string;
}

enum CertificateStatus {
  Active = 0,
  Revoked = 1,
  Expired = 2,
  Unknown = 3,
}

interface Certificate {
  commonName: string;
  status: number;
  expiryDate: string;
  revokeDate?: string | null;
  serialNumber: string;
}

const CertificatesPage: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId: string }>(); // Получаем ID сервера из URL
  const [config, setConfig] = useState<Config | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);
  const [newCommonName, setNewCommonName] = useState<string>("");

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config && vpnServerId) {
      fetchCertificates();
    }
  }, [config, selectedStatus, vpnServerId]);

  const loadConfig = async () => {
    try {
      const response = await fetch("/config.json");
      const data: Config = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
  };

  const fetchCertificates = useCallback(async () => {
    if (!config || !vpnServerId) return;
    setLoading(true);
    setError(null);

    try {
      const url = selectedStatus !== null
        ? `${config.apiBaseUrl}/OpenVpnServerCerts/GetAllVpnServerCertificatesByStatus/${vpnServerId}?certificateStatus=${selectedStatus}`
        : `${config.apiBaseUrl}/OpenVpnServerCerts/GetAllVpnServerCertificates/${vpnServerId}`;

      const response = await axios.get<Certificate[]>(url);
      setCertificates(response.data);
    } catch (error) {
      console.error("Error fetching certificates", error);
      setError("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, [config, selectedStatus, vpnServerId]);

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value ? Number(event.target.value) as CertificateStatus : null);
  };

  const handleAddCertificate = async () => {
    if (!newCommonName.trim()) return alert("Please enter a common name.");
    if (!config || !vpnServerId) return;

    try {
      await axios.get(`${config.apiBaseUrl}/OpenVpnServerCerts/AddServerCertificate/${vpnServerId}?cnName=${newCommonName}`);
      setNewCommonName("");
      fetchCertificates();
    } catch (error) {
      console.error("Failed to add certificate", error);
      alert("Error adding certificate.");
    }
  };

  return (
    <div className="content-wrapper wide-table">
      <h2>VPN Certificates for Server {vpnServerId}</h2>
      <div className="action-buttons">
        <button className="btn secondary" onClick={fetchCertificates} disabled={loading}>
          <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
        </button>

        <select value={selectedStatus ?? ""} onChange={handleStatusChange} className="btn secondary">
          <option value="">All</option>
          <option value={CertificateStatus.Active}>Active</option>
          <option value={CertificateStatus.Revoked}>Revoked</option>
          <option value={CertificateStatus.Expired}>Expired</option>
          <option value={CertificateStatus.Unknown}>Unknown</option>
        </select>
      </div>

      <div className="add-certificate">
        <input
          type="text"
          placeholder="Enter Common Name"
          value={newCommonName}
          onChange={(e) => setNewCommonName(e.target.value)}
          className="input"
        />
        <button className="btn primary" onClick={handleAddCertificate}>Add Certificate</button>
      </div>

      {error && <p className="error">{error}</p>}

      <CertificatesTable certificates={certificates} vpnServerId={vpnServerId || ""} onRevoke={fetchCertificates} />
    </div>
  );
};

export default CertificatesPage;
