import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { UrlShortenerService } from '../services/url-shortener.service';
import { UrlShortenerController } from './url-shortener.controller';

describe('UrlShortenerController', () => {
  let controller: UrlShortenerController;
  let service: UrlShortenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UrlShortenerController],
      providers: [UrlShortenerService],
    }).compile();

    controller = module.get<UrlShortenerController>(UrlShortenerController);
    service = module.get<UrlShortenerService>(UrlShortenerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('shortenUrl', () => {
    it('should create a short URL with unique alias', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.example.com',
        alias: 'unique-alias',
      };

      const result = controller.shortenUrl(createShortUrlDto);

      expect(result.success).toBe(true);
      expect(result.data.originalUrl).toBe('https://www.example.com');
      expect(result.data.shortCode).toBe('unique-alias');
      expect(result.data.alias).toBe('unique-alias');
      expect(result.data.shortUrl).toBe('http://localhost:3000/unique-alias');
    });

    it('should create a short URL without alias', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.github.com',
      };

      const result = controller.shortenUrl(createShortUrlDto);

      expect(result.success).toBe(true);
      expect(result.data.originalUrl).toBe('https://www.github.com');
      expect(result.data.shortCode).toHaveLength(8);
      expect(result.data.alias).toBeUndefined();
    });
  });

  describe('redirect', () => {
    it('should redirect to original URL', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.redirect-test.com',
        alias: 'redirect-test',
      };

      controller.shortenUrl(createShortUrlDto);

      const mockRequest = {
        ip: '192.168.1.100',
        connection: { remoteAddress: '192.168.1.100' },
        get: jest.fn().mockReturnValue('Test User Agent'),
      } as unknown as Request;

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      controller.redirect('redirect-test', mockRequest, mockResponse);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        301,
        'https://www.redirect-test.com',
      );

      const urlInfo = controller.getUrlInfo('redirect-test');
      expect(urlInfo.data.clickCount).toBe(1);
    });

    it('should throw NotFoundException for non-existent short code', () => {
      const mockRequest = {
        ip: '192.168.1.100',
        connection: { remoteAddress: '192.168.1.100' },
        get: jest.fn().mockReturnValue('Test User Agent'),
      } as unknown as Request;

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      expect(() => {
        controller.redirect('non-existent', mockRequest, mockResponse);
      }).toThrow(NotFoundException);
    });

    it('should throw NotFoundException for expired URL', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.expired.com',
        alias: 'expired-test',
        expiresAt: pastDate.toISOString(),
      };

      controller.shortenUrl(createShortUrlDto);

      const mockRequest = {
        ip: '192.168.1.100',
        connection: { remoteAddress: '192.168.1.100' },
        get: jest.fn().mockReturnValue('Test User Agent'),
      } as unknown as Request;

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      expect(() => {
        controller.redirect('expired-test', mockRequest, mockResponse);
      }).toThrow(NotFoundException);
    });
  });

  describe('getUrlInfo', () => {
    it('should return URL information', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.info-test.com',
        alias: 'info-test',
      };

      controller.shortenUrl(createShortUrlDto);

      const result = controller.getUrlInfo('info-test');

      expect(result.success).toBe(true);
      expect(result.data.originalUrl).toBe('https://www.info-test.com');
      expect(result.data.clickCount).toBe(0);
      expect(result.data.createdAt).toBeDefined();
    });

    it('should throw NotFoundException for non-existent URL', () => {
      expect(() => {
        controller.getUrlInfo('non-existent');
      }).toThrow(NotFoundException);
    });
  });

  describe('deleteUrl', () => {
    it('should delete existing URL', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.delete-test.com',
        alias: 'delete-test',
      };

      controller.shortenUrl(createShortUrlDto);

      const result = controller.deleteUrl('delete-test');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Короткая ссылка успешно удалена');

      expect(() => {
        controller.getUrlInfo('delete-test');
      }).toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent URL', () => {
      expect(() => {
        controller.deleteUrl('non-existent');
      }).toThrow(NotFoundException);
    });
  });

  describe('getUrlStatistics', () => {
    it('should return detailed statistics', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.stats-test.com',
        alias: 'stats-test',
      };

      controller.shortenUrl(createShortUrlDto);

      const mockRequest = {
        ip: '192.168.1.200',
        connection: { remoteAddress: '192.168.1.200' },
        get: jest.fn().mockReturnValue('Stats Test Agent'),
      } as unknown as Request;

      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      controller.redirect('stats-test', mockRequest, mockResponse);
      controller.redirect('stats-test', mockRequest, mockResponse);

      const result = controller.getUrlStatistics('stats-test');

      expect(result.success).toBe(true);
      expect(result.data.url.originalUrl).toBe('https://www.stats-test.com');
      expect(result.data.url.clickCount).toBe(2);
      expect(result.data.statistics).toHaveLength(2);
      expect(result.data.statistics[0].ipAddress).toBe('192.168.1.200');
      expect(result.data.statistics[0].userAgent).toBe('Stats Test Agent');
    });
  });

  describe('getUrlAnalytics', () => {
    it('should return analytics with last 5 IPs', () => {
      const createShortUrlDto: CreateShortUrlDto = {
        originalUrl: 'https://www.analytics.com',
        alias: 'analytics-test',
      };

      controller.shortenUrl(createShortUrlDto);

      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
      ips.forEach((ip) => {
        const mockRequest = {
          ip,
          connection: { remoteAddress: ip },
          get: jest.fn().mockReturnValue('Analytics Agent'),
        } as unknown as Request;

        const mockResponse = {
          redirect: jest.fn(),
        } as unknown as Response;

        controller.redirect('analytics-test', mockRequest, mockResponse);
      });

      const result = controller.getUrlAnalytics('analytics-test');

      expect(result.success).toBe(true);
      expect(result.data.shortCode).toBe('analytics-test');
      expect(result.data.clickCount).toBe(3);
      expect(result.data.lastFiveIPs).toEqual([
        '192.168.1.1',
        '192.168.1.2',
        '192.168.1.3',
      ]);
    });
  });
});
