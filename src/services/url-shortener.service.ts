import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { ClickStatistics, ShortUrl } from '../interfaces';
import { PrismaService } from './prisma.service';

@Injectable()
export class UrlShortenerService {
  constructor(private prisma: PrismaService) {}

  async createShortUrl(
    createShortUrlDto: CreateShortUrlDto,
  ): Promise<ShortUrl> {
    const { originalUrl, expiresAt, alias } = createShortUrlDto;

    if (alias) {
      const existingUrl = await this.prisma.shortUrl.findUnique({
        where: { alias },
      });

      if (existingUrl) {
        throw new ConflictException('Алиас уже используется');
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
        throw new BadRequestException(
          'Алиас может содержать только буквы, цифры, дефисы и подчеркивания',
        );
      }
    }

    const shortCode = alias || nanoid(8);

    if (!alias) {
      const existingByCode = await this.prisma.shortUrl.findUnique({
        where: { shortCode },
      });

      if (existingByCode) {
        return this.createShortUrl(createShortUrlDto);
      }
    }

    const shortUrl = `http://localhost:3000/${shortCode}`;
    const expiration = expiresAt ? new Date(expiresAt) : null;

    const createdUrl = await this.prisma.shortUrl.create({
      data: {
        originalUrl,
        shortCode,
        alias,
        shortUrl,
        expiresAt: expiration,
      },
    });

    return {
      id: createdUrl.id,
      originalUrl: createdUrl.originalUrl,
      shortCode: createdUrl.shortCode,
      alias: createdUrl.alias ?? undefined,
      shortUrl: createdUrl.shortUrl,
      clickCount: createdUrl.clickCount,
      expiresAt: createdUrl.expiresAt ?? undefined,
      createdAt: createdUrl.createdAt,
    };
  }

  async getUrlByCode(shortCode: string): Promise<ShortUrl | null> {
    const url = await this.prisma.shortUrl.findUnique({
      where: { shortCode },
    });

    if (!url) {
      return null;
    }

    if (url.expiresAt && url.expiresAt < new Date()) {
      return null;
    }

    return {
      id: url.id,
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      alias: url.alias ?? undefined,
      shortUrl: url.shortUrl,
      clickCount: url.clickCount,
      expiresAt: url.expiresAt ?? undefined,
      createdAt: url.createdAt,
    };
  }

  async incrementClickCount(
    shortCode: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.shortUrl.update({
      where: { shortCode },
      data: {
        clickCount: {
          increment: 1,
        },
      },
    });

    await this.prisma.clickStatistic.create({
      data: {
        shortCode,
        ipAddress,
        userAgent: userAgent || '',
      },
    });
  }

  async getClickStatistics(shortCode: string): Promise<ClickStatistics[]> {
    const statistics = await this.prisma.clickStatistic.findMany({
      where: { shortCode },
      orderBy: { clickedAt: 'desc' },
    });

    return statistics.map((stat) => ({
      id: stat.id,
      shortCode: stat.shortCode,
      ipAddress: stat.ipAddress,
      userAgent: stat.userAgent || '',
      clickedAt: stat.clickedAt,
    }));
  }

  async getDetailedUrlInfo(shortCode: string): Promise<{
    url: ShortUrl | null;
    statistics: ClickStatistics[];
  }> {
    const url = await this.getUrlByCode(shortCode);
    const statistics = await this.getClickStatistics(shortCode);

    return {
      url,
      statistics,
    };
  }

  async getAllUrls(): Promise<ShortUrl[]> {
    const urls = await this.prisma.shortUrl.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return urls.map((url) => ({
      id: url.id,
      originalUrl: url.originalUrl,
      shortCode: url.shortCode,
      alias: url.alias ?? undefined,
      shortUrl: url.shortUrl,
      clickCount: url.clickCount,
      expiresAt: url.expiresAt ?? undefined,
      createdAt: url.createdAt,
    }));
  }

  async getAllClickStatistics(): Promise<Map<string, ClickStatistics[]>> {
    const allStats = await this.prisma.clickStatistic.findMany({
      orderBy: { clickedAt: 'desc' },
    });

    const statsMap = new Map<string, ClickStatistics[]>();

    allStats.forEach((stat) => {
      const shortCode = stat.shortCode;
      if (!statsMap.has(shortCode)) {
        statsMap.set(shortCode, []);
      }

      statsMap.get(shortCode)!.push({
        id: stat.id,
        shortCode: stat.shortCode,
        ipAddress: stat.ipAddress,
        userAgent: stat.userAgent || '',
        clickedAt: stat.clickedAt,
      });
    });

    return statsMap;
  }

  async deleteUrl(shortCode: string): Promise<boolean> {
    const existingUrl = await this.prisma.shortUrl.findUnique({
      where: { shortCode },
    });

    if (!existingUrl) {
      return false;
    }

    try {
      await this.prisma.shortUrl.delete({
        where: { shortCode },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getAnalytics(shortCode: string): Promise<{
    clickCount: number;
    lastFiveIPs: string[];
    url: ShortUrl | null;
  }> {
    const url = await this.prisma.shortUrl.findUnique({
      where: { shortCode },
    });

    if (!url) {
      throw new NotFoundException('Короткая ссылка не найдена');
    }

    const urlData = await this.getUrlByCode(shortCode);
    const statistics = await this.getClickStatistics(shortCode);

    const recentStats = statistics
      .sort((a, b) => b.clickedAt.getTime() - a.clickedAt.getTime())
      .slice(0, 20);

    const uniqueIPs = new Set<string>();
    const lastFiveIPs: string[] = [];

    for (const stat of recentStats) {
      if (!uniqueIPs.has(stat.ipAddress) && lastFiveIPs.length < 5) {
        uniqueIPs.add(stat.ipAddress);
        lastFiveIPs.push(stat.ipAddress);
      }
    }

    return {
      clickCount: urlData?.clickCount || 0,
      lastFiveIPs,
      url: urlData,
    };
  }
}
