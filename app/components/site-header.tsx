import Link from "next/link";

export function SiteHeader({ inquiryActive = false }: { inquiryActive?: boolean }) {
  return (
    <header className="home-header">
      <Link className="brand" href="/" aria-label="한글 몬스터 홈">
        <span className="brand-mark">ㅎ</span>
        <span>한글 몬스터</span>
      </Link>
      <div className="header-actions">
        <div className="parent-link"><span>☆</span> 오늘도 즐겁게!</div>
        <Link className={`inquiry-link${inquiryActive ? " active" : ""}`} href="/inquiries">문의하기</Link>
      </div>
    </header>
  );
}
