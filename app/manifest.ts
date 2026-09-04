import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "한글 몬스터",
    short_name: "한글 몬스터",
    description: "좋아하는 캐릭터 이름을 따라 쓰며 배우는 어린이 한글 퀴즈",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ee",
    theme_color: "#74cdf4",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
