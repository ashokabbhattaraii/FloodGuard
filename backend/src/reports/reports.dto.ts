import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum ReportStatus {
  pending = 'pending',
  verified = 'verified',
  rejected = 'rejected',
}

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  waterLevel?: number;
}

export class ReviewReportDto {
  @ApiProperty({ enum: ReportStatus })
  @IsEnum(ReportStatus)
  status: ReportStatus;
}
