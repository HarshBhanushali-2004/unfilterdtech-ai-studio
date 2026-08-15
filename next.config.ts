import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Brand Kit create/update (`lib/brand-kit/actions.ts`) is a Server Action
  // carrying up to 5 logo fields as data URLs (no object storage configured
  // for this project — see CLAUDE.md), each now capped client-side at
  // MAX_LOGO_DIMENSION (`components/brand-kit/brand-kit-form.tsx`) so a
  // single upload can't blow the budget on its own. This is a safety
  // margin on top of that real fix, not a substitute for it. Verified
  // against real uploads (not just estimated): a typical resized logo is
  // tens of KB, so 5 realistic logos land nowhere near this — but a
  // deliberately adversarial test (near-incompressible synthetic noise,
  // resized, in 2 of the 5 fields) still measured ~2.3MB combined, so 2mb
  // wasn't quite enough margin; 4mb comfortably covers that worst case
  // without approaching an excessive limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // `@napi-rs/canvas` ships a native `.node` binary (Phase 1's Carousel
  // Renderer — see AGENTS.md and lib/creative-renderer/node-canvas.ts).
  // Webpack can't parse a native addon as a module, so it must be excluded
  // from bundling and left as a plain `require()` resolved by Node at
  // runtime — the documented fix for any native dependency used from a
  // Node-runtime Route Handler.
  serverExternalPackages: ["@napi-rs/canvas"],
  // Lets any device on this LAN's subnet (e.g. a phone, or this machine
  // after a DHCP lease renewal) reach the dev server's HMR/asset endpoints
  // without editing this file every time the last IP octet changes.
  // `allowedDevOrigins` supports the same segment-wildcard matching Next.js
  // uses for hostnames (see the `*.local-origin.dev` example in its docs) —
  // `*` here matches exactly one dot-separated segment, so this only ever
  // covers 192.168.1.0/24, not other subnets or the wider internet. This
  // option is dev-only (`next dev`); it has no effect on `next build`/`next
  // start`, and `localhost` remains separately, natively allowed by
  // Next.js regardless of this list.
  allowedDevOrigins: [
    "192.168.1.*",
    "panther-cymbal-gigahertz.ngrok-free.dev",
  ],
};

export default nextConfig;
