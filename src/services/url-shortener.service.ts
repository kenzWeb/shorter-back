import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { ClickStatistics } from '../interfaces/click-statistics.interface';
import { ShortUrl } from '../interfaces/short-url.interface';

@Injectable()
export class UrlShortenerService {
  private urls: Map<string, ShortUrl> = new Map();
  private aliases: Set<string> = new Set();
  private clickStatistics: Map<string, ClickStatistics[]> = new Map();

  createShortUrl(createShortUrlDto: CreateShortUrlDto): ShortUrl {
    const { originalUrl, expiresAt, alias } = createShortUrlDto;

    if (alias) {
      if (this.aliases.has(alias)) {
        throw new ConflictException('Алиас уже используется');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
        throw new BadRequestException(
          'Алиас может содержать только буквы, цифры, дефисы и подчеркивания',
        );
      }
    }

    const shortCode = alias || nanoid(8);
    const id = nanoid();

    const shortUrl = `http://localhost:3000/${shortCode}`;

    const urlData: ShortUrl = {
      id,
      originalUrl,
      shortCode,
      shortUrl,
      alias,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdAt: new Date(),
      clickCount: 0,
    };

    this.urls.set(shortCode, urlData);
    if (alias) {
      this.aliases.add(alias);
    }

    return urlData;
  }

  getUrlByCode(shortCode: string): ShortUrl | null {
    const url = this.urls.get(shortCode);

    if (!url) {
      return null;
    }

    if (url.expiresAt && url.expiresAt < new Date()) {
      return null;
    }

    return url;
  }

  incrementClickCount(
    shortCode: string,
    ipAddress: string,
    userAgent?: string,
  ): void {
    const url = this.urls.get(shortCode);
    if (url) {
      url.clickCount++;

      const clickStat: ClickStatistics = {
        id: nanoid(),
        shortCode,
        clickedAt: new Date(),
        ipAddress,
        userAgent,
      };

      if (!this.clickStatistics.has(shortCode)) {
        this.clickStatistics.set(shortCode, []);
      }

      this.clickStatistics.get(shortCode)!.push(clickStat);
    }
  }

  getClickStatistics(shortCode: string): ClickStatistics[] {
    return this.clickStatistics.get(shortCode) || [];
  }

  getAllClickStatistics(): Map<string, ClickStatistics[]> {
    return this.clickStatistics;
  }

  getDetailedUrlInfo(shortCode: string): {
    url: ShortUrl | null;
    statistics: ClickStatistics[];
  } {
    const url = this.getUrlByCode(shortCode);
    const statistics = this.getClickStatistics(shortCode);

    return {
      url,
      statistics,
    };
  }

  getAllUrls(): ShortUrl[] {
    return Array.from(this.urls.values());
  }

  deleteUrl(shortCode: string): boolean {
    const url = this.urls.get(shortCode);

    if (!url) {
      return false;
    }

    this.urls.delete(shortCode);

    if (url.alias) {
      this.aliases.delete(url.alias);
    }

    return true;
  }
}
