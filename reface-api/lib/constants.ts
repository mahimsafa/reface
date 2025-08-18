import 'dotenv/config';

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    // Base URL where this API is reachable (used in building absolute links in emails)
    apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
    rabbitmq: {
      url: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
      imageProcessQueue: process.env.IMAGE_PROCESS_QUEUE || 'image_process_queue',
    },
    db: {
      url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres',
    },
    jwt: {
        accessToken: {
            secret: process.env.JWT_ACCESS_SECRET || 'super-secret',
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
        },
        refreshToken: {
            secret: process.env.JWT_REFRESH_SECRET || 'super-secret',
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
        },
    },
    sessionSecret: process.env.SESSION_SECRET || 'super-secret',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL || '',
    },
    mailer: {
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      from: process.env.EMAIL_FROM,
    }
  };
  