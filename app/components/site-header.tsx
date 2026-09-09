"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteAuth } from "./site-auth";
import "./site-header-shop.css";

export function SiteHeader({
  inquiryActive = false,
  catalogLoginNotice = false,
}: {
  inquiryActive?: boolean;
  catalogLoginNotice?: boolean;
}) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  return (
    <>
      <header className="home-header">
        <Link className="brand" href="/" aria-label="한글 몬스터 홈">
          <span className="brand-mark">ㅎ</span>
          <span>한글 몬스터</span>
        </Link>
        <div className="header-actions">
          <div className="parent-link" data-active={inquiryActive || undefined}>
            <span>☆</span> 오늘도 즐겁게!
          </div>
          <SiteAuth
            hideAnonymousControls
            onAuthenticatedChange={setAuthenticated}
          />
        </div>
      </header>
      {catalogLoginNotice && authenticated === false && (
        <aside className="catalog-login-notice" aria-label="도감 로그인 안내">
          <span className="catalog-login-icon" aria-hidden="true">
            ⭐
          </span>
          <div>
            <strong>로그인하고 보상을 모아 봐요!</strong>
            <p>
              로그인하면 캐릭터 도감과 스티커를 저장하고, 모은 스티커로 상점을
              이용해 다양한 먹거리 및 용돈을 받을 수 있어요.
            </p>
          </div>
          <Link
            href="/api/sso/login?returnTo=%2F"
            className="catalog-login-link"
          >
            로그인하고 시작하기<span aria-hidden="true">→</span>
          </Link>
          <span className="catalog-login-sparkles" aria-hidden="true">
            ✦　·　✧
          </span>
        </aside>
      )}
    </>
  );
}
