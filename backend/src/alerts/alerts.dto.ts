import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum AlertSeverity {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical',
}

export enum AlertStatus {
  active = 'active',
  resolved = 'resolved',
}

export class CreateAlertDto {
  @ApiProperty()
  @IsString()
  regionId: string;

  @ApiProperty({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;
}

export class UpdateAlertDto {
  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;
}
