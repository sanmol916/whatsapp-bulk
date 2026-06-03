/**
 * Thin wrapper around the WhatsApp Cloud API (Meta Graph API).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";

const GRAPH_BASE = `https://graph.facebook.com/${API_VERSION}`;

export class WhatsAppApiError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "WhatsAppApiError";
    this.status = status;
    this.details = details;
  }
}

async function graphRequest<T>(
  path: string,
  init: RequestInit & { method: "GET" | "POST" }
): Promise<T> {
  if (!ACCESS_TOKEN) {
    throw new WhatsAppApiError("WHATSAPP_ACCESS_TOKEN is not configured", 500, null);
  }
  const res = await fetch(`${GRAPH_BASE}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const msg = json?.error?.message ?? `Graph API request failed (${res.status})`;
    throw new WhatsAppApiError(msg, res.status, json?.error ?? json);
  }
  return json as T;
}

export interface TemplateComponentParameter {
  type: "text";
  text: string;
}

export interface SendTemplateResult {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

/**
 * Send an approved template message. `bodyParams` fill {{1}}, {{2}}, ...
 * in the template's BODY component, in order.
 */
export async function sendTemplateMessage(params: {
  to: string;
  templateName: string;
  languageCode: string;
  bodyParams?: string[];
}): Promise<SendTemplateResult> {
  const { to, templateName, languageCode, bodyParams = [] } = params;

  const components =
    bodyParams.length > 0
      ? [
          {
            type: "body",
            parameters: bodyParams.map<TemplateComponentParameter>((text) => ({
              type: "text",
              text,
            })),
          },
        ]
      : undefined;

  return graphRequest<SendTemplateResult>(`${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    }),
  });
}

/**
 * Send a free-form text message. Only allowed within the 24h customer
 * service window (i.e. after the user messaged you).
 */
export async function sendTextMessage(params: {
  to: string;
  text: string;
}): Promise<SendTemplateResult> {
  return graphRequest<SendTemplateResult>(`${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to,
      type: "text",
      text: { preview_url: false, body: params.text },
    }),
  });
}

export interface MetaTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  components: {
    type: string;
    text?: string;
  }[];
}

interface ListTemplatesResponse {
  data: MetaTemplate[];
  paging?: { next?: string };
}

/** Fetch all message templates defined on the WhatsApp Business Account. */
export async function listTemplates(): Promise<MetaTemplate[]> {
  if (!WABA_ID) {
    throw new WhatsAppApiError(
      "WHATSAPP_BUSINESS_ACCOUNT_ID is not configured",
      500,
      null
    );
  }
  const res = await graphRequest<ListTemplatesResponse>(
    `${WABA_ID}/message_templates?limit=100`,
    { method: "GET" }
  );
  return res.data ?? [];
}

/** Count {{n}} placeholders in a template body. */
export function countTemplateVariables(bodyText: string | undefined): number {
  if (!bodyText) return 0;
  const matches = bodyText.match(/\{\{\s*\d+\s*\}\}/g);
  if (!matches) return 0;
  const nums = matches.map((m) => parseInt(m.replace(/[^\d]/g, ""), 10));
  return Math.max(0, ...nums);
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(PHONE_NUMBER_ID && ACCESS_TOKEN);
}
