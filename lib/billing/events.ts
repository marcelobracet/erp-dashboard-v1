export const SUBSCRIPTION_REQUIRED_EVENT = 'erp:subscription-required';

export type SubscriptionRequiredDetail = {
  trialEndsAt?: string | null;
};

export function emitSubscriptionRequired(detail?: SubscriptionRequiredDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT, { detail: detail ?? {} }),
  );
}
