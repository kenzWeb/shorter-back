import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UrlShortenerController } from './controllers/url-shortener.controller';
import { PrismaService } from './services/prisma.service';
import { UrlShortenerService } from './services/url-shortener.service';

@Module({
  imports: [],
  controllers: [AppController, UrlShortenerController],
  providers: [AppService, UrlShortenerService, PrismaService],
})
export class AppModule {}
