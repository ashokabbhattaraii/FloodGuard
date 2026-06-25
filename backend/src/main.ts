import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (
      process.env.FRONTEND_URL ||
      'http://localhost:3000,http://localhost:3001,https://d1brawvkbdw12u.cloudfront.net,https://d2rcbc2k3a39go.cloudfront.net,http://floodguard-frontend-env.eba-sfpvamy6.us-east-1.elasticbeanstalk.com,http://Floodguard-backend-env-env.eba-uhm53rb8.us-east-1.elasticbeanstalk.com'
    )
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('FloodGuard API')
    .setDescription('Flood monitoring and early warning system API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Alerts', 'Flood alert management')
    .addTag('Reports', 'Community incident reports')
    .addTag('Regions', 'Monitored regions')
    .addTag('Weather', 'Weather data and forecasts')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
