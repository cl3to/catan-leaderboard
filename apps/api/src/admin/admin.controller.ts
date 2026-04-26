import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import {
  ReviewSubmissionDto,
  UpdateUserDto,
  DeleteUserDto,
  DeleteMatchDto,
  UpdateMatchDto,
  PaginationDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Submissions
  @Get('submissions')
  @ApiOperation({ summary: 'Get pending submissions' })
  @ApiResponse({ status: 200, description: 'Pending submissions' })
  async getPendingSubmissions(@Query() pagination: PaginationDto) {
    return this.adminService.getPendingSubmissions(pagination);
  }

  @Post('submissions/:id/approve')
  @ApiOperation({ summary: 'Approve a submission' })
  @ApiResponse({ status: 200, description: 'Submission approved' })
  async approveSubmission(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.adminService.approveSubmission(id, user.userId, dto);
  }

  @Post('submissions/:id/reject')
  @ApiOperation({ summary: 'Reject a submission' })
  @ApiResponse({ status: 200, description: 'Submission rejected' })
  async rejectSubmission(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.adminService.rejectSubmission(id, user.userId, dto);
  }

  // Users
  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getUsers(@Query() pagination: PaginationDto) {
    return this.adminService.getUsers(pagination);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: DeleteUserDto,
  ) {
    return this.adminService.deleteUser(id, user.userId, dto);
  }

  // Matches
  @Put('matches/:id')
  @ApiOperation({ summary: 'Update match' })
  @ApiResponse({ status: 200, description: 'Match updated' })
  async updateMatch(@Param('id') id: string, @Body() dto: UpdateMatchDto) {
    return this.adminService.updateMatch(id, dto);
  }

  @Delete('matches/:id')
  @ApiOperation({ summary: 'Soft delete match' })
  @ApiResponse({ status: 200, description: 'Match deleted' })
  async deleteMatch(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: DeleteMatchDto,
  ) {
    return this.adminService.deleteMatch(id, user.userId, dto);
  }
}
