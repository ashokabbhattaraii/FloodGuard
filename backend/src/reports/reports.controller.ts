import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto, ReviewReportDto } from './reports.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List reports (filtered by region/status)' })
  @ApiQuery({ name: 'regionId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('regionId') regionId?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.findAll(regionId, status);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit new incident report (resident)' })
  create(
    @Body() dto: CreateReportDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.reportsService.create(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review report - approve/reject (admin only)' })
  review(@Param('id') id: string, @Body() dto: ReviewReportDto) {
    return this.reportsService.review(id, dto);
  }
}
