import { PaginateOptions, PaginateQuery } from './types';

export const defaultPaginate: PaginateQuery = {
  currentPage: 1,
  itemsPerPage: 10,
  offset: 0,
  totalPages: 0,
  totalItems: 0,
  unpaged: false,
  sortBy: [],
  filter: {}
};

export const DEFAULT_MAX_SIZE = 100;
export const DEFAULT_OPERAND_SEPARATOR = ':';

export const defaultPaginateOptions: Required<PaginateOptions> = {
  enableUnpaged: false,
  enableSize: true,
  enableSort: true,
  limit: null,
  maxSize: DEFAULT_MAX_SIZE,
  operandSeparator: DEFAULT_OPERAND_SEPARATOR
};

export const sortRegex = {
  property: /^property\[(?<property>[\s\S]+)]$/,
  direction: /^direction\[(?<direction>(asc|desc))]$/,
  nullsFirst: /^nulls-first\[(?<nullsFirst>(true|false))]$/
};
