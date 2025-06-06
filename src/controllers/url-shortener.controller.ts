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
  shortenUrl(@Body() createShortUrlDto: CreateShortUrlDto) {
    const shortUrl = this.urlShortenerService.createShortUrl(createShortUrlDto);

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
  redirect(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const url = this.urlShortenerService.getUrlByCode(shortCode);

    if (!url) {
      throw new NotFoundException('Короткая ссылка не найдена или истекла');
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent');

    this.urlShortenerService.incrementClickCount(
      shortCode,
      ipAddress,
      userAgent,
    );

    res.redirect(HttpStatus.MOVED_PERMANENTLY, url.originalUrl);
  }

  @Get('info/:shortCode')
  getUrlInfo(@Param('shortCode') shortCode: string) {
    const url = this.urlShortenerService.getUrlByCode(shortCode);

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
  getAllUrls() {
    const urls = this.urlShortenerService.getAllUrls();
    return {
      success: true,
      data: urls,
    };
  }

  @Delete('delete/:shortCode')
  deleteUrl(@Param('shortCode') shortCode: string) {
    const deleted = this.urlShortenerService.deleteUrl(shortCode);

    if (!deleted) {
      throw new NotFoundException('Короткая ссылка не найдена');
    }

    return {
      success: true,
      message: 'Короткая ссылка успешно удалена',
    };
  }

  @Get('stats/:shortCode')
  getUrlStatistics(@Param('shortCode') shortCode: string) {
    const detailedInfo = this.urlShortenerService.getDetailedUrlInfo(shortCode);

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
  getAnalyticsSummary() {
    const allUrls = this.urlShortenerService.getAllUrls();
    const allStats = this.urlShortenerService.getAllClickStatistics();

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
  getUrlAnalytics(@Param('shortCode') shortCode: string) {
    const analytics = this.urlShortenerService.getAnalytics(shortCode);

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
