// iOS uses the same home screen implementation as the base file.
// This file must exist to prevent Metro from resolving index.tsx as index.ios.tsx.
// We import from a shared module to avoid circular imports.
export { default } from './index.shared';
