export interface ClickStatistic {
  ipAddress: string;
  userAgent: string;
  clickedAt: Date | string;
}

export interface DetailedStatistic {
  clickedAt: Date | string;
  ipAddress: string;
  userAgent: string;
}

export interface StatsData {
  url: {
    originalUrl: string;
    shortCode: string;
    createdAt: Date | string;
    clickCount: number;
  };
  statistics: DetailedStatistic[];
}

export interface AnalyticsData {
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  lastFiveIPs: string[];
  createdAt: Date | string;
}

export interface SummaryData {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksLast24h: number;
  createdAt: Date | string;
}
