import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "한글 몬스터 | 좋아하는 친구와 한글 공부",
  description: "캐릭터 이름을 따라 쓰며 재미있게 배우는 어린이 한글 퀴즈",
  applicationName: "한글 몬스터",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "한글 몬스터",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
