import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './users.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update user (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete user (admin only)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get('pending/volunteers')
  @Roles('admin')
  @ApiOperation({ summary: 'Get pending volunteer approvals (admin only)' })
  getPendingVolunteers() {
    return this.usersService.findPendingVolunteers();
  }

  @Patch(':id/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Approve volunteer (admin only)' })
  approveVolunteer(@Param('id') id: string, @Request() req: any) {
    return this.usersService.approveVolunteer(id, req.user.userId);
  }

  @Delete(':id/reject')
  @Roles('admin')
  @ApiOperation({ summary: 'Reject volunteer application (admin only)' })
  rejectVolunteer(@Param('id') id: string) {
    return this.usersService.rejectVolunteer(id);
  }
}
