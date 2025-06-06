export interface ShortUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  alias?: string;
  expiresAt?: Date;
  createdAt: Date;
  clickCount: number;
}
