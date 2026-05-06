import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminCustomersService } from './admin-customers.service';
import { ChangeGradeDto } from './dto/change-grade.dto';
import { DeactivateDto } from './dto/deactivate.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';

@Controller('admin/customers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCustomersController {
  constructor(private readonly service: AdminCustomersService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('gradeNames') gradeNames?: string | string[],
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list({
      search,
      gradeNames: gradeNames
        ? Array.isArray(gradeNames)
          ? gradeNames
          : [gradeNames]
        : undefined,
      includeInactive: includeInactive === 'true',
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @Patch(':id/grade')
  changeGrade(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeGradeDto,
  ) {
    return this.service.changeGrade(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeactivateDto,
  ) {
    return this.service.deactivate(id, dto);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivate(id);
  }
}
