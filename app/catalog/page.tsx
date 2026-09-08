import Link from "next/link";
import { quizWorlds } from "../data";
import { SiteHeader } from "../components/site-header";
import { CatalogGrid } from "./catalog-grid";
import "./catalog.css";
import "./catalog-number.css";
import "./catalog-dialog.css";
import "./catalog-dialog-layout.css";
import "./catalog-dialog-center.css";
import "./catalog-rare.css";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ world?: string; page?: string }>;
}) {
  const query = await searchParams;
  const world =
    quizWorlds.find((item) => item.slug === query.world) ?? quizWorlds[0];
  const pages = Math.ceil(world.characters.length / 60);
  const page = Math.min(
    pages,
    Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1),
  );
  return (
    <main className="catalog-shell">
      <SiteHeader />
      <h1>캐릭터 도감</h1>
      <p>퀴즈에서 정답을 맞히고 친구들의 컬러 카드를 모아 보세요!</p>
      <nav className="catalog-worlds" aria-label="캐릭터 카테고리">
        {quizWorlds.map((item) => (
          <Link
            key={item.slug}
            href={`/catalog?world=${item.slug}`}
            aria-current={item.slug === world.slug ? "page" : undefined}
          >
            {item.title}
          </Link>
        ))}
      </nav>
      <CatalogGrid
        world={world.slug}
        title={world.title}
        allCharacters={world.characters}
        page={page}
      />
      <nav className="catalog-pages" aria-label="도감 페이지">
        {page > 1 && (
          <Link href={`/catalog?world=${world.slug}&page=${page - 1}`}>
            ← 이전
          </Link>
        )}
        <span>
          {page} / {pages}
        </span>
        {page < pages && (
          <Link href={`/catalog?world=${world.slug}&page=${page + 1}`}>
            다음 →
          </Link>
        )}
      </nav>
    </main>
  );
}
