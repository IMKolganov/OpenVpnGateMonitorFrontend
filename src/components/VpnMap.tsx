import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ConnectedClient } from "./types";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

// Объявляем иконку для маркеров
const defaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

interface VpnMapProps {
  clients: ConnectedClient[];
}

const VpnMap: React.FC<VpnMapProps> = ({ clients }) => {
  const defaultCenter: [number, number] = [45, 37];

  return (
    <div style={{ height: "600px", width: "100%", marginTop: "20px" }}>
      <MapContainer style={{ height: "100%", width: "100%" }}>
        <ChangeView center={defaultCenter} zoom={4} />
        
        {/* Подключаем OpenStreetMap */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Маркеры клиентов */}
        {clients
          .filter((client) => client.latitude && client.longitude)
          .map((client) => (
            <Marker
              key={client.id}
              position={[client.latitude, client.longitude]}
              icon={defaultIcon}
            >
              <Popup>
                <strong>{client.commonName}</strong> <br />
                {client.city}, {client.country} <br />
                {client.remoteIp} <br />
                📥 {client.bytesReceived} Bytes | 📤 {client.bytesSent} Bytes
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};

export default VpnMap;
