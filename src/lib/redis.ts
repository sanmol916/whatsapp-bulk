/**
 * Redis connection options for BullMQ.
 *
 * We return a plain options object (parsed from REDIS_URL) rather than a
 * shared ioredis instance. BullMQ bundles its own copy of ioredis, so passing
 * our instance causes a type clash — and BullMQ also requires
 * `maxRetriesPerRequest: null`, which it applies when it builds the connection.
 */
export function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}
