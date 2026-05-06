import {
  IsInt,
  IsDateString,
  IsString,
  IsIn,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class BulkCreateScreeningDto {
  @IsInt()
  movieId: number;

  @IsInt()
  screenId: number;

  @IsString()
  @IsIn(['2D', '3D'])
  screenType: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsIn(['DAILY', 'WEEKDAY', 'WEEKEND'])
  repeatPattern: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  timeSlots: string[];
}
