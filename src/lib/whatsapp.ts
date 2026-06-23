/**
 * Thin wrapper around the WhatsApp Cloud API (Meta Graph API).
 * Multi-tenant: every call takes the calling organization's credentials,
 * so each business sends from its own connected number.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export interface WhatsAppConfig {
  apiVersion: string;
  phoneNumberId: string;
  businessId: string;
  accessToken: string;
}

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

function graphBase(cfg: WhatsAppConfig) {
  return `https://graph.facebook.com/${cfg.apiVersion || "v21.0"}`;
}

async function graphRequest<T>(
  cfg: WhatsAppConfig,
  path: string,
  init: RequestInit & { method: "GET" | "POST" }
): Promise<T> {
  if (!cfg.accessToken) {
    throw new WhatsAppApiError(
      "WhatsApp is not connected. Add your access token in Settings.",
      400,
      null
    );
  }
  const res = await fetch(`${graphBase(cfg)}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
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
export async function sendTemplateMessage(
  cfg: WhatsAppConfig,
  params: {
    to: string;
    templateName: string;
    languageCode: string;
    bodyParams?: string[];
  }
): Promise<SendTemplateResult> {
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

  return graphRequest<SendTemplateResult>(cfg, `${cfg.phoneNumberId}/messages`, {
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
export async function sendTextMessage(
  cfg: WhatsAppConfig,
  params: { to: string; text: string }
): Promise<SendTemplateResult> {
  return graphRequest<SendTemplateResult>(cfg, `${cfg.phoneNumberId}/messages`, {
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
export async function listTemplates(
  cfg: WhatsAppConfig
): Promise<MetaTemplate[]> {
  if (!cfg.businessId) {
    throw new WhatsAppApiError(
      "WhatsApp Business Account ID is not set. Add it in Settings.",
      400,
      null
    );
  }
  const res = await graphRequest<ListTemplatesResponse>(
    cfg,
    `${cfg.businessId}/message_templates?limit=100`,
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
