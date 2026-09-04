<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HAMS Character Quiz 작업 지침

## 제품 목표

아이들이 좋아하는 캐릭터 이름을 따라 쓰며 한글을 익히는 모바일 우선 학습 서비스다. 화면과 문구는 어린이가 이해하기 쉬워야 하며 기존의 밝고 친근한 시각 언어를 유지한다.

## 반드시 지킬 동작

- 한 퀴즈는 전체 도감에서 중복 없이 무작위 최대 10문제를 출제한다.
- 완료 결과, 새로운 10문제, 틀린 문제만 다시 학습하는 기능을 유지한다.
- 필기는 Pointer Events로 터치와 마우스를 모두 지원한다.
- 채점은 외부 OCR이 아니라 브라우저 Canvas 유사도 계산으로 수행한다.
- 현재 정답 기준은 95점이다. 기준 변경 시 README와 HISTORY도 갱신한다.
- 필기 이미지나 학습 결과를 명시적 요구 없이 외부 전송·영구 저장하지 않는다.
- 알 수 없는 `slug`는 `notFound()`로 처리한다.

## 코드와 데이터 경계

- `app/data.ts`: 세계 메타데이터, 티니핑과 시나모롤 데이터의 기준 파일.
- `app/pokemon-data.generated.ts`: `pnpm pokemon:sync`로만 재생성하며 직접 편집하지 않는다.
- `app/quiz/[slug]/page.tsx`: 서버의 최초 문제 선택.
- `app/quiz/[slug]/quiz-game.tsx`: 클라이언트 상태, 필기, 채점, 재시작.
- `public/teenieping/catalog`: 서비스에서 사용하는 투명 PNG.
- `public/cinnamoroll/catalog`: 시나모롤 로컬 이미지.

새 캐릭터를 추가할 때 이름과 `slug` 중복, 첫 글자 힌트, 로컬 파일 존재 여부를 확인한다. 티니핑은 `season`과 이미지 경로 오름차순을 유지한다. 포켓몬 원격 이미지는 `next.config.ts` 허용 호스트와 일치해야 한다.

## 이미지 작업

- 원본과 결과를 구분하고 원본을 임의로 덮어쓰거나 삭제하지 않는다.
- 투명 결과는 PNG 알파 채널을 검증한다.
- 흰 배경 제거 시 캐릭터의 흰 몸체, 눈, 반사광과 장식을 보존한다.
- 파일명을 바꾸면 `app/data.ts`의 소비 경로도 확인한다.
- 배경 제거 스크립트는 `public/teenieping/catalog-copy`가 있을 때만 실행한다.

## 구현 원칙

- Next.js 16 변경 전 상단 자동 생성 지침에 따라 로컬 공식 문서를 확인한다.
- Server/Client Component 경계를 유지하고 브라우저 API는 Client Component에 둔다.
- 새 문제 선택에는 Fisher–Yates 셔플을 우선한다.
- Canvas는 `devicePixelRatio`를 반영하고 리사이즈 시 좌표와 픽셀을 함께 초기화한다.
- 모바일 터치 영역, 키보드 접근성, `aria-label`, 색상 외 상태 표현을 유지한다.
- 사용자 범위 밖의 기존 변경과 대용량 자산을 임의로 삭제하지 않는다.

## 검증

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

UI/Canvas 변경은 모바일과 데스크톱에서 홈 → 10문제 → 결과 → 오답 재학습을 확인한다. 데이터/이미지 변경은 항목 수, 중복, 정렬, 파일 경로와 알파 채널을 검사한다.

## 문서와 히스토리

- 실제 동작이 달라지면 README를 함께 수정한다.
- 모든 의미 있는 기능, 데이터, 자산, 설정, 도구 변경은 `HISTORY.md` 최신 날짜 아래 기록한다.
- 무엇을 왜 바꿨는지, 사용자 영향과 검증 결과를 짧고 구체적으로 남긴다.
- 하지 않은 작업을 완료된 것처럼 기록하지 않는다.
