import {
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
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
  redirect(@Param('shortCode') shortCode: string, @Res() res: Response) {
    const url = this.urlShortenerService.getUrlByCode(shortCode);

    if (!url) {
      throw new NotFoundException('Короткая ссылка не найдена или истекла');
    }

    this.urlShortenerService.incrementClickCount(shortCode);

    res.redirect(HttpStatus.MOVED_PERMANENTLY, url.originalUrl);
  }

  @Get('api/urls')
  getAllUrls() {
    const urls = this.urlShortenerService.getAllUrls();
    return {
      success: true,
      data: urls,
    };
  }
}
