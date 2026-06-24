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
import { FloodRequestsService } from './flood-requests.service';
import {
  CreateFloodRequestDto,
  UpdateFloodRequestDto,
} from './flood-requests.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Flood Requests')
@Controller('flood-requests')
export class FloodRequestsController {
  constructor(private service: FloodRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'List all flood requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'regionId', required: false })
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('regionId') regionId?: string,
  ) {
    return this.service.findAll(status, type, regionId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my flood requests' })
  myRequests(@Request() req: { user: { id: string } }) {
    return this.service.myRequests(req.user.id);
  }

  @Get('unclaimed')
  @ApiOperation({ summary: 'List unclaimed / pending flood requests' })
  findUnclaimed() {
    return this.service.findUnclaimed();
  }

  @Get('assigned-to-me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get requests assigned to the current volunteer' })
  assignedToMe(@Request() req: { user: { id: string } }) {
    return this.service.assignedToMe(req.user.id);
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get aggregate analytics for admin dashboard' })
  getAnalytics() {
    return this.service.getAnalytics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request detail' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create flood help request (resident)' })
  create(
    @Body() dto: CreateFloodRequestDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update request status (admin or volunteer)' })
  update(@Param('id') id: string, @Body() dto: UpdateFloodRequestDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Volunteer claims an unclaimed request (atomic)' })
  claim(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.claimRequest(id, req.user.id);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin assigns/reassigns request to a volunteer' })
  assign(
    @Param('id') id: string,
    @Body() body: { volunteerId: string },
  ) {
    return this.service.assignRequest(id, body.volunteerId);
  }
}
