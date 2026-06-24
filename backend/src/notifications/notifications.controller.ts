import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications (latest first)' })
  findMine(@Request() req: { user: { id: string } }) {
    return this.service.findForUser(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get my unread notification count' })
  unreadCount(@Request() req: { user: { id: string } }) {
    return this.service.unreadCount(req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  markAllRead(@Request() req: { user: { id: string } }) {
    return this.service.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.service.markRead(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Dismiss / delete a notification' })
  remove(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.service.remove(id, req.user.id);
  }
}
