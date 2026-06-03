# WhatsApp Bulk Sender

A self-hosted bulk WhatsApp messaging tool (like WATI / AiSensy) built on the
**official WhatsApp Cloud API**. Import contacts, sync approved message
templates, and send personalized template messages to thousands of contacts
with throttled, queue-based delivery and live delivery/read tracking.

> ⚠️ **Use responsibly.** Only message contacts who have **opted in**. Bulk
> messaging without consent violates WhatsApp's Business Policy and will get
> your number banned. This project uses the official API precisely so you can
> stay compliant.

## Tech stack

| Layer | Choice |
|-------|--------|
| Web + API | Next.js 14 (App Router) + TypeScript |
| Database | PostgreSQL via Prisma |
| Queue | BullMQ on Redis |
| Sending | WhatsApp Cloud API (Meta Graph API) |
| UI | Tailwind CSS |

## Architecture

```
 Browser (UI)
     │
     ▼
 Next.js app  ──(enqueue jobs)──▶  Redis (BullMQ)  ──▶  Worker  ──▶  WhatsApp Cloud API
     │                                                                    │
     ▼                                                                    │ delivery/read
 PostgreSQL  ◀───────────────── webhook (/api/webhook) ◀──────────────────┘
```

- The **app** handles UI + REST endpoints and enqueues one job per recipient.
- The **worker** (separate process) drains the queue, calls the Cloud API at a
  throttled rate, and records `SENT`.
- Meta calls the **webhook** with `delivered` / `read` / `failed` receipts,
  which update each message's status.

---

## 1. Prerequisites: set up WhatsApp Cloud API

You need a Meta account and a WhatsApp Business setup. This is the same
onboarding every BSP (WATI, AiSensy, etc.) requires.

1. Create a **Meta Business Account** → <https://business.facebook.com>.
2. Go to **Meta for Developers** → <https://developers.facebook.com> → create an
   app of type **Business** and add the **WhatsApp** product.
3. In the WhatsApp setup panel you'll get:
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - A temporary **access token**. For production, create a
     [System User token](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started)
     (long-lived) → `WHATSAPP_ACCESS_TOKEN`.
4. **Add and verify a phone number** dedicated to the business (not tied to a
   personal WhatsApp app).
5. **Create message templates** in the
   [WhatsApp Manager](https://business.facebook.com/wa/manage/message-templates/)
   and wait for **APPROVED** status. Outbound bulk messages must use an approved
   template. Use `{{1}}`, `{{2}}` placeholders for personalization.

### Compliance notes
- **Templates required**: marketing/notification messages outside the 24-hour
  customer-service window must use an approved template.
- **24-hour window**: free-form text (the `sendTextMessage` helper) is only
  allowed within 24h of the contact's last inbound message.
- **Messaging tiers**: Meta limits how many unique contacts you can message per
  day (1K → 10K → 100K → unlimited). Keep `SEND_RATE_PER_SECOND` reasonable.

---

## 2. Local setup

### Requirements
- Node.js 18+ (20+ recommended)
- Docker (for Postgres + Redis), or your own Postgres/Redis instances

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres + Redis
docker compose up -d

# 3. Configure environment
cp .env.example .env
#   then edit .env and fill in your WhatsApp Cloud API credentials

# 4. Create the database schema
npm run prisma:migrate      # first run will prompt for a migration name

# 5. Run the app and the worker in two terminals
npm run dev                 # terminal 1 — web UI at http://localhost:3000
npm run worker              # terminal 2 — background sender
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `WHATSAPP_API_VERSION` | Graph API version, e.g. `v21.0` |
| `WHATSAPP_PHONE_NUMBER_ID` | From the WhatsApp setup panel |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Your WABA ID (used to list templates) |
| `WHATSAPP_ACCESS_TOKEN` | System user / long-lived token |
| `WEBHOOK_VERIFY_TOKEN` | A random string you also enter in Meta's webhook config |
| `SEND_RATE_PER_SECOND` | Max messages dispatched per second |

---

## 3. Configure the webhook

Meta needs a public HTTPS URL to send delivery receipts and inbound replies.

1. Expose your local app, e.g. `npx ngrok http 3000`.
2. In your Meta app → **WhatsApp → Configuration → Webhook**, set:
   - **Callback URL**: `https://<your-domain>/api/webhook`
   - **Verify token**: the same value as `WEBHOOK_VERIFY_TOKEN`
3. Subscribe to the **messages** field.

The `GET /api/webhook` route handles Meta's verification handshake; `POST`
receives status updates and inbound messages.

---

## 4. Using the tool

1. **Contacts** → upload a CSV. Required column: `phone` (international format,
   e.g. `14155552671`). Optional `name`. Any other columns (e.g. `city`,
   `orderId`) become custom fields usable in template variables.
2. **Templates** → click **Sync from Meta** to pull your templates and their
   approval status.
3. **Campaigns** → pick an approved template, choose an audience, map each
   `{{n}}` variable to a contact field, then **Create & send**. The worker
   delivers messages and the campaign's sent/failed counters update live.

---

## REST API

| Method | Path | Purpose |
|--------|------|---------|
| `GET/POST` | `/api/contacts` | List / bulk-import contacts |
| `GET/POST` | `/api/templates` | List / sync templates from Meta |
| `GET/POST` | `/api/campaigns` | List / create + enqueue a campaign |
| `GET` | `/api/campaigns/:id` | Campaign detail + status breakdown |
| `GET/POST` | `/api/webhook` | Meta verification / receipts |

---

## Roadmap (not in this MVP)

- Two-way inbox (reply within the 24h window)
- Campaign scheduling (`scheduledAt` exists in the schema, not yet wired)
- Media/header/button template components
- Authentication & multi-tenant workspaces
- Per-number messaging-tier awareness and adaptive throttling

## Project structure

```
prisma/schema.prisma     data model
src/lib/                 prisma, redis, whatsapp client, queue, phone utils
src/app/api/             REST endpoints (contacts, templates, campaigns, webhook)
src/app/                 UI pages (dashboard, contacts, templates, campaigns)
src/worker/index.ts      BullMQ worker (the actual sender)
docker-compose.yml       Postgres + Redis for local dev
```
