import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsObject, Min } from 'class-validator';

export class CreateEvacuationRouteDto {
  @ApiProperty({ example: 'region-uuid-here' })
  @IsString()
  regionId: string;

  @ApiProperty({ example: 'Metro Sports Complex' })
  @IsString()
  shelterName: string;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(0)
  capacity: number;

  @ApiPropertyOptional({ description: 'JSON structure containing routes, descriptions, or coordinates' })
  @IsOptional()
  @IsObject()
  routeData?: object;
}

export class UpdateEvacuationRouteDto {
  @ApiPropertyOptional({ example: 'region-uuid-here' })
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional({ example: 'Metro Sports Complex' })
  @IsOptional()
  @IsString()
  shelterName?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional({ description: 'JSON structure containing routes, descriptions, or coordinates' })
  @IsOptional()
  @IsObject()
  routeData?: object;
}
