import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hams-fam/sso-client"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "data1.pokemonkorea.co.kr", pathname: "/newdata/pokedex/**" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com", pathname: "/v0/b/**" },
    ],
  },
};

export default nextConfig;
