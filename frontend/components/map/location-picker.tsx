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
    if (!("geolocation" in navigator)) return toast.error("Your browser does not support location.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setCenter([p.coords.latitude, p.coords.longitude]); onChange(p.coords.latitude, p.coords.longitude); },
      () => toast.error("We could not get your location. You can pick it on the map instead."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1"><MapSearch onFound={(lat, lng) => setCenter([lat, lng])} /></div>
        <Button type="button" variant="outline" onClick={useMyLocation}><LocateFixed /> Use my location</Button>
      </div>
      <MapContainerLazy center={center} zoom={latitude != null ? 14 : 12} hospitals={hospitals} picked={latitude != null && longitude != null ? [latitude, longitude] : null} onPick={(lat, lng) => onChange(lat, lng)} height={height} />
      <p className="text-xs text-muted-foreground">
        {latitude != null && longitude != null ? `Selected: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. ` : "Click the map to place a pin. "}
        {help}
      </p>
    </div>
  );
}
