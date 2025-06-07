import { ShortUrl } from './short-url.interface';

export interface DeleteResponse {
  success: true;
  message: string;
}

export interface UrlRedirectParams {
  shortCode: string;
}

export interface CreateShortUrlRequest {
  originalUrl: string;
  alias?: string;
  expiresAt?: string;
}

export interface ServiceAnalyticsResult {
  clickCount: number;
  lastFiveIPs: string[];
  url: any;
}

export interface UrlInfoResponse {
  success: true;
  data: {
    originalUrl: string;
    createdAt: Date;
    clickCount: number;
  };
}

export interface AllUrlsResponse {
  success: true;
  data: ShortUrl[];
}

export interface UrlStatisticsResponse {
  success: true;
  data: {
    url: {
      originalUrl: string;
      shortCode: string;
      createdAt: Date;
      clickCount: number;
    };
    statistics: Array<{
      clickedAt: Date;
      ipAddress: string;
      userAgent?: string;
    }>;
  };
}

export interface AnalyticsSummaryItem {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksLast24h: number;
  createdAt: Date;
}

export interface AnalyticsSummaryResponse {
  success: true;
  data: AnalyticsSummaryItem[];
}

export interface UrlAnalyticsResponse {
  success: true;
  data: {
    shortCode: string;
    originalUrl: string;
    clickCount: number;
    lastFiveIPs: string[];
    createdAt: Date;
  };
}
