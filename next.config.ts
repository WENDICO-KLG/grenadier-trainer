import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    // Profilbilder aus dem öffentlichen Supabase-Storage-Bucket "avatars"
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/avatars/**`)]
      : [],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
