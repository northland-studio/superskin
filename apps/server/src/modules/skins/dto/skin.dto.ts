import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSkinDto {
  @ApiProperty({ example: '我的皮肤' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '这是一个很酷的皮肤' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '/uploads/skins/xxx.png' })
  @IsString()
  filePath: string;

  @ApiPropertyOptional({ example: '/uploads/previews/xxx.png' })
  @IsOptional()
  @IsString()
  previewPath?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateSkinDto {
  @ApiPropertyOptional({ example: '新名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '新描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
