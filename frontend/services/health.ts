import { apiFetch } from "@/lib/api";
import type { HealthStatus } from "@/types/api";

export const getHealth = () => apiFetch<HealthStatus>("/api/health");
