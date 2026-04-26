import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use((req: any, res: any, next: any) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const serialized = JSON.parse(
        JSON.stringify(body, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );
      return originalJson(serialized);
    };
    next();
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Catan Leaderboard API')
    .setDescription('LSC Catan Leaderboard REST API')
    .setVersion('2.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Matches', 'Match submissions')
    .addTag('Leaderboard', 'Score rankings')
    .addTag('Admin', 'Administration')
    .addTag('Bot', 'Bot API')
    .addTag('Scheduled Matches', 'Calendar management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Static files for avatars
  app.useStaticAssets('/app/uploads', { prefix: '/uploads' });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
