// Paywall is triggered only by explicit user action (e.g. tapping a buy button),
// not automatically on subscription state. This hook is kept as a no-op stub
// so existing imports continue to compile without changes.
export function useSubscriptionGuard() {
  // intentionally empty — no automatic paywall redirect
}
