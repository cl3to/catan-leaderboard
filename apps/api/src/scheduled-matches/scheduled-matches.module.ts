import { Module } from '@nestjs/common';
import { ScheduledMatchesService } from './scheduled-matches.service';
import { ScheduledMatchesController } from './scheduled-matches.controller';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  providers: [ScheduledMatchesService],
  controllers: [ScheduledMatchesController],
  exports: [ScheduledMatchesService],
})
export class ScheduledMatchesModule {}
