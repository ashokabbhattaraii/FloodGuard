import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export class UpdateRegionRiskDto {
  @IsIn(RISK_LEVELS)
  riskLevel: string;

  @IsOptional() @IsNumber() @Min(0) @Max(100)
  score?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100)
  confidence?: number;

  @IsOptional() @IsString()
  source?: string;
}

export class CreateInternalAlertDto {
  @IsString()
  regionId: string;

  @IsIn(RISK_LEVELS)
  severity: string;

  @IsString() @MaxLength(200)
  title: string;

  @IsString() @MaxLength(4000)
  message: string;

  @IsOptional() @IsString()
  dedupeKey?: string;

  @IsOptional() @IsString()
  source?: string;
}

export class CreateInternalReportDto {
  @IsString()
  regionId: string;

  @IsString() @MaxLength(2000)
  description: string;

  @IsNumber() @Min(-90) @Max(90)
  latitude: number;

  @IsNumber() @Min(-180) @Max(180)
  longitude: number;

  @IsOptional() @IsIn(RISK_LEVELS)
  severity?: string;

  @IsOptional() @IsString()
  photoKey?: string;

  @IsOptional() @IsString() @MaxLength(120)
  reporterName?: string;
}

export class UploadVerificationDto {
  @IsString()
  key: string;

  @IsIn(['verified', 'rejected'])
  verdict: 'verified' | 'rejected';

  @IsOptional() @IsString()
  detectedType?: string | null;

  @IsOptional() @IsNumber()
  bytes?: number;
}
