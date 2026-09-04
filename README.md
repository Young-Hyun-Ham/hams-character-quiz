# HAMS Character Quiz

좋아하는 캐릭터의 이미지를 보고 이름을 한글로 따라 쓰는 어린이용 학습 서비스입니다. 현재 포켓몬, 티니핑, 시나모롤 도감을 제공하며 새로운 캐릭터 세계를 데이터 중심으로 추가할 수 있습니다.

## 주요 기능

- 메인 화면에서 캐릭터 세계 선택
- 전체 도감에서 중복 없이 무작위 최대 10문제 출제
- 모바일 터치와 데스크톱 마우스를 지원하는 Canvas 필기
- 첫 글자 힌트와 브라우저 음성 합성을 이용한 이름 듣기
- 캐릭터를 클릭할 때마다 무작위 인사말을 보여주는 대화 말풍선
- 퀴즈 화면 진입 시 이벤트별 설정 확률에 따라 나타나는 깜짝 이벤트 모달
- 작성 획과 정답 윤곽의 정확도·완성도를 비교하는 로컬 채점
- 글자 모양 점수 95점 이상일 때 정답 처리
- 완료 후 점수·문항별 결과와 틀린 문제 재학습 제공

OCR이나 외부 채점 API를 사용하지 않습니다. 필기 이미지와 학습 결과는 서버로 전송하거나 저장하지 않고 브라우저 메모리에서만 처리합니다.

## 제공 데이터

| 세계 | slug | 캐릭터 수 | 이미지 출처/형태 |
| --- | --- | ---: | --- |
| 포켓몬 | `pokemon` | 1,025 | 포켓몬코리아 공식 도감 원격 이미지 |
| 티니핑 | `teenieping` | 153 | 시즌 1~6 로컬 투명 PNG |
| 시나모롤 | `cinnamoroll` | 11 | 산리오코리아 공식 도감 로컬 PNG |

캐릭터 이름과 이미지에 관한 권리는 각 권리자에게 있습니다. 배포·공개 전에 이미지 사용 조건을 별도로 확인해야 합니다.

## 사용자 흐름

1. `/`에서 캐릭터 세계를 선택합니다.
2. `/quiz/[slug]` 서버 페이지가 도감에서 최대 10개를 무작위 선택합니다.
3. 사용자가 흐린 정답 윤곽을 따라 이름을 씁니다.
4. `자동 채점하기`를 누르면 브라우저에서 글자 모양 유사도를 계산합니다.
5. 모든 문제를 풀면 결과 화면으로 이동합니다.
6. 틀린 문제만 다시 풀거나 새로운 무작위 문제를 시작할 수 있습니다.

## 기술 구성과 실행

- Next.js 16 App Router, React 19, TypeScript strict mode
- HTML Canvas, Pointer Events, CSS 반응형 UI
- pnpm, 개발 서버 포트 `3010`

```bash
cd hams-character-quiz
pnpm install
pnpm dev
```

[http://localhost:3010](http://localhost:3010)을 연 뒤 다음 명령으로 검증합니다.

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## 프로젝트 구조

```text
app/
  data.ts                         세계 및 캐릭터 데이터
  components/site-header.tsx     홈·문의 게시판 공통 헤더
  inquiries/                     문의 목록·작성·상세 및 댓글 화면
  api/inquiries/                 문의글·댓글 Firestore API
  pokemon-data.generated.ts       공식 도감에서 생성한 포켓몬 데이터
  page.tsx                        캐릭터 세계 선택 화면
  quiz/[slug]/page.tsx            slug 검증 및 최초 무작위 문제 선택
  quiz/[slug]/quiz-game.tsx       필기, 채점, 결과, 오답 재학습
  globals.css                     전체 반응형 스타일
public/
  teenieping/catalog/             서비스용 투명 PNG 153개
  teenieping/source/              도감 PDF와 추출 중간 자료
  wishcat/catalog/                서비스용 투명 PNG 19개
  wishcat/source/                 위시캣 도감 PDF
  cinnamoroll/catalog/            시나모롤 이미지 11개
scripts/
  generate-pokemon-data.mjs       포켓몬 공식 도감 동기화
  extract-pdf-images.mjs          티니핑 PDF 이미지 추출
  extract-pdf-text.mjs            티니핑 PDF 텍스트 확인
  generate-teenieping-pdf-data.mjs PDF 이미지와 이름 연결
  sort-teenieping-data.mjs        티니핑 시즌·이미지 정렬
  remove-teenieping-white-background.ps1  투명 PNG 변환
  extract-wishcat-assets.mjs      위시캣 PDF 이미지 추출 및 투명 PNG 변환
```

## 채점 방식

`quiz-game.tsx`는 정답 글자의 윤곽과 사용자가 그린 획을 오프스크린 Canvas에 렌더링합니다.

- 정확도: 작성 픽셀 중 정답 윤곽의 허용 범위에 들어온 비율
- 완성도: 정답 윤곽 중 작성 획의 허용 범위에 포함된 비율
- 최종 점수: `정확도 × 0.55 + 완성도 × 0.45`
- 정답 조건: 최종 점수 95점 이상, 정확도 45% 이상, 완성도 35% 이상

난이도는 `PASSING_SCORE` 상수로 관리합니다. Canvas 크기가 바뀌면 좌표 불일치를 막기 위해 작성 중인 획을 초기화합니다.

깜짝 이벤트는 `quiz-game.tsx`의 `QUIZ_EVENTS` 배열에서 관리합니다. 각 항목의 `probability`는 `0`부터 `1` 사이의 출현 확률이며, 전체 합계에 포함되지 않는 나머지 확률에는 모달이 표시되지 않습니다. 예를 들어 세 이벤트의 합이 `0.2`이면 화면 진입 시 전체 20% 확률로 이벤트 모달이 나타납니다.

## 데이터 관리

새 세계는 `app/data.ts`의 원본 배열에 `slug`, 한글·영문 제목, 설명, 테마 색상, 표지와 `characters`를 추가합니다. 각 캐릭터에는 `name`, `image`, `hint`가 필요하고 티니핑에는 `season`도 필요합니다. `slug`와 이름 중복, 첫 글자 힌트, 로컬 이미지 존재 여부를 확인합니다. 목록 확장은 홈과 정적 경로 생성에 자동 반영됩니다.

포켓몬 데이터는 생성 파일을 직접 수정하지 않고 다음 명령으로 갱신합니다.

```bash
pnpm pokemon:sync
```

공식 도감 응답을 번호순으로 수집하며 1,000마리 미만이면 파일을 만들지 않습니다. 네트워크 연결이 필요합니다.

위시캣 이미지는 도감 PDF의 위시캣 페이지에서 이름 순서대로 추출하며, 캐릭터 내부의 흰색은 보존하고 가장자리와 연결된 흰 배경만 투명하게 처리합니다.

```bash
node scripts/extract-wishcat-assets.mjs
```

티니핑 이미지를 재처리할 때는 다음 명령을 사용합니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\remove-teenieping-white-background.ps1
```

스크립트는 `public/teenieping/catalog-copy/*.jpg`를 원본으로 기대하고 `public/teenieping/catalog/*.png`를 만듭니다. 현재 저장소에는 `catalog-copy`가 없으므로 실행 전 원본 폴더를 준비해야 합니다. 이미 투명한 PNG 데이터가 `.jpg` 확장자로 저장된 경우 알파를 보존하고, 실제 JPEG는 외곽과 연결된 흰 배경만 제거합니다.

## 문의 게시판

문의글은 Firestore의 `inquiries` 컬렉션에 저장하며 제목, 200자 이하의 내용, 최대 5개의 문자열 태그와 댓글 수를 가집니다. 댓글은 각 문의글의 `comments` 하위 컬렉션에 저장하고 `parentId`로 부모 댓글을 연결하므로 답글 깊이에 제한이 없습니다. 게시판 API를 실행하려면 `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` 환경변수가 필요합니다.

## 변경 이력

기능, 데이터, 자산, 설정 또는 개발 절차를 변경할 때는 같은 작업에서 [HISTORY.md](./HISTORY.md)를 갱신합니다. 최신 날짜를 위에 두고 사용자에게 보이는 변화와 검증 결과를 기록합니다.
