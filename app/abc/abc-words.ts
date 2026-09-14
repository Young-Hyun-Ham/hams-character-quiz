export type AbcWord = {
  id: string;
  word: string;
  display: string;
  korean: string;
  emoji: string;
  count: number;
  letter: string;
};

const BASIC_NOUNS = [
  ["apple", "사과", "🍎"],
  ["ant", "개미", "🐜"],
  ["ball", "공", "⚽"],
  ["banana", "바나나", "🍌"],
  ["bear", "곰", "🐻"],
  ["bee", "벌", "🐝"],
  ["bird", "새", "🐦"],
  ["book", "책", "📕"],
  ["bus", "버스", "🚌"],
  ["cake", "케이크", "🍰"],
  ["car", "자동차", "🚗"],
  ["cat", "고양이", "🐱"],
  ["chair", "의자", "🪑"],
  ["cherry", "체리", "🍒"],
  ["chick", "병아리", "🐥"],
  ["cloud", "구름", "☁️"],
  ["cookie", "쿠키", "🍪"],
  ["cow", "소", "🐮"],
  ["crab", "게", "🦀"],
  ["cup", "컵", "🥤"],
  ["dog", "강아지", "🐶"],
  ["doll", "인형", "🪆"],
  ["door", "문", "🚪"],
  ["duck", "오리", "🦆"],
  ["egg", "달걀", "🥚"],
  ["elephant", "코끼리", "🐘"],
  ["fish", "물고기", "🐟"],
  ["flower", "꽃", "🌼"],
  ["fox", "여우", "🦊"],
  ["frog", "개구리", "🐸"],
  ["gift", "선물", "🎁"],
  ["grape", "포도", "🍇"],
  ["hat", "모자", "🎩"],
  ["heart", "하트", "❤️"],
  ["horse", "말", "🐴"],
  ["house", "집", "🏠"],
  ["ice", "얼음", "🧊"],
  ["key", "열쇠", "🔑"],
  ["kite", "연", "🪁"],
  ["lion", "사자", "🦁"],
  ["moon", "달", "🌙"],
  ["mouse", "쥐", "🐭"],
  ["orange", "오렌지", "🍊"],
  ["panda", "판다", "🐼"],
  ["peach", "복숭아", "🍑"],
  ["pear", "배", "🍐"],
  ["penguin", "펭귄", "🐧"],
  ["pig", "돼지", "🐷"],
  ["pizza", "피자", "🍕"],
  ["rabbit", "토끼", "🐰"],
  ["rainbow", "무지개", "🌈"],
  ["robot", "로봇", "🤖"],
  ["rocket", "로켓", "🚀"],
  ["ship", "배", "🚢"],
  ["shoe", "신발", "👟"],
  ["snail", "달팽이", "🐌"],
  ["snowman", "눈사람", "⛄"],
  ["star", "별", "⭐"],
  ["sun", "해", "☀️"],
  ["tiger", "호랑이", "🐯"],
  ["train", "기차", "🚂"],
  ["tree", "나무", "🌳"],
  ["turtle", "거북이", "🐢"],
  ["whale", "고래", "🐳"],
  ["airplane", "비행기", "✈️"],
  ["bell", "종", "🔔"],
  ["boat", "보트", "⛵"],
  ["butterfly", "나비", "🦋"],
  ["candle", "초", "🕯️"],
  ["clock", "시계", "⏰"],
  ["crown", "왕관", "👑"],
  ["drum", "북", "🥁"],
  ["feather", "깃털", "🪶"],
  ["flag", "깃발", "🚩"],
  ["glove", "장갑", "🧤"],
  ["hamburger", "햄버거", "🍔"],
  ["lemon", "레몬", "🍋"],
  ["monkey", "원숭이", "🐵"],
  ["pencil", "연필", "✏️"],
  ["pineapple", "파인애플", "🍍"],
  ["ring", "반지", "💍"],
  ["sock", "양말", "🧦"],
  ["spoon", "숟가락", "🥄"],
  ["strawberry", "딸기", "🍓"],
  ["tomato", "토마토", "🍅"],
  ["umbrella", "우산", "☂️"],
  ["watch", "손목시계", "⌚"],
  ["watermelon", "수박", "🍉"],
  ["zebra", "얼룩말", "🦓"],
  ["backpack", "가방", "🎒"],
  ["bicycle", "자전거", "🚲"],
  ["camera", "카메라", "📷"],
  ["candy", "사탕", "🍬"],
  ["dinosaur", "공룡", "🦕"],
  ["guitar", "기타", "🎸"],
  ["leaf", "나뭇잎", "🍃"],
  ["medal", "메달", "🏅"],
  ["octopus", "문어", "🐙"],
  ["shell", "조개", "🐚"],
  ["tractor", "트랙터", "🚜"],
] as const;

/** 숫자와 복수형을 제외한 100개의 쉬운 단수 그림 낱말입니다. */
export const ABC_WORDS: AbcWord[] = BASIC_NOUNS.map(
  ([singular, korean, emoji]) => ({
    id: singular,
    word: singular,
    display: singular,
    korean,
    emoji,
    count: 1,
    letter: singular[0].toUpperCase(),
  }),
);

export function sampleWords(count: number, source = ABC_WORDS) {
  const shuffled = [...source];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled.slice(0, count);
}
