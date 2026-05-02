import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SkinsService } from './skins.service';
import { CreateSkinDto, UpdateSkinDto } from './dto/skin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('皮肤')
@Controller('skins')
export class SkinsController {
  constructor(private readonly skinsService: SkinsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户的皮肤列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    return this.skinsService.findByUserId(req.user.id, +page, +limit);
  }

  @Get('public')
  @ApiOperation({ summary: '获取公开皮肤列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findPublic(
    @Query('page') page = 1,
    @Query('limit') limit = 20
  ) {
    return this.skinsService.findPublic(+page, +limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取皮肤详情' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.skinsService.findById(id, req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建皮肤' })
  async create(@Request() req, @Body() dto: CreateSkinDto) {
    return this.skinsService.create(req.user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新皮肤信息' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateSkinDto
  ) {
    return this.skinsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除皮肤' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.skinsService.delete(id, req.user.id);
  }
}
