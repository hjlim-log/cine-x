import { IsInt, IsDateString, IsString, IsIn } from 'class-validator';

export class CreateScreeningDto {
  @IsInt()
  movieId: number;

  @IsInt()
  screenId: number;

  @IsDateString()
  startTime: string;

  @IsString()
  @IsIn(['2D', '3D'])
  screenType: string;
}
