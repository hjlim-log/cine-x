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

export class CreateMovieDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsInt()
  @Min(1)
  @Max(500)
  runtime: number;

  @IsString()
  rating: string;

  @IsString()
  @MaxLength(2000)
  synopsis: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsDateString()
  releaseDate: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  genres: string[];
}
