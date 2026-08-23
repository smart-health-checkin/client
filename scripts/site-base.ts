/**
 * Where this package's pages are mounted.
 *
 * Standalone (the default) it owns the whole site, at "". Assembled into the
 * org site, that site's build sets SITE_BASE=/client and OUT_DIR, and every
 * generated link is prefixed to match.
 */
export const BASE = (process.env.SITE_BASE ?? "").replace(/\/$/, "");
export const OUT_ROOT = process.env.OUT_DIR ?? "_site";
