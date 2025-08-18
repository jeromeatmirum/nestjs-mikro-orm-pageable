import { ApiExtraModels, ApiOkResponse, ApiQuery, getSchemaPath } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { defaultPaginateOptions } from '../constants';
import { PaginateOptions } from '../types';
import { PaginateResponse } from '../dtos';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function ApiPaginate(pageableOptions: PaginateOptions & { dto?: Function } = {}) {
  const { enableUnpaged, enableSize, enableSort, maxSize, dto } = { ...defaultPaginateOptions, ...pageableOptions };
  return applyDecorators(
    ApiQuery({ name: 'filter', type: 'object', style: 'deepObject', explode: true, required: false, description: 'Filter properties' }),
    ApiQuery({ name: 'page', required: false, description: 'Paginated number (starting from 1)', schema: { type: 'integer', minimum: 0 } }),
    enableSize ? ApiQuery({ name: 'limit', required: false, description: 'Number of items on each page', schema: { type: 'integer', minimum: 0, maximum: maxSize } }) : () => {},
    enableSort
      ? ApiQuery({
          name: 'sortBy',
          required: false,
          description: `Sorting of items via pattern: property[name];direction[asc|desc];`,
          schema: { type: 'array', items: { type: 'string' } }
        })
      : () => {},
    enableUnpaged ? ApiQuery({ name: 'unpaged', required: false, type: 'boolean', description: 'Set to true to retrieve all items without pagination' }) : () => {},
    ApiExtraModels(PaginateResponse, dto ?? (() => {})),
    ApiOkResponse({
      description: 'Paginated of items',
      schema: {
        allOf: [{ $ref: getSchemaPath(PaginateResponse) }, { properties: { data: { type: 'array', items: dto ? { $ref: getSchemaPath(dto) } : undefined } } }]
      }
    })
  );
}
