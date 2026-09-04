import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "data1.pokemonkorea.co.kr", pathname: "/newdata/pokedex/**" }],
  },
};

export default nextConfig;
