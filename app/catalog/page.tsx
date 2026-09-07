import Image from "next/image";
import Link from "next/link";
import { quizWorlds } from "../data";
import { SiteHeader } from "../components/site-header";
import "./catalog.css";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ world?: string; page?: string }> }) {
  const query = await searchParams;
  const world = quizWorlds.find(item => item.slug === query.world) ?? quizWorlds[0];
  const pages = Math.ceil(world.characters.length / 60);
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  return <main className="catalog-shell"><SiteHeader /><h1>캐릭터 도감</h1><p>좋아하는 친구의 이름과 모습을 살펴봐요!</p><nav className="catalog-worlds" aria-label="캐릭터 카테고리">{quizWorlds.map(item => <Link key={item.slug} href={`/catalog?world=${item.slug}`} aria-current={item.slug === world.slug ? "page" : undefined}>{item.title}</Link>)}</nav><h2>{world.title} · {world.characters.length}명</h2><div className="catalog-grid">{world.characters.slice((page - 1) * 60, page * 60).map((character, index) => <article key={`${character.image}-${index}`}><Image src={character.image} alt={character.name} width={160} height={160} unoptimized /><strong>{character.name}</strong></article>)}</div><nav className="catalog-pages" aria-label="도감 페이지">{page > 1 && <Link href={`/catalog?world=${world.slug}&page=${page - 1}`}>← 이전</Link>}<span>{page} / {pages}</span>{page < pages && <Link href={`/catalog?world=${world.slug}&page=${page + 1}`}>다음 →</Link>}</nav></main>;
}
