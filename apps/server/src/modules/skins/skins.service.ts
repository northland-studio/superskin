import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateSkinDto, UpdateSkinDto } from './dto/skin.dto';

@Injectable()
export class SkinsService {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [skins, total] = await Promise.all([
      this.prisma.skin.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.skin.count({ where: { userId } }),
    ]);

    return {
      data: skins,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublic(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [skins, total] = await Promise.all([
      this.prisma.skin.findMany({
        where: { isPublic: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      }),
      this.prisma.skin.count({ where: { isPublic: true } }),
    ]);

    return {
      data: skins,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId: string) {
    const skin = await this.prisma.skin.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    if (!skin) {
      throw new NotFoundException('皮肤不存在');
    }

    if (!skin.isPublic && skin.userId !== userId) {
      throw new ForbiddenException('无权访问此皮肤');
    }

    return skin;
  }

  async create(userId: string, dto: CreateSkinDto) {
    return this.prisma.skin.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateSkinDto) {
    const skin = await this.prisma.skin.findUnique({ where: { id } });

    if (!skin) {
      throw new NotFoundException('皮肤不存在');
    }

    if (skin.userId !== userId) {
      throw new ForbiddenException('无权修改此皮肤');
    }

    return this.prisma.skin.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const skin = await this.prisma.skin.findUnique({ where: { id } });

    if (!skin) {
      throw new NotFoundException('皮肤不存在');
    }

    if (skin.userId !== userId) {
      throw new ForbiddenException('无权删除此皮肤');
    }

    await this.prisma.skin.delete({ where: { id } });

    return { message: '删除成功' };
  }
}
