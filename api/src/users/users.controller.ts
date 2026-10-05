import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangeAvatarDto, ProfileResponseDto } from './dto/user.dto';
import { Public } from '../common/decorators/public.decorator';
import * as crypto from 'crypto';
import * as path from 'path';
import { diskStorage } from 'multer';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved', type: ProfileResponseDto })
  async getMe(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: ProfileResponseDto })
  async updateMe(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete my account (soft delete)' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async deleteMe(@CurrentUser() user: any) {
    return this.usersService.deleteProfile(user.userId);
  }

  @Put('me/avatar/preset')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set avatar to preset' })
  @ApiResponse({ status: 200, description: 'Avatar updated', type: ProfileResponseDto })
  async setAvatarPreset(@CurrentUser() user: any, @Body() dto: ChangeAvatarDto) {
    return this.usersService.setAvatarPreset(user.userId, dto);
  }

  @Post('me/avatar/upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: '/app/uploads',
        filename: (req, file, cb) => {
          const hash = crypto.randomBytes(8).toString('hex');
          const ext = path.extname(file.originalname);
          cb(null, `${hash}${ext}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Upload avatar image' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded', type: ProfileResponseDto })
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    const url = `/uploads/${file.filename}`;
    return this.usersService.setAvatarUpload(user.userId, file.filename, url);
  }

  @Public()
  @Get('avatars/presets')
  @ApiOperation({ summary: 'Get available avatar presets' })
  @ApiResponse({ status: 200, description: 'List of presets' })
  async getPresets() {
    return this.usersService.getAvatarPresets();
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search players for match submission' })
  @ApiResponse({ status: 200, description: 'List of matching players' })
  async searchUsers(@Query('q') q?: string) {
    return this.usersService.searchPlayers(q || '');
  }
}
