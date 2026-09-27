import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { RedisIoAdapter } from "./redis/redis-io.adapter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");
  const config = app.get(ConfigService);

  const useRedisAdapter = config.get<string>("SOCKET_REDIS_ADAPTER", "true") !== "false";
  if (useRedisAdapter) {
    const redisUrl = config.get<string>("REDIS_URL", "redis://localhost:6379");
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis(redisUrl);
    app.useWebSocketAdapter(redisIoAdapter);
  } else {
    logger.warn("Socket.IO Redis adapter disabled (SOCKET_REDIS_ADAPTER=false)");
  }

  app.setGlobalPrefix("api");

  app.enableCors({
    origin: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env["PORT"] ?? 4000;
  await app.listen(port);
  logger.log(`🚀 API server running on http://localhost:${port}/api`);
}

bootstrap();
