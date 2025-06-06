export interface ClickStatistics {
  id: string;
  shortCode: string;
  clickedAt: Date;
  ipAddress: string;
  userAgent?: string | null;
}
