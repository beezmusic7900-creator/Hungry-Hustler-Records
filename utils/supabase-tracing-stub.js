// Stub for @supabase/tracing extract module
// Replaces the dynamic import(OTEL_PKG) that Hermes cannot compile
export function extractTraceContext() {
  return Promise.resolve(null);
}
export function _resetOtelCache() {}
