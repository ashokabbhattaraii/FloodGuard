import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';

export enum RequestType {
  evacuation = 'evacuation',
  rescue = 'rescue',
  relief = 'relief',
  medical = 'medical',
  shelter = 'shelter',
}
export enum RequestPriority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical',
}
export enum RequestStatus {
  pending = 'pending',
  assigned = 'assigned',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
}

export class CreateFloodRequestDto {
  @ApiProperty({ enum: RequestType }) @IsEnum(RequestType) type: RequestType;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsString() location: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) peopleCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() regionId?: string;
  @ApiPropertyOptional({ enum: RequestPriority })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;
}

export class UpdateFloodRequestDto {
  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ enum: RequestPriority })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;
}
