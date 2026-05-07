import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
} from 'class-validator';

export class CreateLostItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsInt()
  cinemaId?: number;

  @IsDateString()
  lostDate: string;

  @IsOptional()
  @IsString()
  lostTime?: string;

  @IsString()
  @IsNotEmpty()
  itemCategory: string;

  @IsString()
  @IsNotEmpty()
  itemDescription: string;

  @IsString()
  @IsNotEmpty()
  lostPlace: string;
}
