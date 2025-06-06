export interface ShortUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  alias?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
  clickCount: number;
}
