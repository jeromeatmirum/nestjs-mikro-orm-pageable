import { vi, type Mock } from 'vitest';
import { EntityRepository, SqlEntityRepository } from '@mikro-orm/knex';
import { QueryOrder } from '@mikro-orm/core';
import { PageFactory } from './page-factory';
import { DriverName, PaginateQuery } from './types';

type QbTestMethodMap = {
  clone: Mock;
  select: Mock;
  join: Mock;
  leftJoin: Mock;
  joinAndSelect: Mock;
  from: Mock;
  where: Mock;
  andWhere: Mock;
  orderBy: Mock;
  limit: Mock;
  offset: Mock;
  getCount: Mock;
  getResultList: Mock;
};

const defaultUrl = new URL('http://localhost:3000');

const defaultPageable: PaginateQuery = {
  currentPage: 1,
  itemsPerPage: 10,
  offset: 0,
  totalPages: 0,
  totalItems: 0,
  unpaged: false,
  sortBy: [],
  filter: {}
};

const pageableFactory = (values?: Partial<PaginateQuery>): PaginateQuery => ({
  ...defaultPageable,
  ...values
});

const addFactoryArgs = (values: PaginateQuery): PaginateQuery => {
  return {
    ...values,
    url: defaultUrl
  };
};

const paginatedOutput = (values?: Partial<PaginateQuery>) => {
  const currentPage = values?.currentPage ?? 0;
  const totalPages = values?.totalPages ?? 0;
  const nextPage = currentPage < totalPages ? currentPage + 1 : undefined;
  const previousPage = currentPage > 1 ? currentPage - 1 : undefined;
  const url = values?.url ?? defaultUrl;
  const linksBaseUrl = `${url.origin}${url.pathname}`;
  return {
    meta: values,
    links:
      (values?.totalPages ?? 0 > 0)
        ? {
            current: `${linksBaseUrl}?page=${values?.currentPage}&limit=${values?.itemsPerPage}`,
            first: `${linksBaseUrl}?page=1&limit=${values?.itemsPerPage}`,
            last: `${linksBaseUrl}?page=${values?.totalPages}&limit=${values?.itemsPerPage}`,
            next: nextPage ? `${linksBaseUrl}?page=${nextPage}&limit=${values?.itemsPerPage}` : undefined,
            previous: previousPage ? `${linksBaseUrl}?page=${previousPage}&limit=${values?.itemsPerPage}` : undefined
          }
        : {}
  };
};

const mockRepoFactory = <T extends object = any>(values?: { count?: number; resultList?: T[]; driverName?: DriverName | string }): [SqlEntityRepository<T>, QbTestMethodMap, Mock] => {
  const { count = 0, resultList = [], driverName = '' } = values || {};
  const qbTestMethodMap: QbTestMethodMap = {
    clone: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    joinAndSelect: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    getCount: vi.fn().mockResolvedValue(count),
    getResultList: vi.fn().mockReturnValue(resultList)
  };
  const createQueryBuilder = vi.fn().mockReturnValue(qbTestMethodMap);
  return [
    {
      createQueryBuilder,
      getEntityManager: vi.fn().mockReturnValue({
        getDriver: vi.fn().mockReturnValue({
          constructor: {
            name: driverName
          }
        })
      })
    } as unknown as EntityRepository<T>,
    qbTestMethodMap,
    createQueryBuilder
  ];
};

describe('PageFactory', () => {
  describe('the "create" method', () => {
    describe('with default pagination options', () => {
      it('should create a Paginated object given a repository', async () => {
        const [mockRepo] = mockRepoFactory();
        const pageable = pageableFactory();
        const page = await new PageFactory(addFactoryArgs(pageable), mockRepo).create();
        expect(page).toEqual({
          data: [],
          ...paginatedOutput(pageable)
        });
      });
    });
    describe('with custom pagination options', () => {
      it('should create a Paginated object given a repository', async () => {
        const count = 20;
        const resultList = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
        const [mockRepo] = mockRepoFactory({
          count,
          resultList
        });
        const pageable = pageableFactory({
          currentPage: 1,
          itemsPerPage: 5,
          offset: 5
        });
        const page = await new PageFactory(addFactoryArgs(pageable), mockRepo).create();
        expect(page).toEqual({
          data: resultList,
          ...paginatedOutput({ ...pageable, totalPages: 4, totalItems: count })
        });
      });
    });
  });
  describe('the "config" method', () => {
    describe('select', () => {
      it('should pass the right values to the select method on the query builder', async () => {
        const [mockRepo, qbTestMethodMap] = mockRepoFactory();
        const pageable = pageableFactory();
        await new PageFactory(addFactoryArgs(pageable), mockRepo)
          .config({
            select: ['id', 'name']
          })
          .create();
        expect(qbTestMethodMap.select).toHaveBeenCalledWith(['id', 'name']);
      });
    });
    describe('sortable', () => {
      it('should filter the sort array to only include the sortable fields', async () => {
        const [mockRepo, qbTestMethodMap] = mockRepoFactory();
        const pageable = pageableFactory({
          sortBy: [
            {
              property: 'id',
              direction: QueryOrder.asc,
              nullsFirst: true
            },
            {
              property: 'name',
              direction: QueryOrder.desc,
              nullsFirst: false
            },
            {
              property: 'age',
              direction: QueryOrder.asc
            },
            {
              property: 'gender',
              direction: QueryOrder.desc
            },
            {
              property: 'notSortable',
              direction: QueryOrder.asc,
              nullsFirst: false
            }
          ]
        });
        await new PageFactory(addFactoryArgs(pageable), mockRepo)
          .config({
            sortable: ['id', 'name', 'age', 'gender']
          })
          .create();
        expect(qbTestMethodMap.orderBy).toHaveBeenCalledWith({
          id: QueryOrder.ASC_NULLS_FIRST,
          name: QueryOrder.DESC_NULLS_LAST,
          age: QueryOrder.ASC,
          gender: QueryOrder.DESC
        });
      });
    });
    describe('relations', () => {
      it('should call the join method on the query builder for each relation', async () => {
        const [mockRepo, qbTestMethodMap] = mockRepoFactory();
        const pageable = pageableFactory();
        await new PageFactory(addFactoryArgs(pageable), mockRepo)
          .config({
            relations: [
              {
                property: 'a'
              },
              {
                property: 'b',
                type: 'leftJoin'
              },
              {
                property: 'b.c',
                alias: 'cAlias',
                cond: { 'b.id': 'c.id' },
                path: 'b.c'
              }
            ]
          })
          .create();
        expect(qbTestMethodMap.join).toHaveBeenCalledTimes(2);
        expect(qbTestMethodMap.join).toHaveBeenCalledWith('a', 'a', undefined);
        expect(qbTestMethodMap.leftJoin).toHaveBeenCalledWith('b', 'b', undefined);
        expect(qbTestMethodMap.join).toHaveBeenCalledWith('b.c', 'cAlias', { 'b.id': 'c.id' });
      });
    });
    describe('where', () => {
      it('should call the where method on the query builder given where', async () => {
        const [mockRepo, qbTestMethodMap] = mockRepoFactory();
        const pageable = pageableFactory();
        const where = {
          $and: [{ id: { $gt: 1 }, 'length(title)': { $gt: 1 } }]
        };
        await new PageFactory(addFactoryArgs(pageable), mockRepo)
          .config({
            where
          })
          .create();
        expect(qbTestMethodMap.andWhere).toHaveBeenCalledWith(where);
      });
    });
    describe('alias', () => {
      it('should pass the alias to createQueryBuilder given alias', async () => {
        const [mockRepo, _qbTestMethodMap, createQueryBuilder] = mockRepoFactory();
        const pageable = pageableFactory();
        const alias = 'testAlias';
        await new PageFactory(addFactoryArgs(pageable), mockRepo)
          .config({
            alias
          })
          .create();
        expect(createQueryBuilder).toHaveBeenCalledWith(alias);
      });
    });
  });
  describe('the "map" method', () => {
    it('should return the original result if no mapper is provided', async () => {
      const resultList = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
      const [mockRepo] = mockRepoFactory({
        count: 5,
        resultList
      });
      const pageable = pageableFactory();
      const page = await new PageFactory(addFactoryArgs(pageable), mockRepo).create();
      expect(page.data).toEqual(resultList);
    });

    it('should return the mapped result if a mapper is provided', async () => {
      const resultList = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
      const [mockRepo] = mockRepoFactory<{ id: number }>({
        count: 5,
        resultList
      });
      const pageable = pageableFactory();
      const page = await new PageFactory(addFactoryArgs(pageable), mockRepo).map((result) => ({ ...result, idPlus1: result.id + 1 })).create();
      expect(page.data).toEqual(resultList.map((item) => ({ ...item, idPlus1: item.id + 1 })));
    });
  });
});
