"use client";
import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { Mine } from "@/lib/types";
import { useData } from "./data-context";
import { latest } from "@/lib/intelligence";
export default function MineMap({ mines }: { mines: Mine[] }) {
  const [failed, setFailed] = useState(false);
  const { data } = useData();
  return (
    <div className="map-wrapper">
      {failed && (
        <p className="map-warning">
          Map tiles are unavailable. Use the mine list below.
        </p>
      )}
      <MapContainer
        center={[22.7, 83.5]}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{ tileerror: () => setFailed(true) }}
        />
        {mines.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={9}
            pathOptions={{
              color: "#fff",
              weight: 3,
              fillColor: "#118978",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <strong>{m.name}</strong>
              <p>
                {m.subsidiary}
                <br />
                {m.district}, {m.state}
              </p>
              <p>
                Latest production:{" "}
                {latest(data, m.id, "production")?.fact?.value.toFixed(2) ??
                  "disputed / unavailable"}{" "}
                Mt
                <br />
                Unresolved conflicts:{" "}
                {
                  data.conflicts.filter(
                    (c) => c.mineId === m.id && !c.selectedFactId,
                  ).length
                }
              </p>
              <Link href={`/twins?mine=${m.id}`}>View Digital Mine Twin →</Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
