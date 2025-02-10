import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

import { ServerInfo, ConnectedClient } from "../components/types";
import ServerInfoComponent from "../components/ServerInfo";

interface Config {
  apiBaseUrl: string;
  webSocketUrl: string;
  defaultRefreshInterval: number;
}

export function Servers() {
  const [config, setConfig] = useState<Config | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(
    Number(Cookies.get("refreshInterval")) || 60
  );

  return (
    <div className="content-wrapper wide-table">
      <h2>VPN Servers:</h2>
      <ServerInfoComponent />
    </div>
  );
}

export default Servers;
