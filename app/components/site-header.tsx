import Link from "next/link";
import { SiteAuth } from "./site-auth";
import "./site-header-shop.css";

export function SiteHeader({
  inquiryActive = false,
}: {
  inquiryActive?: boolean;
}) {
  return (
    <header className="home-header">
      <Link className="brand" href="/" aria-label="한글 몬스터 홈">
        <span className="brand-mark">ㅎ</span>
        <span>한글 몬스터</span>
      </Link>
      <div className="header-actions">
        <div className="parent-link" data-active={inquiryActive || undefined}>
          <span>☆</span> 오늘도 즐겁게!
        </div>
        <Link
          className="shop-header-button"
          href="/shop"
          aria-label="스티커 상점"
        >
          🛍️ <span>상점</span>
        </Link>
        <SiteAuth />
      </div>
    </header>
  );
}
