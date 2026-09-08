/**
 * 게임 보상과 포켓몬 포획 확률을 한곳에서 관리하는 설정입니다.
 *
 * 확률(chance)은 0~1 사이의 값입니다.
 * - 1: 항상 지급 또는 성공
 * - 0.5: 50% 확률
 * - 0.01: 1% 확률
 *
 * 스티커 보상 규칙:
 * - amount: 조건과 확률을 모두 통과했을 때 지급할 스티커 수
 * - requiredTotal: 반드시 완료해야 하는 전체 문제 수. 단계별 게임처럼
 *   문제 수가 매번 다르면 null을 사용합니다.
 * - minimumCorrect: 보상을 받기 위한 최소 정답 수
 * - requirePerfect: true이면 correct와 total이 정확히 같아야 합니다.
 * - chance: 위 조건을 달성한 뒤 실제 스티커가 지급될 확률 (1이면 항상 지급, 0.5이면 50% 확률, 0이면 지급하지 않음)
 *
 * 이 객체의 키는 StickerReward의 kind 값이 되므로 키를 변경할 때는
 * 해당 게임 화면에서 전달하는 kind도 함께 변경해야 합니다.
 */
export const gameRewardConfig = {
  /** 저장된 예전 기본 보상값을 새 설정으로 갱신할 때 사용하는 버전입니다. */
  version: 2,

  stickerRewards: {
    /** 이름찾기: 10문제를 모두 풀고 9문제 이상 맞히면 3개를 항상 지급합니다. */
    quiz: { amount: 3, requiredTotal: 10, minimumCorrect: 9, requirePerfect: false, chance: 1 },

    /** 사운드북: 10문제를 모두 풀고 7문제 이상 맞히면 3개를 항상 지급합니다. */
    soundbook: { amount: 3, requiredTotal: 10, minimumCorrect: 7, requirePerfect: false, chance: 1 },

    /** 같은 그림 찾기 1단계: 모든 짝을 찾으면 1개를 지급합니다. */
    memory1: { amount: 1, requiredTotal: null, minimumCorrect: 0, requirePerfect: true, chance: 1 },

    /** 같은 그림 찾기 2단계: 모든 짝을 찾으면 3개를 지급합니다. */
    memory2: { amount: 3, requiredTotal: null, minimumCorrect: 0, requirePerfect: true, chance: 1 },

    /** 같은 그림 찾기 3단계: 모든 짝을 찾으면 10개를 지급합니다. */
    memory3: { amount: 10, requiredTotal: null, minimumCorrect: 0, requirePerfect: true, chance: 1 },

    /** 몬스터볼 게임: 계산까지 완료하면 포획 성공 여부와 별개로 50% 확률로 1개를 지급합니다. */
    pokeball: { amount: 1, requiredTotal: 1, minimumCorrect: 1, requirePerfect: true, chance: 0.5 },
  },

  pokemonCapture: {
    /**
     * 던진 몬스터볼 1개당 포켓몬 포획 확률입니다.
     * 실제 포획 확률은 `던진 몬스터볼 수 × chance`로 계산합니다.
     * 현재 몬스터볼이 1~5개이므로 최종 확률은 5~25%입니다.
     */
    chance: 0.05,
  },
} as const;
