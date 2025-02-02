export interface OpenVpnState {
    upSince: string;
    connected: boolean;
    success: boolean;
    localIp: string;
    remoteIp: string;
  }
  
  export interface OpenVpnSummaryStats {
    clientsCount: number;
    bytesIn: number;
    bytesOut: number;
  }
  
  export interface ServerInfo {
    status: string;
    openVpnState?: OpenVpnState;
    openVpnSummaryStats?: OpenVpnSummaryStats;
    version: string;
  }
  
  export interface ConnectedClient {
    id: number;
    username: string;
    sessionId: string;
    commonName: string;
    remoteIp: string;
    localIp: string;
    bytesReceived: number;
    bytesSent: number;
    connectedSince: string;
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    lastUpdated: string;
  }
  