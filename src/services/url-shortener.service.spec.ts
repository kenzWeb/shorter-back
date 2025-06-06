import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { UrlShortenerService } from './url-shortener.service';

describe('UrlShortenerService', () => {
  let service: UrlShortenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UrlShortenerService],
    }).compile();

    service = module.get<UrlShortenerService>(UrlShortenerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShortUrl', () => {
    it('should create a short URL with unique alias', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.google.com',
        alias: 'google-test',
      };

      const result = service.createShortUrl(createShortUrlDto);

      expect(result).toBeDefined();
      expect(result.originalUrl).toBe('https://www.google.com');
      expect(result.shortCode).toBe('google-test');
      expect(result.alias).toBe('google-test');
      expect(result.shortUrl).toBe('http://localhost:3000/google-test');
      expect(result.clickCount).toBe(0);
    });

    it('should create a short URL without alias', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.github.com',
      };

      const result = service.createShortUrl(createShortUrlDto);

      expect(result).toBeDefined();
      expect(result.originalUrl).toBe('https://www.github.com');
      expect(result.shortCode).toHaveLength(8);
      expect(result.alias).toBeUndefined();
      expect(result.shortUrl).toBe(`http://localhost:3000/${result.shortCode}`);
      expect(result.clickCount).toBe(0);
    });

    it('should throw ConflictException for duplicate alias', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.google.com',
        alias: 'duplicate-alias',
      };

      service.createShortUrl(createShortUrlDto);

      expect(() => {
        service.createShortUrl({
          originalUrl: 'https://www.youtube.com',
          alias: 'duplicate-alias',
        });
      }).toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid alias characters', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.google.com',
        alias: 'invalid@alias!',
      };

      expect(() => {
        service.createShortUrl(createShortUrlDto);
      }).toThrow(BadRequestException);
    });

    it('should create a short URL with expiration date', () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);

      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.stackoverflow.com',
        expiresAt: expirationDate.toISOString(),
      };

      const result = service.createShortUrl(createShortUrlDto);

      expect(result).toBeDefined();
      expect(result.expiresAt).toEqual(expirationDate);
    });
  });

  describe('getUrlByCode', () => {
    it('should return URL for valid short code', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.example.com',
        alias: 'example',
      };

      const createdUrl = service.createShortUrl(createShortUrlDto);
      const foundUrl = service.getUrlByCode('example');

      expect(foundUrl).toBeDefined();
      expect(foundUrl?.originalUrl).toBe('https://www.example.com');
      expect(foundUrl?.shortCode).toBe('example');
    });

    it('should return null for non-existent short code', () => {
      const foundUrl = service.getUrlByCode('non-existent');
      expect(foundUrl).toBeNull();
    });

    it('should return null for expired URL', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.expired.com',
        alias: 'expired-url',
        expiresAt: pastDate.toISOString(),
      };

      service.createShortUrl(createShortUrlDto);
      const foundUrl = service.getUrlByCode('expired-url');

      expect(foundUrl).toBeNull();
    });
  });

  describe('incrementClickCount', () => {
    it('should increment click count and save statistics', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.test.com',
        alias: 'test-clicks',
      };

      const createdUrl = service.createShortUrl(createShortUrlDto);
      expect(createdUrl.clickCount).toBe(0);

      service.incrementClickCount(
        'test-clicks',
        '192.168.1.1',
        'Test User Agent',
      );

      const updatedUrl = service.getUrlByCode('test-clicks');
      expect(updatedUrl?.clickCount).toBe(1);

      const statistics = service.getClickStatistics('test-clicks');
      expect(statistics).toHaveLength(1);
      expect(statistics[0].ipAddress).toBe('192.168.1.1');
      expect(statistics[0].userAgent).toBe('Test User Agent');
    });
  });

  describe('deleteUrl', () => {
    it('should delete existing URL and return true', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.delete-me.com',
        alias: 'delete-test',
      };

      service.createShortUrl(createShortUrlDto);

      const deleted = service.deleteUrl('delete-test');
      expect(deleted).toBe(true);

      const foundUrl = service.getUrlByCode('delete-test');
      expect(foundUrl).toBeNull();
    });

    it('should return false for non-existent URL', () => {
      const deleted = service.deleteUrl('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics with last 5 IPs', async () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.analytics-test.com',
        alias: 'analytics-test',
      };

      service.createShortUrl(createShortUrlDto);

      const ips = [
        '192.168.1.1',
        '192.168.1.2',
        '192.168.1.3',
        '192.168.1.4',
        '192.168.1.5',
        '192.168.1.6',
      ];

      // Добавляем клики с небольшими задержками для разного времени
      for (const ip of ips) {
        service.incrementClickCount('analytics-test', ip, 'Test Agent');
        await new Promise((resolve) => setTimeout(resolve, 1)); // 1ms задержка
      }

      const analytics = service.getAnalytics('analytics-test');

      expect(analytics.url).toBeDefined();
      expect(analytics.clickCount).toBe(6);
      expect(analytics.lastFiveIPs).toHaveLength(5);
      expect(analytics.lastFiveIPs).toEqual([
        '192.168.1.6',
        '192.168.1.5',
        '192.168.1.4',
        '192.168.1.3',
        '192.168.1.2',
      ]);
    });
  });
});
