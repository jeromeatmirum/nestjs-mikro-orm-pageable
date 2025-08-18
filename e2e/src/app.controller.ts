import { Controller, Get } from '@nestjs/common';
import { PaginateQuery, Paginate, PaginateResponse } from '../../src';
import { TestDto } from './test.dto';
import { AppService } from './app.service';

@Controller('/test')
export class AppController {
  constructor(private appService: AppService) {}
  @Get('/')
  getTests(@Paginate() pageable: PaginateQuery): Promise<PaginateResponse<TestDto>> {
    return this.appService.listTests(pageable);
  }

  @Get('/enable-unpaged-true')
  getTestsEnableUnpagedTrue(@Paginate({ enableUnpaged: true }) pageable: PaginateQuery): Promise<PaginateResponse<TestDto>> {
    return this.appService.listTests(pageable);
  }

  @Get('/enable-size-false')
  getTestsEnableSizeFalse(@Paginate({ enableSize: false }) pageable: PaginateQuery): Promise<PaginateResponse<TestDto>> {
    return this.appService.listTests(pageable);
  }

  @Get('/enable-sort-false')
  getTestsEnableSortFalse(@Paginate({ enableSort: false }) pageable: PaginateQuery): Promise<PaginateResponse<TestDto>> {
    return this.appService.listTests(pageable);
  }

  @Get('/limit-15')
  getTestsLimit15(@Paginate({ limit: 15 }) pageable: PaginateQuery): Promise<PaginateResponse<TestDto>> {
    return this.appService.listTests(pageable);
  }

  @Get('/max-size-5')
  getTestsMaxSize5(@Paginate({ maxSize: 5 }) pageable: PaginateQuery): Promise<PaginateResponse<TestDto>> {
    return this.appService.listTests(pageable);
  }

  @Get('/change-operand-separator')
  async getChangeOperandSeparator(@Paginate({ operandSeparator: '@@@' }) pageable: PaginateQuery): Promise<PaginateResponse<TestDto>> {
    return await this.appService.listTests(pageable);
  }
}
