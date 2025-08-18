import request, { Response as SuperAgentResponse } from 'supertest';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { Application } from 'express';
import fastify, { FastifyInstance } from 'fastify';
import fastifyQs from 'fastify-qs';
import { ApplicationModule } from './src/app.module';
import { Sort } from '../src';
import { makeTestData, startDate } from './src/testData';
import { TestDto } from './src/test.dto';
import { QueryOrder } from '@mikro-orm/core';
//import { Test, TestingModule } from '@nestjs/testing';

function isFastify(instance: object): instance is FastifyInstance {
  return Object.hasOwn(instance, 'register');
}

describe('pageable', () => {
  let app: NestExpressApplication | NestFastifyApplication;
  let testData: TestDto[];

  beforeEach(async () => {
    testData = makeTestData();

    app = await NestFactory.create<NestExpressApplication>(ApplicationModule, new ExpressAdapter(), { logger: false });
    //app = await NestFactory.create<NestFastifyApplication>(ApplicationModule, new FastifyAdapter(), { logger: false });
    await app.init();

    const instance = app.getHttpAdapter().getInstance();

    if (isFastify(instance)) {
      await instance.register(fastifyQs);
      await instance.ready();
    } else {
      (instance as Application).set('query parser', 'extended');
    }
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return the first page (size of 10) by default', () => {
    return request(app.getHttpServer())
      .get('/test')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toStrictEqual(testData.slice(0, 10).map((t) => serialize(t)));
      });
  });

  it('should return the second page (size of 10)', () => {
    return request(app.getHttpServer())
      .get('/test?page=2')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toStrictEqual(testData.slice(10, 20).map((t) => serialize(t)));
      });
  });

  it('should return a non-existing page (page of MAX_SAFE_INTEGER / 10, size of 10) with an empty data array', () => {
    return request(app.getHttpServer())
      .get(`/test?page=${Math.floor(Number.MAX_SAFE_INTEGER / 10)}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toStrictEqual([]);
      });
  });

  it('should return the first page (limit of 1)', () => {
    return request(app.getHttpServer())
      .get('/test?limit=1')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toStrictEqual(testData.slice(0, 1).map((t) => serialize(t)));
      });
  });

  describe('filtering', () => {
    it('should filter by equality', () => {
      return request(app.getHttpServer())
        .get('/test?filter[id]=4')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(testData.filter((data) => data.id === 4).map((t) => serialize(t)));
        });
    });
    it('should filter by operator', () => {
      return request(app.getHttpServer())
        .get('/test?filter[id]=' + encodeURIComponent('$lte:2'))
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(testData.filter((data) => data.id <= 2).map((t) => serialize(t)));
        });
    });
    it('should filter same field by two operators', () => {
      return request(app.getHttpServer())
        .get('/test?filter[id]=' + encodeURIComponent('$lte:4') + '&filter[id]=' + encodeURIComponent('$gte:2'))
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(testData.filter((data) => data.id >= 2 && data.id <= 4).map((t) => serialize(t)));
        });
    });
    it('should support changing the operaand', () => {
      const ourDatePlusFive = new Date(startDate);
      ourDatePlusFive.setDate(ourDatePlusFive.getDate() + 5);
      return request(app.getHttpServer())
        .get(`/test/change-operand-separator?filter[updatedAt]=${encodeURIComponent(`$lt@@@${ourDatePlusFive.toISOString()}`)}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(
            testData
              .slice(0, 5)
              .filter((data) => {
                return data.updatedAt.getTime() <= ourDatePlusFive.getTime();
              })
              .map((t) => serialize(t))
          );
        });
    });
  });

  describe('sorting', () => {
    it('should return the first page with sorting by id (DESC)', () => {
      return request(app.getHttpServer())
        .get('/test?sortBy=property[id];direction[desc];')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(
            sortBy(testData, [{ property: 'id', direction: QueryOrder.desc }])
              .slice(0, 10)
              .map((t) => serialize(t))
          );
        });
    });

    it('should return the first page with sorting by description (DESC, nulls first)', () => {
      return request(app.getHttpServer())
        .get('/test?sortBy=property[description];direction[desc];nulls-first[true];&sortBy=property[id];direction[asc];')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(
            sortBy(testData, [{ property: 'description', direction: QueryOrder.desc, nullsFirst: true }])
              .slice(0, 10)
              .map((t) => serialize(t))
          );
        });
    });

    it('should return the first page with sorting by description (DESC, nulls last) and by id (ASC)', () => {
      return request(app.getHttpServer())
        .get('/test?sortBy=property[description];direction[desc];nulls-first[false];&sortBy=property[id];direction[asc];')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(
            sortBy(testData, [
              { property: 'description', direction: QueryOrder.desc, nullsFirst: false },
              { property: 'id', direction: QueryOrder.asc }
            ])
              .slice(0, 10)
              .map((t) => serialize(t))
          );
        });
    });

    describe('enableSort', () => {
      it('should not return sorted results when querying with sort but enableSort is false', () => {
        return request(app.getHttpServer())
          .get('/test/enable-sort-false?sort=property[id];direction[desc];')
          .expect(200)
          .expect((response) => {
            expect(response.body.data).toStrictEqual(testData.slice(0, 10).map((t) => serialize(t)));
          });
      });
    });
  });

  describe('enableUnpaged', () => {
    it('should not return unpaged results when querying with unpaged by default', () => {
      return request(app.getHttpServer())
        .get('/test?unpaged=true')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(testData.slice(0, 10).map((t) => serialize(t)));
        });
    });
    it('should return unpaged results when querying with unpaged and enableUnpaged is true', () => {
      return request(app.getHttpServer())
        .get('/test/enable-unpaged-true?unpaged=true')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(testData.map((t) => serialize(t)));
        });
    });
  });

  describe('enableSize', () => {
    it('should return the first page (size of 10) when querying size of 5 but enableSize is false', () => {
      return request(app.getHttpServer())
        .get('/test/enable-size-false?limit=5')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(testData.slice(0, 10).map((t) => serialize(t)));
        });
    });
  });

  describe('limit', () => {
    it('should return five items on the second page (size of 10) when limit is set to 15', () => {
      return request(app.getHttpServer())
        .get('/test/limit-15?page=2')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(testData.slice(10, 15).map((t) => serialize(t)));
        });
    });
  });

  describe('maxSize', () => {
    it('should return the first page (size of 5) when querying size of 10 but maxSize is 5', () => {
      return request(app.getHttpServer())
        .get('/test/max-size-5?limit=10')
        .expect(200)
        .expect((response) => {
          expect(response.body.data).toStrictEqual(testData.slice(0, 5).map((t) => serialize(t)));
        });
    });
  });

  // describe('limit & unpaged', () => {});
});

function serialize({ id, title, description, createdAt, updatedAt }: TestDto) {
  return {
    id,
    title,
    description,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  };
}

function sortBy(testDtos: TestDto[], sorts: Sort[]) {
  for (let i = 0; i < sorts.length; i++) {
    testDtos.sort((a, b) => {
      const propsToCheck = sorts.slice(0, i).map((sort) => sort.property) as (keyof TestDto)[];
      if (propsToCheck.every((prop) => a[prop] === b[prop])) {
        const aProp = a[sorts[i].property as keyof TestDto];
        const bProp = b[sorts[i].property as keyof TestDto];
        if (aProp === null && bProp === null) {
          return 1;
        }
        if (aProp === null) {
          return sorts[i].nullsFirst ? -1 : 1;
        }
        if (bProp === null) {
          return sorts[i].nullsFirst ? 1 : -1;
        }
        if (sorts[i].direction === QueryOrder.asc) {
          return aProp < bProp ? -1 : 1;
        }
        return aProp > bProp ? -1 : 1;
      }
      return 1;
    });
  }
  return testDtos;
}
