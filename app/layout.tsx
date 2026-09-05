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
  title: "한글 몬스터 | 캐릭터 퀴즈와 그리기",
  description: "좋아하는 캐릭터의 이름을 따라 쓰고 도감 가이드로 그림을 그리는 어린이 놀이 학습",
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
