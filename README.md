<div align="center">
  <h1> NestJS Mikro-ORM Paginate </h1>
</div>

A query package for convenient pagination, filtering and sorting implementation with [MikroORM](https://mikro-orm.io)
repositories in [Nest.js](https://nestjs.com).

> This is a fork of [emulienfou/nestjs-mikro-orm-pageable](https://github.com/emulienfou/nestjs-mikro-orm-pageable),
> published as `@jeromeatmirum/nestjs-mikro-orm-paginate`.

## Features

- Pagination conforms to [JSON:API](https://jsonapi.org)
- Sort by multiple fields
- Sort by nulls first or last
- Unpaged response (i.e., disabling pagination)
- Various pagination behavior and constraints configuration
- Filter using
  operators (`$eq`, `$in`, `$nin`, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$not`, `$like`, `$re`, `$fulltext`, `$exists`, `$ilike`, `$overlap`, `$contains`, `$contained`)

## Limitations

- Only work with Rest API
- Only support MySQL, MariaDB, PostgreSQL and SQLite
- Only support offset pagination

## Guide

### Prerequisites

- \>= Nest.js ^8 || ^9 || ^10
- \>= MikroORM ^5.7 || ^6
- \>= Typescript 5.0.4

### Installation

```bash
# With Yarn
yarn add @jeromeatmirum/nestjs-mikro-orm-paginate
# With NPM
npm install @jeromeatmirum/nestjs-mikro-orm-paginate
# With PNPM
pnpm add @jeromeatmirum/nestjs-mikro-orm-paginate
```

### Basic Usage

```typescript
// articles.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Paginate, PaginateResponse } from '@jeromeatmirum/nestjs-mikro-orm-paginate';
import { ArticlesService } from './articles.service.ts';
import { ArticleDto } from './dtos/article.dto.ts';

@Controller('/articles')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {
  }

  @Get('/')
  getArticles(@Paginate() query: PaginateQuery): Promise<PaginateResponse<ArticlesDto>> {
    return this.articlesService.listArticles(query);
  }
}
```

```typescript
// articles.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/sqlite';
import { PaginateQuery, PaginateResponse, PageFactory } from '@jeromeatmirum/nestjs-mikro-orm-paginate';
import { ArticleEntity } from './article.entity';
import { ArticleDto } from './dtos/article.dto.ts';

@Injectable()
export class ArticlesService {
  constructor(@InjectRepository(ArticleEntity) private articleRepository: EntityRepository<ArticleEntity>) {
  }

  async listArticles(query: PaginateQuery): Promise<PaginateResponse<ArticleDto>> {
    return await new PageFactory(query, this.articleRepository).create();
  }
}
```

With `@Paginate`, you can now provide the below query parameters to `/articles`:

- page: the page number, starting from 1, e.g., `?page=1`
- limit: the page size, default to 10, e.g., `?limit=20`
- sort: the sort expression, e.g., `?sort=property[field1];direction[asc];nulls-first[true]`
- unpaged: whether to disable pagination, default to false, e.g., `?unpaged=true`
- filter:

### Response Shape

An example of the response shape is shown as below:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Article 1",
      "content": "Content 1",
      "createdAt": "2021-08-01T00:00:00.000Z",
      "updatedAt": "2021-08-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "totalItems": 1,
    "currentPage": 1,
    "totalPages": 1,
    "itemsPerPage": 10,
    "offset": 0,
    "sort": [
      {
        "property": "id",
        "direction": "ASC",
        "nullsFirst": false
      }
    ],
    "unpaged": false,
    "filter": {}
  },
  "links": {
    "first": "http://localhost:3000/cats?limit=5&page=1&sortBy=color:DESC&search=i&filter.age=$gte:3",
    "previous": "http://localhost:3000/cats?limit=5&page=1&sortBy=color:DESC&search=i&filter.age=$gte:3",
    "current": "http://localhost:3000/cats?limit=5&page=2&sortBy=color:DESC&search=i&filter.age=$gte:3",
    "next": "http://localhost:3000/cats?limit=5&page=3&sortBy=color:DESC&search=i&filter.age=$gte:3",
    "last": "http://localhost:3000/cats?limit=5&page=3&sortBy=color:DESC&search=i&filter.age=$gte:3"
  }
}
```

### Swagger support

Use the `@ApiPaginate` decorator for swagger integration:

```typescript
// articles.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiPaginate, Paginate } from '@jeromeatmirum/nestjs-mikro-orm-paginate';
import { ArticlesService } from './articles.service.ts';
import { ArticleDto } from './dtos/article.dto.ts';

@Controller('/articles')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {
  }

  @Get('/')
  @ApiPaginate({
    dto: ArticleDto,
  })
  getArticles(@Paginate() query: PaginateQuery): Promise<PaginateResponse<ArticlesDto>> {
    return this.articlesService.listArticles(query);
  }
}
```
