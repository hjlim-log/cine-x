import { IsString, IsOptional } from 'class-validator';

export class DeactivateDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
