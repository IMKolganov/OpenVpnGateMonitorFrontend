import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSync, FaArrowLeft } from "react-icons/fa";
import CertificatesData from "../components/CertificatesData";
import { CertificateStatus } from "../utils/types";
import "../css/Certificates.css";

const Certificates: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId: string }>();
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const navigate = useNavigate();
  return (
    <div className="content-wrapper wide-table">
      <h2>VPN Certificates & OVPN Files for Server {vpnServerId}</h2>
      <div className="header-containe">
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={() => navigate(`/server-details/${vpnServerId}`)}>
              <FaArrowLeft className="icon" /> Back
            </button>
            <button className="btn secondary" onClick={() => window.location.reload()} disabled={loadingAction}>
              <FaSync className={`icon ${loadingAction ? "icon-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>
      </div>
      <CertificatesData vpnServerId={vpnServerId || ""} />
    </div>
  );
};

export default Certificates;
