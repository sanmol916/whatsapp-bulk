/**
 * Build a WhatsAppConfig from a stored Organization record, decrypting the
 * access token. Node runtime only (imports crypto).
 */
import { decryptSecret } from "./crypto";
import type { WhatsAppConfig } from "./whatsapp";

export interface OrgWaFields {
  waApiVersion: string;
  waPhoneNumberId: string | null;
  waBusinessId: string | null;
  waAccessToken: string | null;
}

export function configFromOrg(org: OrgWaFields): WhatsAppConfig {
  return {
    apiVersion: org.waApiVersion || "v21.0",
    phoneNumberId: org.waPhoneNumberId ?? "",
    businessId: org.waBusinessId ?? "",
    accessToken: decryptSecret(org.waAccessToken),
  };
}

export function orgWaConnected(org: OrgWaFields): boolean {
  return Boolean(org.waPhoneNumberId && org.waAccessToken);
}
