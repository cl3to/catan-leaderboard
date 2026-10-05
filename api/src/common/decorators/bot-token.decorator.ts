import { SetMetadata } from '@nestjs/common';

export const IS_BOT_KEY = 'isBot';
export const BotToken = () => SetMetadata(IS_BOT_KEY, true);
