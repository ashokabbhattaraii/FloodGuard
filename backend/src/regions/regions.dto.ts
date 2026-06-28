import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

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

  @ApiPropertyOptional({ example: 'Flood-prone area near Bagmati River' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'GeoJSON polygon coordinates for region boundaries' })
  @IsOptional()
  @IsObject()
  coordinates?: object;

  @ApiPropertyOptional({ example: 27.7172 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  centerLat?: number;

  @ApiPropertyOptional({ example: 85.3240 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  centerLng?: number;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  population?: number;

  @ApiPropertyOptional({ example: 12.5, description: 'Area in square kilometers' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  area?: number;

  @ApiPropertyOptional({ example: 'admin-user-id' })
  @IsOptional()
  @IsString()
  adminId?: string;
}

export class UpdateRegionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  coordinates?: object;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  centerLat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  centerLng?: number;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  population?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  area?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminId?: string;
}

export class AssignVolunteerDto {
  @ApiProperty({ example: 'user-id-123' })
  @IsString()
  userId: string;
}

export class CreateSensorDto {
  @ApiProperty({ example: 'water_level' })
  @IsString()
  type: 'water_level' | 'rainfall';

  @ApiProperty({ example: 'Bagmati River Monitor #3' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 27.7172 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: 85.3240 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({ example: 3.5 })
  @IsNumber()
  @Type(() => Number)
  threshold: number;

  @ApiProperty({ example: 2.1 })
  @IsNumber()
  @Type(() => Number)
  currentValue: number;

  @ApiPropertyOptional({ example: 'm', default: 'm' })
  @IsOptional()
  @IsString()
  unit?: string;
}

export class UpdateSensorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  threshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
