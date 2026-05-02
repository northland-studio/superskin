import { Module } from '@nestjs/common';
import { SkinsController } from './skins.controller';
import { SkinsService } from './skins.service';

@Module({
  controllers: [SkinsController],
  providers: [SkinsService],
  exports: [SkinsService],
})
export class SkinsModule {}
