import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { PrismaService } from './prisma.service';
import { UrlShortenerService } from './url-shortener.service';

const mockPrismaService = {
  shortUrl: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  clickStatistic: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('UrlShortenerService', () => {
  let service: UrlShortenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlShortenerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UrlShortenerService>(UrlShortenerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShortUrl', () => {
    it('should create a short URL with unique alias', async () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.google.com',
        alias: 'google-test',
      };

      const mockCreatedUrl = {
        id: '1',
        originalUrl: 'https://www.google.com',
        shortCode: 'google-test',
        alias: 'google-test',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/google-test',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);
      mockPrismaService.shortUrl.create.mockResolvedValue(mockCreatedUrl);

      const result = await service.createShortUrl(createShortUrlDto);

      expect(result).toBeDefined();
      expect(result.originalUrl).toBe('https://www.google.com');
      expect(result.shortCode).toBe('google-test');
      expect(result.alias).toBe('google-test');
      expect(result.shortUrl).toBe('http://localhost:3000/google-test');
      expect(result.clickCount).toBe(0);
    });

    it('should create a short URL without alias', async () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.github.com',
      };

      const mockCreatedUrl = {
        id: '2',
        originalUrl: 'https://www.github.com',
        shortCode: 'abc12345',
        alias: null,
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/abc12345',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);
      mockPrismaService.shortUrl.create.mockResolvedValue(mockCreatedUrl);

      const result = await service.createShortUrl(createShortUrlDto);

      expect(result).toBeDefined();
      expect(result.originalUrl).toBe('https://www.github.com');
      expect(result.shortCode).toBe('abc12345');
      expect(result.alias).toBeUndefined();
      expect(result.shortUrl).toBe('http://localhost:3000/abc12345');
      expect(result.clickCount).toBe(0);
    });

    it('should throw ConflictException for duplicate alias', async () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.google.com',
        alias: 'duplicate-alias',
      };

      const existingUrl = {
        id: '1',
        originalUrl: 'https://www.existing.com',
        shortCode: 'duplicate-alias',
        alias: 'duplicate-alias',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/duplicate-alias',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(existingUrl);

      await expect(service.createShortUrl(createShortUrlDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for invalid alias characters', async () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.google.com',
        alias: 'invalid@alias!',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(service.createShortUrl(createShortUrlDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a short URL with expiration date', async () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);

      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.stackoverflow.com',
        expiresAt: expirationDate.toISOString(),
      };

      const mockCreatedUrl = {
        id: '3',
        originalUrl: 'https://www.stackoverflow.com',
        shortCode: 'def67890',
        alias: null,
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: expirationDate,
        shortUrl: 'http://localhost:3000/def67890',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);
      mockPrismaService.shortUrl.create.mockResolvedValue(mockCreatedUrl);

      const result = await service.createShortUrl(createShortUrlDto);

      expect(result).toBeDefined();
      expect(result.expiresAt).toEqual(expirationDate);
    });
  });

  describe('getUrlByCode', () => {
    it('should return URL for valid short code', async () => {
      const mockUrl = {
        id: '1',
        originalUrl: 'https://www.example.com',
        shortCode: 'example',
        alias: 'example',
        clickCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/example',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockUrl);

      const foundUrl = await service.getUrlByCode('example');

      expect(foundUrl).toBeDefined();
      expect(foundUrl?.originalUrl).toBe('https://www.example.com');
      expect(foundUrl?.shortCode).toBe('example');
    });

    it('should return null for non-existent short code', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      const foundUrl = await service.getUrlByCode('non-existent');
      expect(foundUrl).toBeNull();
    });

    it('should return null for expired URL', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const expiredUrl = {
        id: '1',
        originalUrl: 'https://www.expired.com',
        shortCode: 'expired-url',
        alias: 'expired-url',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: pastDate,
        shortUrl: 'http://localhost:3000/expired-url',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(expiredUrl);

      const foundUrl = await service.getUrlByCode('expired-url');

      expect(foundUrl).toBeNull();
    });
  });

  describe('incrementClickCount', () => {
    it('should increment click count and save statistics', async () => {
      const mockUrl = {
        id: '1',
        originalUrl: 'https://www.test.com',
        shortCode: 'test-clicks',
        alias: 'test-clicks',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/test-clicks',
      };

      const updatedUrl = {
        ...mockUrl,
        clickCount: 1,
      };

      const mockStatistic = {
        id: '1',
        shortUrlId: '1',
        ipAddress: '192.168.1.1',
        userAgent: 'Test User Agent',
        clickedAt: new Date(),
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockUrl);
      mockPrismaService.shortUrl.update.mockResolvedValue(updatedUrl);
      mockPrismaService.clickStatistic.create.mockResolvedValue(mockStatistic);

      await service.incrementClickCount(
        'test-clicks',
        '192.168.1.1',
        'Test User Agent',
      );

      expect(mockPrismaService.shortUrl.update).toHaveBeenCalledWith({
        where: { shortCode: 'test-clicks' },
        data: { clickCount: { increment: 1 } },
      });

      expect(mockPrismaService.clickStatistic.create).toHaveBeenCalledWith({
        data: {
          shortCode: 'test-clicks',
          ipAddress: '192.168.1.1',
          userAgent: 'Test User Agent',
        },
      });
    });
  });

  describe('deleteUrl', () => {
    it('should delete existing URL and return true', async () => {
      const mockUrl = {
        id: '1',
        originalUrl: 'https://www.delete-me.com',
        shortCode: 'delete-test',
        alias: 'delete-test',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/delete-test',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockUrl);
      mockPrismaService.shortUrl.delete.mockResolvedValue(mockUrl);

      const deleted = await service.deleteUrl('delete-test');
      expect(deleted).toBe(true);

      expect(mockPrismaService.shortUrl.delete).toHaveBeenCalledWith({
        where: { shortCode: 'delete-test' },
      });
    });

    it('should return false for non-existent URL', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      const deleted = await service.deleteUrl('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getClickStatistics', () => {
    it('should return click statistics for a short code', async () => {
      const mockStatistics = [
        {
          id: '1',
          shortUrlId: '1',
          ipAddress: '192.168.1.1',
          userAgent: 'Test User Agent',
          clickedAt: new Date(),
        },
        {
          id: '2',
          shortUrlId: '1',
          ipAddress: '192.168.1.2',
          userAgent: 'Another User Agent',
          clickedAt: new Date(),
        },
      ];

      mockPrismaService.clickStatistic.findMany.mockResolvedValue(
        mockStatistics,
      );

      const statistics = await service.getClickStatistics('test-code');

      expect(statistics).toHaveLength(2);
      expect(statistics[0].ipAddress).toBe('192.168.1.1');
      expect(statistics[0].userAgent).toBe('Test User Agent');
      expect(statistics[1].ipAddress).toBe('192.168.1.2');
      expect(statistics[1].userAgent).toBe('Another User Agent');
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics with last 5 IPs', async () => {
      const mockUrl = {
        id: '1',
        originalUrl: 'https://www.analytics-test.com',
        shortCode: 'analytics-test',
        alias: 'analytics-test',
        clickCount: 6,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/analytics-test',
      };

      const mockStatistics = [
        {
          id: '6',
          shortUrlId: '1',
          ipAddress: '192.168.1.6',
          userAgent: 'Test Agent',
          clickedAt: new Date(Date.now() - 1000),
        },
        {
          id: '5',
          shortUrlId: '1',
          ipAddress: '192.168.1.5',
          userAgent: 'Test Agent',
          clickedAt: new Date(Date.now() - 2000),
        },
        {
          id: '4',
          shortUrlId: '1',
          ipAddress: '192.168.1.4',
          userAgent: 'Test Agent',
          clickedAt: new Date(Date.now() - 3000),
        },
        {
          id: '3',
          shortUrlId: '1',
          ipAddress: '192.168.1.3',
          userAgent: 'Test Agent',
          clickedAt: new Date(Date.now() - 4000),
        },
        {
          id: '2',
          shortUrlId: '1',
          ipAddress: '192.168.1.2',
          userAgent: 'Test Agent',
          clickedAt: new Date(Date.now() - 5000),
        },
        {
          id: '1',
          shortUrlId: '1',
          ipAddress: '192.168.1.1',
          userAgent: 'Test Agent',
          clickedAt: new Date(Date.now() - 6000),
        },
      ];

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockUrl);
      mockPrismaService.clickStatistic.findMany.mockResolvedValue(
        mockStatistics,
      );

      const analytics = await service.getAnalytics('analytics-test');

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

    it('should throw NotFoundException for non-existent short code', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(service.getAnalytics('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
