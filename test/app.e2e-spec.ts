import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/services/prisma.service';
import { AppModule } from './../src/app.module';

// Типы для API ответов
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ShortUrlData {
  originalUrl: string;
  shortCode: string;
  alias?: string;
  shortUrl: string;
  clickCount: number;
  createdAt: string;
  expiresAt?: string;
}

interface ClickStatistic {
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

interface StatsData {
  url: ShortUrlData;
  statistics: ClickStatistic[];
}

interface SummaryData {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
}

describe('URL Shortener (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Очищаем базу данных перед каждым тестом
    await prismaService.clickStatistic.deleteMany();
    await prismaService.shortUrl.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /shorten', () => {
    it('should create a short URL with unique alias', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.google.com',
          alias: 'google-test',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as ApiResponse<ShortUrlData>;
          expect(body.success).toBe(true);
          expect(body.data?.originalUrl).toBe('https://www.google.com');
          expect(body.data?.shortCode).toBe('google-test');
          expect(body.data?.alias).toBe('google-test');
          expect(body.data?.shortUrl).toBe('http://localhost:3000/google-test');
        });
    });

    it('should create a short URL without alias', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.github.com',
        })
        .expect(201)
        .expect((res) => {
          const body = res.body as ApiResponse<ShortUrlData>;
          expect(body.success).toBe(true);
          expect(body.data?.originalUrl).toBe('https://www.github.com');
          expect(body.data?.shortCode).toHaveLength(8);
          expect(body.data?.alias).toBeUndefined();
        });
    });

    it('should return 400 for invalid URL', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'not-a-valid-url',
        })
        .expect(400);
    });

    it('should return 409 for duplicate alias', async () => {
      await request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.example1.com',
          alias: 'duplicate-alias',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.example2.com',
          alias: 'duplicate-alias',
        })
        .expect(409);
    });

    it('should return 400 for too long alias', () => {
      return request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.example.com',
          alias: 'this-alias-is-way-too-long-for-validation',
        })
        .expect(400);
    });
  });

  describe('GET /:shortCode (redirect)', () => {
    it('should redirect to original URL', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.redirect-test.com',
          alias: 'redirect-e2e',
        })
        .expect(201);

      const body = createResponse.body as ApiResponse<ShortUrlData>;
      const shortCode = body.data?.shortCode;

      return request(app.getHttpServer())
        .get(`/${shortCode}`)
        .expect(301)
        .expect('Location', 'https://www.redirect-test.com');
    });

    it('should return 404 for non-existent short code', () => {
      return request(app.getHttpServer()).get('/non-existent-code').expect(404);
    });

    it('should return 404 for expired URL', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.expired.com',
          alias: 'expired-e2e',
          expiresAt: pastDate.toISOString(),
        })
        .expect(201);

      return request(app.getHttpServer()).get('/expired-e2e').expect(404);
    });
  });

  describe('GET /info/:shortCode', () => {
    it('should return URL information', async () => {
      await request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.info-test.com',
          alias: 'info-e2e',
        })
        .expect(201);

      return request(app.getHttpServer())
        .get('/info/info-e2e')
        .expect(200)
        .expect((res) => {
          const body = res.body as ApiResponse<ShortUrlData>;
          expect(body.success).toBe(true);
          expect(body.data?.originalUrl).toBe('https://www.info-test.com');
          expect(body.data?.clickCount).toBe(0);
          expect(body.data?.createdAt).toBeDefined();
        });
    });

    it('should return 404 for non-existent URL', () => {
      return request(app.getHttpServer()).get('/info/non-existent').expect(404);
    });
  });

  describe('DELETE /delete/:shortCode', () => {
    it('should delete existing URL', async () => {
      await request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.delete-test.com',
          alias: 'delete-e2e',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete('/delete/delete-e2e')
        .expect(200)
        .expect((res) => {
          const body = res.body as ApiResponse;
          expect(body.success).toBe(true);
          expect(body.message).toBe('Короткая ссылка успешно удалена');
        });

      return request(app.getHttpServer()).get('/info/delete-e2e').expect(404);
    });

    it('should return 404 for non-existent URL', () => {
      return request(app.getHttpServer())
        .delete('/delete/non-existent')
        .expect(404);
    });
  });

  describe('GET /stats/:shortCode', () => {
    it('should return detailed statistics after clicks', async () => {
      await request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.stats-test.com',
          alias: 'stats-e2e',
        })
        .expect(201);

      await request(app.getHttpServer()).get('/stats-e2e').expect(301);

      await request(app.getHttpServer()).get('/stats-e2e').expect(301);

      return request(app.getHttpServer())
        .get('/stats/stats-e2e')
        .expect(200)
        .expect((res) => {
          const body = res.body as ApiResponse<StatsData>;
          expect(body.success).toBe(true);
          expect(body.data?.url.originalUrl).toBe('https://www.stats-test.com');
          expect(body.data?.url.clickCount).toBe(2);
          expect(body.data?.statistics).toHaveLength(2);
          expect(body.data?.statistics[0]?.ipAddress).toBeDefined();
        });
    });
  });

  describe('GET /analytics/summary', () => {
    it('should return analytics summary', async () => {
      await request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.summary1.com',
          alias: 'summary1',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/shorten')
        .send({
          originalUrl: 'https://www.summary2.com',
          alias: 'summary2',
        })
        .expect(201);

      return request(app.getHttpServer())
        .get('/analytics/summary')
        .expect(200)
        .expect((res) => {
          const body = res.body as ApiResponse<SummaryData[]>;
          expect(body.success).toBe(true);
          expect(body.data).toBeInstanceOf(Array);
          expect(body.data?.length).toBeGreaterThanOrEqual(2);
          expect(body.data?.[0]).toHaveProperty('shortCode');
          expect(body.data?.[0]).toHaveProperty('originalUrl');
          expect(body.data?.[0]).toHaveProperty('totalClicks');
          expect(body.data?.[0]).toHaveProperty('uniqueVisitors');
        });
    });
  });
});
