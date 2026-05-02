import {
  IsInt,
  IsArray,
  ArrayMinSize,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AudienceCountsDto {
  @IsOptional() @IsInt() @Min(0) ADULT?: number;
  @IsOptional() @IsInt() @Min(0) TEEN?: number;
  @IsOptional() @IsInt() @Min(0) SENIOR?: number;
  @IsOptional() @IsInt() @Min(0) DISABLED?: number;
  @IsOptional() @IsInt() @Min(0) CHILD?: number;
}

export class CreateReservationDto {
  @IsInt({ message: '상영 ID를 입력해주세요.' })
  screeningId: number;

  @IsArray({ message: '좌석 목록이 필요합니다.' })
  @ArrayMinSize(1, { message: '좌석을 최소 1개 선택해주세요.' })
  @IsInt({ each: true })
  seatIds: number[];

  @ValidateNested()
  @Type(() => AudienceCountsDto)
  audienceCounts: AudienceCountsDto;

  @IsOptional()
  @IsInt()
  userCouponId?: number;
}
