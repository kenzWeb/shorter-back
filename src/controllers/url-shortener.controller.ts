import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { UrlShortenerService } from '../services/url-shortener.service';

@Controller()
export class UrlShortenerController {
  constructor(private readonly urlShortenerService: UrlShortenerService) {}

  @Post('shorten')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async shortenUrl(@Body() createShortUrlDto: CreateShortUrlDto) {
    const shortUrl =
      await this.urlShortenerService.createShortUrl(createShortUrlDto);

    return {
      success: true,
      data: {
        id: shortUrl.id,
        originalUrl: shortUrl.originalUrl,
        shortUrl: shortUrl.shortUrl,
        shortCode: shortUrl.shortCode,
        alias: shortUrl.alias,
        expiresAt: shortUrl.expiresAt,
        createdAt: shortUrl.createdAt,
      },
    };
  }

  @Get(':shortCode')
  async redirect(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = await this.urlShortenerService.getUrlByCode(shortCode);

    if (!url) {
      throw new NotFoundException('Короткая ссылка не найдена или истекла');
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent');

    await this.urlShortenerService.incrementClickCount(
      shortCode,
      ipAddress,
      userAgent,
    );

    res.redirect(HttpStatus.MOVED_PERMANENTLY, url.originalUrl);
  }

  @Get('info/:shortCode')
  async getUrlInfo(@Param('shortCode') shortCode: string) {
    const url = await this.urlShortenerService.getUrlByCode(shortCode);

    if (!url) {
      throw new NotFoundException('Короткая ссылка не найдена или истекла');
    }

    return {
      success: true,
      data: {
        originalUrl: url.originalUrl,
        createdAt: url.createdAt,
        clickCount: url.clickCount,
      },
    };
  }

  @Get('api/urls')
  async getAllUrls() {
    const urls = await this.urlShortenerService.getAllUrls();
    return {
      success: true,
      data: urls,
    };
  }

  @Delete('delete/:shortCode')
  async deleteUrl(@Param('shortCode') shortCode: string) {
    const deleted = await this.urlShortenerService.deleteUrl(shortCode);

    if (!deleted) {
      throw new NotFoundException('Короткая ссылка не найдена');
    }

    return {
      success: true,
      message: 'Короткая ссылка успешно удалена',
    };
  }

  @Get('stats/:shortCode')
  async getUrlStatistics(@Param('shortCode') shortCode: string) {
    const detailedInfo =
      await this.urlShortenerService.getDetailedUrlInfo(shortCode);

    if (!detailedInfo.url) {
      throw new NotFoundException('Короткая ссылка не найдена или истекла');
    }

    return {
      success: true,
      data: {
        url: {
          originalUrl: detailedInfo.url.originalUrl,
          shortCode: detailedInfo.url.shortCode,
          createdAt: detailedInfo.url.createdAt,
          clickCount: detailedInfo.url.clickCount,
        },
        statistics: detailedInfo.statistics.map((stat) => ({
          clickedAt: stat.clickedAt,
          ipAddress: stat.ipAddress,
          userAgent: stat.userAgent,
        })),
      },
    };
  }

  @Get('analytics/summary')
  async getAnalyticsSummary() {
    const allUrls = await this.urlShortenerService.getAllUrls();
    const allStats = await this.urlShortenerService.getAllClickStatistics();

    const summary = allUrls.map((url) => {
      const stats = allStats.get(url.shortCode) || [];
      const uniqueIPs = new Set(stats.map((s) => s.ipAddress)).size;
      const recentClicks = stats.filter(
        (s) => s.clickedAt >= new Date(Date.now() - 24 * 60 * 60 * 1000),
      ).length;

      return {
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        totalClicks: url.clickCount,
        uniqueVisitors: uniqueIPs,
        clicksLast24h: recentClicks,
        createdAt: url.createdAt,
      };
    });

    return {
      success: true,
      data: summary,
    };
  }

  @Get('analytics/:shortCode')
  async getUrlAnalytics(@Param('shortCode') shortCode: string) {
    const analytics = await this.urlShortenerService.getAnalytics(shortCode);

    if (!analytics.url) {
      throw new NotFoundException('Короткая ссылка не найдена или истекла');
    }

    return {
      success: true,
      data: {
        shortCode: analytics.url.shortCode,
        originalUrl: analytics.url.originalUrl,
        clickCount: analytics.clickCount,
        lastFiveIPs: analytics.lastFiveIPs,
        createdAt: analytics.url.createdAt,
      },
    };
  }
}
