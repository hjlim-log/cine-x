import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { AdminCouponsService } from './admin-coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { IssueCouponDto } from './dto/issue-coupon.dto';
import { BulkIssueCouponDto } from './dto/bulk-issue-coupon.dto';
import { BulkIssueExecuteDto } from './dto/bulk-issue-execute.dto';

@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCouponsController {
  constructor(private readonly service: AdminCouponsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }

  @Post('issue')
  issueToOne(@Body() dto: IssueCouponDto) {
    return this.service.issueToOne(dto);
  }

  @Post('bulk-issue/preview')
  previewBulkIssue(@Body() dto: BulkIssueCouponDto) {
    return this.service.previewBulkIssue(dto);
  }

  @Post('bulk-issue/execute')
  executeBulkIssue(@Body() dto: BulkIssueExecuteDto) {
    return this.service.executeBulkIssue(dto);
  }
}
