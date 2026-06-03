import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";

export const SEND_QUEUE_NAME = "wa-send";

/** Payload for a single outbound message job. */
export interface SendJobData {
  messageId: string;
  campaignId: string;
  to: string;
  templateName: string;
  languageCode: string;
  bodyParams: string[];
}

const globalForQueue = globalThis as unknown as {
  sendQueue: Queue<SendJobData> | undefined;
};

/**
 * Lazily create the queue so that simply importing this module (e.g. during
 * `next build`) never opens a Redis connection. The connection is established
 * on first use at runtime.
 */
export function getSendQueue(): Queue<SendJobData> {
  if (!globalForQueue.sendQueue) {
    globalForQueue.sendQueue = new Queue<SendJobData>(SEND_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }
  return globalForQueue.sendQueue;
}
