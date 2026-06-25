import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class PresignUploadDto {
  @IsString()
  filename: string;

  @IsString()
  contentType: string;
}

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Get a presigned URL to upload a file to S3' })
  presignUpload(@Body() dto: PresignUploadDto) {
    return this.uploadsService.generateUploadUrl(dto.filename, dto.contentType);
  }

  @Get('*key')
  @ApiOperation({ summary: 'Get a presigned URL to download a file from S3' })
  getDownloadUrl(@Param('key') key: string) {
    return this.uploadsService.generateDownloadUrl(key);
  }

  @Delete('*key')
  @ApiOperation({ summary: 'Delete a file from S3' })
  deleteFile(@Param('key') key: string) {
    return this.uploadsService.deleteFile(key);
  }
}
