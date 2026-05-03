import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CreateOneOnOneDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsInt()
  cinemaId?: number;
}
