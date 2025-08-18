import { QueryBuilder } from '@mikro-orm/knex';
import { ColumnsFilters, FilterToken, PaginateQuery } from './types';
import { GroupOperator, QBFilterQuery, QueryOperator } from '@mikro-orm/core';
import { fixColumnAlias, getKeyByValue, getPropertiesByColumnName, isISODate } from './helpers';

export function parseFilter(query: PaginateQuery, operandSeperator: string): ColumnsFilters {
  if (!query.filter) {
    return {};
  }

  const MAX_OPERATOR = 4; // eg: $and:$not:$eq:$null

  const filters: ColumnsFilters = {};
  Object.keys(query.filter).map((column) => {
    const input = query.filter[column];
    const statements = !Array.isArray(input) ? [input] : input;
    statements.map((raw) => {
      if (raw === undefined || raw === null) {
        return null;
      }

      const token: FilterToken = {
        comparator: getKeyByValue(GroupOperator, GroupOperator.$and),
        suffix: undefined,
        operator: getKeyByValue(QueryOperator, QueryOperator.$eq),
        value: undefined
      };

      const matches = raw.split(operandSeperator);
      const maxOperandCount = matches.length > MAX_OPERATOR ? MAX_OPERATOR : matches.length;

      for (let i = 0; i < maxOperandCount; i++) {
        // Is operator
        if (matches[i].startsWith('$')) {
          // Suffix operator $not
          if (matches[i] === getKeyByValue(QueryOperator, QueryOperator.$not)) {
            token.suffix = matches[i] as keyof typeof QueryOperator;
          }
          // Is GroupOperator
          else if (Object.keys(GroupOperator).includes(matches[i])) {
            token.comparator = matches[i] as keyof typeof GroupOperator;
          }
          // Is QueryOperator
          else if (Object.keys(QueryOperator).includes(matches[i])) {
            token.operator = matches[i] as keyof typeof QueryOperator;
          }
        } else {
          const fixValue = (value: string) => (isISODate(value) ? new Date(value) : value);
          switch (QueryOperator[token.operator]) {
            case QueryOperator.$in:
            case QueryOperator.$contains:
              token.value = matches[i]?.split(',') as string[];
              break;
            case QueryOperator.$ilike:
              token.value = `%${matches[i]}%`;
              break;
            default:
              token.value = fixValue(matches[i] as string);
              break;
          }
        }
      }

      filters[column] = [...(filters[column] || []), token];
    });
  });

  return filters;
}

export function addWhereCondition<T extends object>(qb: QueryBuilder<T>, column: string, filter: ColumnsFilters): QBFilterQuery<T> {
  const columnProperties = getPropertiesByColumnName(column);
  const alias = fixColumnAlias(columnProperties, qb);
  const filterQuery: QBFilterQuery<T> = {};

  if (!columnProperties.isNested) {
    const logicalOperator = filter[column].some(({ comparator }) => comparator === '$or') ? '$or' : '$and';
    qb.andWhere({
      [logicalOperator]: [
        ...filter[column].map((columnFilter) => {
          if (columnFilter.suffix) {
            return {
              [alias]: {
                [columnFilter.suffix]: {
                  [columnFilter.operator]: columnFilter.value
                }
              }
            };
          }
          return { [alias]: { [columnFilter.operator]: columnFilter.value } };
        })
      ]
    });
  } else {
    // TODO: sub-query like `where "Genre"."id" in (SELECT id FROM "Genre" WHERE "Genre".slug = 'techno' OR "Genre".slug = 'trance')`
    // const em = (qb as any).em as EntityManager;
    // const qb2 = em.createQueryBuilder("Genre");
    // qb2.select("id").andWhere({
    //   $or: [
    //     ...filter[column].map((columnFilter) => {
    //       return { [alias]: { [columnFilter.operator]: columnFilter.value } };
    //     }),
    //   ],
    // });
    //
    // qb.andWhere({ "Genre.id": { $in: qb2.getKnexQuery() } });
    // console.log(qb.getQuery());
  }

  return filterQuery;
}

export function addFilter<T extends object>(qb: QueryBuilder<T>, query: PaginateQuery, operandSeperator: string): QueryBuilder<T> {
  const filter = parseFilter(query, operandSeperator);
  const filterEntries = Object.entries(filter);

  filterEntries.map(([column]) => {
    addWhereCondition(qb, column, filter);
  });

  return qb;
}
