export interface TestApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface TestShortUrlData {
  id: string;
  originalUrl: string;
  shortCode: string;
  alias?: string;
  shortUrl: string;
  clickCount: number;
  createdAt: Date;
  expiresAt?: Date;
}

export interface TestUrlInfoData {
  originalUrl: string;
  createdAt: Date;
  clickCount: number;
}

export interface TestAnalyticsData {
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  lastFiveIPs: string[];
  createdAt: Date;
}

export interface TestStatsData {
  url: {
    originalUrl: string;
    shortCode: string;
    createdAt: Date;
    clickCount: number;
  };
  statistics: Array<{
    clickedAt: Date;
    ipAddress: string;
    userAgent: string;
  }>;
}

export interface TestSummaryData {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksLast24h: number;
  createdAt: Date;
}

export interface TestShortUrlResult {
  success: boolean;
  data: TestShortUrlData;
}
