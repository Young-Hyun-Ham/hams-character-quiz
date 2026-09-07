import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hams-fam/sso-client"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "data1.pokemonkorea.co.kr", pathname: "/newdata/pokedex/**" }],
  },
};

export default nextConfig;
