import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('앱이 정상 초기화된다', () => {
    expect(app).toBeDefined();
  });

  it('GET /movies 는 200 또는 401 을 반환한다', () => {
    return request(app.getHttpServer())
      .get('/movies')
      .expect((res) => {
        expect([200, 401]).toContain(res.status);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
