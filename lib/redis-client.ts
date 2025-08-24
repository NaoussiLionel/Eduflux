import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error('Missing Upstash Redis URL or Token in environment variables.');
}

// Create a single, reusable Redis client instance.
export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});