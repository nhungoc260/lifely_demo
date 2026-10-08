"use client";

import { LocateFixed } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DEFAULT_CENTER } from "@/components/map/constants";
import { MapContainerLazy } from "@/components/map/map-dynamic";
import { MapSearch } from "@/components/map/map-search";
import { Button } from "@/components/ui/button";
import type { PublicOrg } from "@/types/domain";

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  hospitals?: PublicOrg[];
  height?: number;
  help?: string;
}

/** Chọn vị trí trên bản đồ OpenStreetMap: bấm vào bản đồ, tìm địa điểm hoặc dùng vị trí hiện tại. */
export function LocationPicker({ latitude, longitude, onChange, hospitals, height = 300, help }: Props) {
  const [center, setCenter] = useState<[number, number]>(latitude != null && longitude != null ? [latitude, longitude] : DEFAULT_CENTER);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return toast.error("Trình duyệt của bạn không hỗ trợ định vị.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCenter([p.coords.latitude, p.coords.longitude]); onChange(p.coords.latitude, p.coords.longitude); },
      () => toast.error("Không lấy được vị trí của bạn. Bạn có thể chọn trên bản đồ."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1"><MapSearch onFound={(lat, lng) => setCenter([lat, lng])} /></div>
        <Button type="button" variant="outline" onClick={useMyLocation}><LocateFixed /> Dùng vị trí của tôi</Button>
      </div>
      <MapContainerLazy center={center} zoom={latitude != null ? 14 : 12} hospitals={hospitals} picked={latitude != null && longitude != null ? [latitude, longitude] : null} onPick={(lat, lng) => onChange(lat, lng)} height={height} />
      <p className="text-xs text-muted-foreground">
        {latitude != null && longitude != null ? `Đã chọn: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}.` : "Bấm vào bản đồ để đặt ghim."}
        {help}
      </p>
    </div>
  );
}
