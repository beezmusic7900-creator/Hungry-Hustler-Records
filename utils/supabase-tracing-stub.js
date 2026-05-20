// No-op stub for @supabase/supabase-js OpenTelemetry tracing.
// The dynamic import(OTEL_PKG) in the .mjs dist is invalid Hermes syntax.
// This stub replaces the loadOtel function with a safe no-op.
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.extractTraceContext = function() { return Promise.resolve(null); };
exports._resetOtelCache = function() {};
exports.default = null;
