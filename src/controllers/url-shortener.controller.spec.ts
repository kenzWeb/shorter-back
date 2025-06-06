import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { PrismaService } from '../services/prisma.service';
import { UrlShortenerService } from '../services/url-shortener.service';
import { UrlShortenerController } from './url-shortener.controller';

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

describe('UrlShortenerController', () => {
  let controller: UrlShortenerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlShortenerController],
      providers: [
        UrlShortenerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<UrlShortenerController>(UrlShortenerController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('shortenUrl', () => {
    it('should create a short URL with unique alias', async () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.example.com',
        alias: 'unique-alias',
      };

      const mockCreatedUrl = {
        id: '1',
        originalUrl: 'https://www.example.com',
        shortCode: 'unique-alias',
        alias: 'unique-alias',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/unique-alias',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);
      mockPrismaService.shortUrl.create.mockResolvedValue(mockCreatedUrl);

      const result = await controller.shortenUrl(createShortUrlDto);

      expect(result.success).toBe(true);
      expect(result.data.originalUrl).toBe('https://www.example.com');
      expect(result.data.shortCode).toBe('unique-alias');
      expect(result.data.alias).toBe('unique-alias');
      expect(result.data.shortUrl).toBe('http://localhost:3000/unique-alias');
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

      const result = await controller.shortenUrl(createShortUrlDto);

      expect(result.success).toBe(true);
      expect(result.data.originalUrl).toBe('https://www.github.com');
      expect(result.data.shortCode).toBe('abc12345');
      expect(result.data.alias).toBeUndefined();
    });
  });

  describe('redirect', () => {
    it('should redirect to original URL', async () => {
      const mockUrl = {
        id: '1',
        originalUrl: 'https://www.redirect-test.com',
        shortCode: 'redirect-test',
        alias: 'redirect-test',
        clickCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/redirect-test',
      };

      const updatedUrl = { ...mockUrl, clickCount: 1 };

      mockPrismaService.shortUrl.findUnique.mockResolvedValueOnce(mockUrl);

      mockPrismaService.shortUrl.update.mockResolvedValue(updatedUrl);
      mockPrismaService.clickStatistic.create.mockResolvedValue({
        id: '1',
        shortCode: 'redirect-test',
        ipAddress: '192.168.1.100',
        userAgent: 'Test User Agent',
        clickedAt: new Date(),
      });

      const mockRequest = {
        ip: '192.168.1.100',
        connection: { remoteAddress: '192.168.1.100' },
        get: jest.fn().mockReturnValue('Test User Agent'),
      } as unknown as Request;

      const mockRedirect = jest.fn();
      const mockResponse = {
        redirect: mockRedirect,
      } as unknown as Response;

      await controller.redirect('redirect-test', mockRequest, mockResponse);

      expect(mockRedirect).toHaveBeenCalledWith(
        301,
        'https://www.redirect-test.com',
      );

      mockPrismaService.shortUrl.findUnique.mockResolvedValueOnce(updatedUrl);

      const urlInfo = await controller.getUrlInfo('redirect-test');
      expect(urlInfo.data.clickCount).toBe(1);
    });

    it('should throw NotFoundException for non-existent short code', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      const mockRequest = {
        ip: '192.168.1.100',
        connection: { remoteAddress: '192.168.1.100' },
        get: jest.fn().mockReturnValue('Test User Agent'),
      } as unknown as Request;

      const mockRedirect = jest.fn();
      const mockResponse = {
        redirect: mockRedirect,
      } as unknown as Response;

      await expect(
        controller.redirect('non-existent', mockRequest, mockResponse),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUrlInfo', () => {
    it('should return URL information', async () => {
      const mockUrl = {
        id: '1',
        originalUrl: 'https://www.test.com',
        shortCode: 'test-info',
        alias: 'test-info',
        clickCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        shortUrl: 'http://localhost:3000/test-info',
      };

      mockPrismaService.shortUrl.findUnique.mockResolvedValue(mockUrl);

      const result = await controller.getUrlInfo('test-info');

      expect(result.success).toBe(true);
      expect(result.data.originalUrl).toBe('https://www.test.com');
      expect(result.data.clickCount).toBe(5);
    });

    it('should throw NotFoundException for non-existent short code', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(controller.getUrlInfo('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteUrl', () => {
    it('should delete existing URL', async () => {
      const mockUrl = {
        id: '1',
        originalUrl: 'https://www.delete-test.com',
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

      const result = await controller.deleteUrl('delete-test');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Короткая ссылка успешно удалена');
    });

    it('should throw NotFoundException for non-existent URL', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(controller.deleteUrl('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUrlAnalytics', () => {
    it('should return analytics data', async () => {
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

      const result = await controller.getUrlAnalytics('analytics-test');

      expect(result.success).toBe(true);
      expect(result.data.shortCode).toBe('analytics-test');
      expect(result.data.originalUrl).toBe('https://www.analytics-test.com');
      expect(result.data.clickCount).toBe(6);
      expect(result.data.lastFiveIPs).toHaveLength(5);
      expect(result.data.lastFiveIPs).toEqual([
        '192.168.1.6',
        '192.168.1.5',
        '192.168.1.4',
        '192.168.1.3',
        '192.168.1.2',
      ]);
    });

    it('should throw NotFoundException for non-existent short code', async () => {
      mockPrismaService.shortUrl.findUnique.mockResolvedValue(null);

      await expect(controller.getUrlAnalytics('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
