import Redis, { RedisOptions } from 'ioredis';

export const buildRedisConfig = (): RedisOptions => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is not defined');
  }

  const parsedUrl = new URL(redisUrl);

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
    username: parsedUrl.username || undefined,
    password: parsedUrl.password || undefined,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  };
};

export const createRedisClient = () => {
  const client = new Redis(buildRedisConfig());

  client.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  client.on('reconnecting', () => {
    console.warn('Redis reconnecting...');
  });

  return client;
};

