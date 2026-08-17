export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  database?: 'up' | 'down';
}
