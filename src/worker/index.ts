/**
 * Background worker that drains the send queue and dispatches messages
 * to the WhatsApp Cloud API, throttled to stay within the messaging tier.
 *
 * Run with:  npm run worker        (dev, auto-reload)
 *            npm run worker:prod    (production)
 *
 * Load env from .env before importing anything that reads process.env.
 */
import { config as loadEnv } from "dotenv";
loadEnv();

import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { SEND_QUEUE_NAME, type SendJobData } from "../lib/queue";
import { sendTemplateMessage, WhatsAppApiError } from "../lib/whatsapp";
import { configFromOrg } from "../lib/wa-config";

const RATE_PER_SECOND = Number(process.env.SEND_RATE_PER_SECOND ?? "20") || 20;
const CONCURRENCY = Math.max(1, Math.min(RATE_PER_SECOND, 50));

// Short-lived cache of per-org WhatsApp credentials to avoid a DB hit per job.
const ORG_CACHE_MS = 30_000;
const orgCache = new Map<
  string,
  { at: number; cfg: ReturnType<typeof configFromOrg> }
>();

async function getOrgConfig(organizationId: string) {
  const cached = orgCache.get(organizationId);
  if (cached && Date.now() - cached.at < ORG_CACHE_MS) return cached.cfg;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      waApiVersion: true,
      waPhoneNumberId: true,
      waBusinessId: true,
      waAccessToken: true,
    },
  });
  if (!org) {
    throw new WhatsAppApiError("Organization not found for job", 400, null);
  }
  const cfg = configFromOrg(org);
  orgCache.set(organizationId, { at: Date.now(), cfg });
  return cfg;
}

async function processJob(job: Job<SendJobData>) {
  const {
    organizationId,
    messageId,
    campaignId,
    to,
    templateName,
    languageCode,
    bodyParams,
  } = job.data;

  // Mark campaign as actively sending on first dispatch.
  await prisma.campaign.updateMany({
    where: { id: campaignId, status: "QUEUED" },
    data: { status: "SENDING" },
  });

  const cfg = await getOrgConfig(organizationId);
  const result = await sendTemplateMessage(cfg, {
    to,
    templateName,
    languageCode,
    bodyParams,
  });

  const waMessageId = result.messages?.[0]?.id ?? null;

  await prisma.$transaction([
    prisma.message.update({
      where: { id: messageId },
      data: { status: "SENT", waMessageId, sentAt: new Date(), error: null },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: { increment: 1 } },
    }),
  ]);

  return { waMessageId };
}

const worker = new Worker<SendJobData>(SEND_QUEUE_NAME, processJob, {
  connection: getRedisConnection(),
  concurrency: CONCURRENCY,
  // Token-bucket rate limit across all jobs: RATE_PER_SECOND per 1000ms.
  limiter: { max: RATE_PER_SECOND, duration: 1000 },
});

worker.on("completed", (job) => {
  console.log(`[sent] message=${job.data.messageId} -> ${job.data.to}`);
});

worker.on("failed", async (job, err) => {
  if (!job) return;
  const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
  const reason =
    err instanceof WhatsAppApiError
      ? `${err.message} (HTTP ${err.status})`
      : err.message;

  console.error(
    `[failed${isFinalAttempt ? "" : " - will retry"}] message=${job.data.messageId}: ${reason}`
  );

  // Only mark the DB row failed once retries are exhausted.
  if (isFinalAttempt) {
    try {
      await prisma.message.update({
        where: { id: job.data.messageId },
        data: { status: "FAILED", error: reason },
      });
      await prisma.campaign.update({
        where: { id: job.data.campaignId },
        data: { failedCount: { increment: 1 } },
      });
    } catch (e) {
      console.error("Failed to persist failure state:", e);
    }
  }
});

// When the queue drains, finalize campaigns whose messages are all processed.
worker.on("drained", async () => {
  try {
    const sending = await prisma.campaign.findMany({
      where: { status: "SENDING" },
      select: { id: true },
    });
    for (const c of sending) {
      const remaining = await prisma.message.count({
        where: { campaignId: c.id, status: "QUEUED" },
      });
      if (remaining === 0) {
        await prisma.campaign.update({
          where: { id: c.id },
          data: { status: "COMPLETED" },
        });
        console.log(`[campaign completed] ${c.id}`);
      }
    }
  } catch (e) {
    console.error("Error finalizing campaigns:", e);
  }
});

console.log(
  `WhatsApp send worker started. queue="${SEND_QUEUE_NAME}" concurrency=${CONCURRENCY} rate=${RATE_PER_SECOND}/s`
);

async function shutdown() {
  console.log("Shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
