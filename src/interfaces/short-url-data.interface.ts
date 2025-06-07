export interface ShortUrlData {
  id?: string;
  originalUrl: string;
  shortCode: string;
  alias?: string;
  shortUrl: string;
  clickCount: number;
  createdAt: string | Date;
  expiresAt?: string | Date;
}

export interface ShortUrlCreateData {
  originalUrl: string;
  shortCode: string;
  alias?: string;
  shortUrl: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ShortUrlInfoData {
  originalUrl: string;
  createdAt: Date;
  clickCount: number;
}
