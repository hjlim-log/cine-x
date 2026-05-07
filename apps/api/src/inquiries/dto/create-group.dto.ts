import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsInt()
  cinemaId?: number;

  @IsString()
  @IsNotEmpty()
  groupType: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  expectedCount: number;

  @IsDateString()
  preferredDate: string;

  @IsString()
  @IsNotEmpty()
  preferredTime: string;

  @IsString()
  @IsNotEmpty()
  contactPhone: string;
}
