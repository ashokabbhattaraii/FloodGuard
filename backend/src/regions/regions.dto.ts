import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum RiskLevel {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical',
}

export class CreateRegionDto {
  @ApiProperty({ example: 'Kathmandu Valley' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'GeoJSON polygon coordinates' })
  @IsOptional()
  @IsObject()
  coordinates?: object;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;
}
