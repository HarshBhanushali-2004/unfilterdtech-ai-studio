import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
