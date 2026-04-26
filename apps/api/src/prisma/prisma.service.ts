import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Soft delete middleware
    this.$use(async (params, next) => {
      // Handle soft delete for User and MatchSubmission
      if (params.action === 'delete' && ['User', 'MatchSubmission'].includes(params.model)) {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      }

      if (params.action === 'deleteMany' && ['User', 'MatchSubmission'].includes(params.model)) {
        params.action = 'updateMany';
        params.args.data = { deletedAt: new Date() };
      }

      const softDeleteModels = ['User', 'MatchSubmission'];

      // Filter out soft-deleted records by default for supported models only
      if (
        params.args &&
        softDeleteModels.includes(params.model) &&
        ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(params.action)
      ) {
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where = { ...params.args.where, deletedAt: null };
          }
        } else {
          params.args.where = { deletedAt: null };
        }
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
