import { apiClient } from "./client";
import { API_CONFIG } from "./config";

export type BillingStatus = {
  entitled: boolean;
  needs_payment: boolean;
  trial_ends_at?: string | null;
  billing_active: boolean;
  checkout_available: boolean;
  plan: string;
};

export type BillingCheckoutResponse = {
  url: string;
};

export async function getBillingStatus(): Promise<BillingStatus> {
  return apiClient.get<BillingStatus>(API_CONFIG.endpoints.billing.status);
}

/** Reconciles tenant subscription with AbacatePay after checkout (when webhooks cannot reach localhost). */
export async function syncBillingStatus(): Promise<BillingStatus> {
  return apiClient.post<BillingStatus>(API_CONFIG.endpoints.billing.sync);
}

export async function createBillingCheckout(): Promise<BillingCheckoutResponse> {
  return apiClient.post<BillingCheckoutResponse>(
    API_CONFIG.endpoints.billing.checkout,
  );
}
