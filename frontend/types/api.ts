/** Khớp với ApiResponse / ApiError ở backend (xem mục 74 của đặc tả). */
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  code: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface HealthStatus {
  status: "UP";
  service: string;
  timestamp: string;
  database: {
    status: "UP";
    migrationVersion: string | null;
  };
}
