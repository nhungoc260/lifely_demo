"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { URGENCY_LABEL } from "@/lib/labels";
import type { PublicOrg, PublicRequest } from "@/types/domain";

import { DEFAULT_CENTER } from "@/components/map/constants";

export interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  requests?: PublicRequest[];
  hospitals?: PublicOrg[];
  /** Vòng bán kính tìm kiếm quanh một điểm. */
  radius?: { center: [number, number]; km: number };
  /** Khu vực gần đúng của người dùng (không phải vị trí chính xác). */
  approxArea?: { center: [number, number]; km: number };
  /** Điểm đang chọn (location picker). */
  picked?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  onSelectRequest?: (id: string) => void;
  height?: number | string;
  scrollWheelZoom?: boolean;
  className?: string;
}

const COLORS = { CRITICAL: "#dc2626", URGENT: "#d97706", NORMAL: "#64748b" } as const;

function requestIcon(r: PublicRequest) {
  const c = COLORS[r.urgency];
  return L.divIcon({
    className: "",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<div style="width:38px;height:38px;border-radius:50%;background:${c};color:#fff;display:grid;place-items:center;font:600 12px/1 system-ui;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">${r.bloodType}</div>`,
  });
}

const hospitalIcon = L.divIcon({
  className: "",
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  html: `<div style="width:26px;height:26px;border-radius:8px;background:#0f172a;color:#fff;display:grid;place-items:center;font:700 15px/1 system-ui;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)" aria-label="Hospital">+</div>`,
});

const pickIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#9f1239;border:4px solid #fff;box-shadow:0 0 0 2px #9f1239,0 2px 8px rgba(0,0,0,.35)"></div>`,
});

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Chuỗi nguồn bản đồ, thử lần lượt từ trên xuống. Tất cả đều KHÔNG cần API key.
// (CARTO đã bỏ vì hiện yêu cầu API key: sẽ vẽ chữ "API KEY REQUIRED" lên bản đồ.)
const TILE_SOURCES = [
  { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: OSM_ATTR, subdomains: "abc" },
  { url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", attribution: OSM_ATTR + ' &copy; <a href="https://www.hotosm.org/">HOT</a>', subdomains: "abc" },
  { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles &copy; Esri", subdomains: "abc" },
];

/** Lớp nền bản đồ: dùng OpenStreetMap, tự chuyển sang nguồn kế tiếp nếu nhiều ô bản đồ liên tiếp tải lỗi. */
function BaseTiles() {
  const [idx, setIdx] = useState(0);
  const errors = useRef(0);
  const t = TILE_SOURCES[idx];
  return (
    <TileLayer
      key={idx}
      url={t.url}
      attribution={t.attribution}
      maxZoom={19}
      subdomains={t.subdomains}
      eventHandlers={{
        tileerror: () => {
          errors.current += 1;
          if (errors.current >= 3 && idx < TILE_SOURCES.length - 1) {
            errors.current = 0;
            setIdx(idx + 1);
          }
        },
      }}
    />
  );
}

function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
}

function Clicks({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapView({
  center = DEFAULT_CENTER, zoom = 12, requests = [], hospitals = [], radius, approxArea, picked, onPick,
  onSelectRequest, height = 420, scrollWheelZoom = true, className,
}: MapViewProps) {
  return (
    <div className={className} style={{ height }} role="region" aria-label="Bản đồ các yêu cầu khẩn cấp và bệnh viện">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={scrollWheelZoom} style={{ height: "100%", width: "100%", borderRadius: "1.25rem", zIndex: 0 }}>
        <BaseTiles />
        <Recenter center={center} zoom={zoom} />
        <Clicks onPick={onPick} />
        {radius && <Circle center={radius.center} radius={radius.km * 1000} pathOptions={{ color: "#9f1239", weight: 1.5, fillOpacity: 0.05, dashArray: "6 6" }} />}
        {approxArea && <Circle center={approxArea.center} radius={approxArea.km * 1000} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.12 }} />}
        {hospitals.map((h) => (
          <Marker key={h.id} position={[h.latitude, h.longitude]} icon={hospitalIcon}>
            <Popup><strong>{h.name}</strong><br />{h.address}{h.district ? `, ${h.district}` : ""}</Popup>
          </Marker>
        ))}
        {requests.map((r) => (
          <Marker key={r.id} position={[r.latitude, r.longitude]} icon={requestIcon(r)} eventHandlers={{ click: () => onSelectRequest?.(r.id) }}>
            <Popup>
              <strong>{URGENCY_LABEL[r.urgency]} · {r.bloodType}</strong><br />
              Cần {r.unitsNeeded} đơn vị<br />{r.hospitalName}<br />
              <a href={`/requests/${r.id}`}>Xem yêu cầu</a>
            </Popup>
          </Marker>
        ))}
        {picked && <Marker position={picked} icon={pickIcon} />}
      </MapContainer>
    </div>
  );
}
