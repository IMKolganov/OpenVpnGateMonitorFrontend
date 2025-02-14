import React, { useEffect, useState, useCallback } from "react";
import { GridColDef } from "@mui/x-data-grid";
import axios from "axios";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import { Config, Certificate, CertificatesTableProps } from "../utils/types";

const renderStatus = (status: Certificate["status"]) => {
  switch (status) {
    case 0: return "✅ Active";
    case 1: return "❌ Revoked";
    case 2: return "⌛ Expired";
    default: return "❓ Unknown";
  }
};

const CertificatesTable: React.FC<CertificatesTableProps> = ({ certificates, vpnServerId, onRevoke }) => {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch("/config.json");
      const data: Config = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to load configuration:", error);
    }
  };

  const handleRevoke = useCallback(async (commonName: string) => {
    if (!window.confirm(`Are you sure you want to revoke certificate for ${commonName}?`)) return;

    try {
      await axios.get(`/api/OpenVpnServerCerts/RevokeCertificate/${vpnServerId}?cnName=${commonName}`);
      onRevoke();
    } catch (error) {
      console.error("Failed to revoke certificate", error);
      alert("Error revoking certificate.");
    }
  }, [vpnServerId, onRevoke]);

  const rows = certificates.map((cert, index) => ({
    id: index + 1,
    commonName: cert.commonName,
    statusText: renderStatus(cert.status),
    expiryDate: new Date(cert.expiryDate).toLocaleDateString(),
    revokeDate: cert.revokeDate ? new Date(cert.revokeDate).toLocaleDateString() : "—",
    serialNumber: cert.serialNumber,
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "statusText", headerName: "Status", flex: 1 },
    { field: "expiryDate", headerName: "Expiry Date", flex: 1 },
    { field: "revokeDate", headerName: "Revoke Date", flex: 1 },
    { field: "serialNumber", headerName: "Serial Number", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      renderCell: (params) => {
        if (params.row.statusText !== "✅ Active") {
          return <span style={{ color: "gray" }}>No actions</span>;
        }

        return (
          <button className="btn danger" onClick={() => handleRevoke(params.row.commonName)}>
            Revoke
          </button>
        );
      },
    },
  ];

  return (
    <CustomThemeProvider>
      <div className="cert-table-container">
        <StyledDataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 20, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableColumnFilter
          disableColumnMenu
        />
      </div>
    </CustomThemeProvider>
  );
};

export default CertificatesTable;
