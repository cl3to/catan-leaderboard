import { Module, Global } from '@nestjs/common';
import { LeaderboardGateway } from './leaderboard.gateway';

@Global()
@Module({
  providers: [LeaderboardGateway],
  exports: [LeaderboardGateway],
})
export class GatewayModule {}
