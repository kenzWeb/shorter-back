import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { ShortUrl } from '../interfaces/short-url.interface';

@Injectable()
export class UrlShortenerService {
  private urls: Map<string, ShortUrl> = new Map();
  private aliases: Set<string> = new Set();

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

  incrementClickCount(shortCode: string): void {
    const url = this.urls.get(shortCode);
    if (url) {
      url.clickCount++;
    }
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
