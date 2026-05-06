import {
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  IsArray,
  MaxLength,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';

export class UpdateMovieDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  runtime?: number;

  @IsOptional()
  @IsString()
  rating?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  synopsis?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  genres?: string[];
}
