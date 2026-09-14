import Link from "next/link";
import { SiteHeader } from "../components/site-header";
import "./abc.css";

const lessons = [
  {
    href: "/abc/name",
    icon: "✏️",
    title: "영어 이름찾기",
    text: "그림을 보고 영어 이름을 써요",
  },
  {
    href: "/abc/listen",
    icon: "🔊",
    title: "듣고 문제 맞추기",
    text: "소리를 듣고 세 문항 중 정답을 골라요",
  },
  {
    href: "/abc/speak",
    icon: "🎙️",
    title: "보고 말하기",
    text: "그림을 보고 3초 안에 영어로 말해요",
  },
] as const;

export default function AbcPage() {
  return (
    <main className="abc-shell">
      <SiteHeader />
      <section className="abc-hero">
        <span>HELLO, LITTLE LEARNER!</span>
        <h1>🌈 ABC 영어교실</h1>
        <p>쉬운 단수 그림 낱말 100개로 재미있게 영어를 배워요.</p>
      </section>
      <section className="abc-lessons" aria-label="영어 학습 선택">
        {lessons.map((lesson) => (
          <Link href={lesson.href} key={lesson.href}>
            <span aria-hidden="true">{lesson.icon}</span>
            <h2>{lesson.title}</h2>
            <p>{lesson.text}</p>
            <b>10문제 시작하기 →</b>
          </Link>
        ))}
      </section>
      <Link className="abc-catalog-link" href="/catalog?world=abc">
        📚 영어 알파벳 도감 보기
      </Link>
    </main>
  );
}
