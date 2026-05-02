import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

class ApplyPartnerDiscountDto {
  @IsOptional() @IsInt() @Min(1) partnerDiscountId?: number;
}

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(
    @GetUser() user: { id: number },
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.create(user.id, dto);
  }

  @Get('me')
  findMine(@GetUser() user: { id: number }) {
    return this.reservationsService.findMyReservations(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: { id: number },
  ) {
    return this.reservationsService.findOne(id, user.id);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: { id: number },
  ) {
    return this.reservationsService.cancel(id, user.id);
  }

  @Patch(':id/partner-discount')
  applyPartnerDiscount(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: { id: number },
    @Body() dto: ApplyPartnerDiscountDto,
  ) {
    return this.reservationsService.applyPartnerDiscount(id, user.id, dto.partnerDiscountId);
  }
}
