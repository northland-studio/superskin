import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@Request() req) {
    return req.user;
  }

  @Post('verify-email')
  @ApiOperation({ summary: '验证邮箱' })
  async verifyEmail(
    @Body('email') email: string,
    @Body('code') code: string
  ) {
    return this.authService.verifyEmail(email, code);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: '重新发送验证码' })
  async resendVerificationCode(@Body('email') email: string) {
    return this.authService.resendVerificationCode(email);
  }

  @Post('request-password-reset')
  @ApiOperation({ summary: '请求重置密码' })
  async requestPasswordReset(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: '重置密码' })
  async resetPassword(
    @Body('email') email: string,
    @Body('code') code: string,
    @Body('password') password: string
  ) {
    return this.authService.resetPassword(email, code, password);
  }
}
