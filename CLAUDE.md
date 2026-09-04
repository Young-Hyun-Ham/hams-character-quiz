@AGENTS.md

# Claude 작업 메모

- 서비스 이름은 **HAMS Character Quiz**, 화면 브랜드는 **한글 몬스터**다.
- 핵심 흐름은 세계 선택 → 무작위 최대 10문제 → Canvas 따라 쓰기 → 95점 기준 로컬 채점 → 결과와 오답 재학습이다.
- 데이터 기준은 `app/data.ts`, 자동 생성 포켓몬 기준은 `app/pokemon-data.generated.ts`다.
- 생성된 포켓몬 파일과 캐릭터 원본 이미지를 직접 수정하지 않는다.
- 변경 전 관련 파일과 작업 트리를 확인해 기존 사용자 변경을 보존한다.
- 의미 있는 수정마다 `HISTORY.md`를 같은 날짜 항목에 갱신하고 검증 결과를 기록한다.
- 완료 전 최소 `pnpm lint`와 `pnpm exec tsc --noEmit`을 실행한다.
