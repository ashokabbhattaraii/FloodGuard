import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import { VolunteerHelpService } from './volunteer-help.service';
import { CreateHelpRequestDto, RespondToHelpRequestDto } from './volunteer-help.dto';

@Controller('volunteer-help')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('volunteer')
export class VolunteerHelpController {
  constructor(private readonly service: VolunteerHelpService) {}

  /**
   * GET /volunteer-help/nearby/:floodRequestId
   * Find nearby volunteers who can help
   */
  @Get('nearby/:floodRequestId')
  findNearbyVolunteers(@Param('floodRequestId') floodRequestId: string, @Req() req: any) {
    return this.service.findNearbyVolunteers(floodRequestId, req.user.sub);
  }

  /**
   * POST /volunteer-help
   * Request help from another volunteer
   */
  @Post()
  createHelpRequest(@Body() dto: CreateHelpRequestDto, @Req() req: any) {
    return this.service.createHelpRequest(dto, req.user.sub);
  }

  /**
   * GET /volunteer-help/received
   * Get help requests received (inbox)
   */
  @Get('received')
  getReceivedHelpRequests(@Query('status') status: string, @Req() req: any) {
    return this.service.getReceivedHelpRequests(req.user.sub, status);
  }

  /**
   * GET /volunteer-help/sent
   * Get help requests sent (outbox)
   */
  @Get('sent')
  getSentHelpRequests(@Req() req: any) {
    return this.service.getSentHelpRequests(req.user.sub);
  }

  /**
   * GET /volunteer-help/task/:floodRequestId
   * Get all help requests for a specific task
   */
  @Get('task/:floodRequestId')
  getHelpRequestsForTask(@Param('floodRequestId') floodRequestId: string, @Req() req: any) {
    return this.service.getHelpRequestsForTask(floodRequestId, req.user.sub);
  }

  /**
   * PATCH /volunteer-help/:id/respond
   * Accept or reject a help request
   */
  @Patch(':id/respond')
  respondToHelpRequest(
    @Param('id') id: string,
    @Body() dto: RespondToHelpRequestDto,
    @Req() req: any,
  ) {
    return this.service.respondToHelpRequest(id, dto, req.user.sub);
  }

  /**
   * GET /volunteer-help/stats
   * Get help request statistics
   */
  @Get('stats')
  getHelpRequestStats(@Req() req: any) {
    return this.service.getHelpRequestStats(req.user.sub);
  }
}
