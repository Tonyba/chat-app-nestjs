import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as session from 'express-session';
import * as passport from 'passport';
import { TypeormStore } from 'connect-typeorm';

import { getRepository } from 'typeorm';

import { Session } from './utils/typeorm';
import { WebsocketAdapter } from './gateway/gateway.adapter';

async function bootstrap() {
  const { PORT, COOKIE_SECRET } = process.env;
  const serverPORT = PORT || 3001;
  const app = await NestFactory.create(AppModule);
  const sessionRepository = getRepository(Session);
  const adapter = new WebsocketAdapter(app);

  app.useWebSocketAdapter(adapter);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: ['http://localhost:3000'], credentials: true });
  app.useGlobalPipes(new ValidationPipe());

  app.use(
    session({
      secret: COOKIE_SECRET,
      saveUninitialized: false,
      resave: false,
      name: 'CHAT_APP_SESSION_ID',
      cookie: {
        maxAge: 86400000, // cookie expires 1 day later
      },
      store: new TypeormStore().connect(sessionRepository),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  try {
    await app.listen(serverPORT, () =>
      console.log(`Running on Port ${serverPORT}`),
    );
  } catch (error) {
    console.log(error);
  }
}
bootstrap();
