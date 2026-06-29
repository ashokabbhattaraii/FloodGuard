import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateHelpRequestDto {
  @IsString()
  @IsNotEmpty()
  floodRequestId: string;

  @IsString()
  @IsNotEmpty()
  requestedTo: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class RespondToHelpRequestDto {
  @IsEnum(['accepted', 'rejected'])
  status: 'accepted' | 'rejected';

  @IsString()
  @IsOptional()
  responseMessage?: string;
}
