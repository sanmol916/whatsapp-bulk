/**
 * Subscription plan definitions. Limits of -1 mean "unlimited".
 * These drive what each organization (tenant) is allowed to do.
 */
export type PlanId = "FREE" | "STARTER" | "PRO" | "BUSINESS" | "UNLIMITED";

export interface PlanDef {
  id: PlanId;
  label: string;
  priceMonthly: number; // INR, for display only
  messageLimit: number; // monthly message cap (-1 = unlimited)
  contactLimit: number; // max stored contacts (-1 = unlimited)
}

export const PLANS: Record<PlanId, PlanDef> = {
  FREE: {
    id: "FREE",
    label: "Free",
    priceMonthly: 0,
    messageLimit: 100,
    contactLimit: 100,
  },
  STARTER: {
    id: "STARTER",
    label: "Starter",
    priceMonthly: 999,
    messageLimit: 2000,
    contactLimit: 2000,
  },
  PRO: {
    id: "PRO",
    label: "Pro",
    priceMonthly: 2499,
    messageLimit: 20000,
    contactLimit: 20000,
  },
  BUSINESS: {
    id: "BUSINESS",
    label: "Business",
    priceMonthly: 7999,
    messageLimit: 100000,
    contactLimit: 100000,
  },
  UNLIMITED: {
    id: "UNLIMITED",
    label: "Unlimited (Admin)",
    priceMonthly: 0,
    messageLimit: -1,
    contactLimit: -1,
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function getPlan(id: string | null | undefined): PlanDef {
  return PLANS[(id as PlanId) ?? "FREE"] ?? PLANS.FREE;
}

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

export function formatLimit(limit: number): string {
  return limit < 0 ? "Unlimited" : limit.toLocaleString("en-IN");
}
