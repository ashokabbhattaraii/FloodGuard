import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const PERIODS = ['7D', '30D', '90D'] as const;

export class AnalyticsPeriodDto {
  @IsIn(PERIODS)
  period!: (typeof PERIODS)[number];
}

export class AnalyticsRangeDto {
  @IsIn(PERIODS)
  period!: (typeof PERIODS)[number];

  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  severity?: string;
}

export class TopRegionsQueryDto extends AnalyticsRangeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class AnalyticsLimitDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
