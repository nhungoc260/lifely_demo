"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { MapViewProps } from "@/components/map/map-view";

const MapView = dynamic(() => import("@/components/map/map-view"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-72 w-full rounded-[1.25rem]" />,
});

export function MapContainerLazy(props: MapViewProps) {
  return <MapView {...props} />;
}
