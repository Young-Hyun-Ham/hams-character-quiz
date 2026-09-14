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
  ["apple", "apples", "사과", "🍎"],
  ["ant", "ants", "개미", "🐜"],
  ["ball", "balls", "공", "⚽"],
  ["banana", "bananas", "바나나", "🍌"],
  ["bear", "bears", "곰", "🐻"],
  ["bee", "bees", "벌", "🐝"],
  ["bird", "birds", "새", "🐦"],
  ["book", "books", "책", "📕"],
  ["bus", "buses", "버스", "🚌"],
  ["cake", "cakes", "케이크", "🍰"],
  ["car", "cars", "자동차", "🚗"],
  ["cat", "cats", "고양이", "🐱"],
  ["chair", "chairs", "의자", "🪑"],
  ["cherry", "cherries", "체리", "🍒"],
  ["chick", "chicks", "병아리", "🐥"],
  ["cloud", "clouds", "구름", "☁️"],
  ["cookie", "cookies", "쿠키", "🍪"],
  ["cow", "cows", "소", "🐮"],
  ["crab", "crabs", "게", "🦀"],
  ["cup", "cups", "컵", "🥤"],
  ["dog", "dogs", "강아지", "🐶"],
  ["doll", "dolls", "인형", "🪆"],
  ["door", "doors", "문", "🚪"],
  ["duck", "ducks", "오리", "🦆"],
  ["egg", "eggs", "달걀", "🥚"],
  ["elephant", "elephants", "코끼리", "🐘"],
  ["fish", "fish", "물고기", "🐟"],
  ["flower", "flowers", "꽃", "🌼"],
  ["fox", "foxes", "여우", "🦊"],
  ["frog", "frogs", "개구리", "🐸"],
  ["gift", "gifts", "선물", "🎁"],
  ["grape", "grapes", "포도", "🍇"],
  ["hat", "hats", "모자", "🎩"],
  ["heart", "hearts", "하트", "❤️"],
  ["horse", "horses", "말", "🐴"],
  ["house", "houses", "집", "🏠"],
  ["ice", "ices", "얼음", "🧊"],
  ["key", "keys", "열쇠", "🔑"],
  ["kite", "kites", "연", "🪁"],
  ["lion", "lions", "사자", "🦁"],
  ["moon", "moons", "달", "🌙"],
  ["mouse", "mice", "쥐", "🐭"],
  ["orange", "oranges", "오렌지", "🍊"],
  ["panda", "pandas", "판다", "🐼"],
  ["peach", "peaches", "복숭아", "🍑"],
  ["pear", "pears", "배", "🍐"],
  ["penguin", "penguins", "펭귄", "🐧"],
  ["pig", "pigs", "돼지", "🐷"],
  ["pizza", "pizzas", "피자", "🍕"],
  ["rabbit", "rabbits", "토끼", "🐰"],
  ["rainbow", "rainbows", "무지개", "🌈"],
  ["robot", "robots", "로봇", "🤖"],
  ["rocket", "rockets", "로켓", "🚀"],
  ["ship", "ships", "배", "🚢"],
  ["shoe", "shoes", "신발", "👟"],
  ["snail", "snails", "달팽이", "🐌"],
  ["snowman", "snowmen", "눈사람", "⛄"],
  ["star", "stars", "별", "⭐"],
  ["sun", "suns", "해", "☀️"],
  ["tiger", "tigers", "호랑이", "🐯"],
  ["train", "trains", "기차", "🚂"],
  ["tree", "trees", "나무", "🌳"],
  ["turtle", "turtles", "거북이", "🐢"],
  ["whale", "whales", "고래", "🐳"],
  ["airplane", "airplanes", "비행기", "✈️"],
  ["bell", "bells", "종", "🔔"],
  ["boat", "boats", "보트", "⛵"],
  ["butterfly", "butterflies", "나비", "🦋"],
  ["candle", "candles", "초", "🕯️"],
  ["clock", "clocks", "시계", "⏰"],
  ["crown", "crowns", "왕관", "👑"],
  ["drum", "drums", "북", "🥁"],
  ["feather", "feathers", "깃털", "🪶"],
  ["flag", "flags", "깃발", "🚩"],
  ["glove", "gloves", "장갑", "🧤"],
  ["hamburger", "hamburgers", "햄버거", "🍔"],
  ["lemon", "lemons", "레몬", "🍋"],
  ["monkey", "monkeys", "원숭이", "🐵"],
  ["pencil", "pencils", "연필", "✏️"],
  ["pineapple", "pineapples", "파인애플", "🍍"],
  ["ring", "rings", "반지", "💍"],
  ["sock", "socks", "양말", "🧦"],
  ["spoon", "spoons", "숟가락", "🥄"],
  ["strawberry", "strawberries", "딸기", "🍓"],
  ["tomato", "tomatoes", "토마토", "🍅"],
  ["umbrella", "umbrellas", "우산", "☂️"],
  ["watch", "watches", "손목시계", "⌚"],
  ["watermelon", "watermelons", "수박", "🍉"],
  ["zebra", "zebras", "얼룩말", "🦓"],
  ["backpack", "backpacks", "가방", "🎒"],
  ["bicycle", "bicycles", "자전거", "🚲"],
  ["camera", "cameras", "카메라", "📷"],
  ["candy", "candies", "사탕", "🍬"],
  ["dinosaur", "dinosaurs", "공룡", "🦕"],
  ["guitar", "guitars", "기타", "🎸"],
  ["leaf", "leaves", "나뭇잎", "🍃"],
  ["medal", "medals", "메달", "🏅"],
  ["octopus", "octopuses", "문어", "🐙"],
  ["shell", "shells", "조개", "🐚"],
  ["tractor", "tractors", "트랙터", "🚜"],
] as const;

const NUMBER_WORDS = ["one", "two", "three", "four", "five"] as const;

/** 100개의 쉬운 그림 낱말 × 1~5개 표현 = 500개의 학습 예제입니다. */
export const ABC_WORDS: AbcWord[] = BASIC_NOUNS.flatMap(
  ([singular, plural, korean, emoji]) =>
    NUMBER_WORDS.map((number, index) => ({
      id: `${singular}-${index + 1}`,
      word: index === 0 ? singular : `${number} ${plural}`,
      display: index === 0 ? singular : `${number} ${plural}`,
      korean: index === 0 ? korean : `${korean} ${index + 1}개`,
      emoji,
      count: index + 1,
      letter: singular[0].toUpperCase(),
    })),
);

export function sampleWords(count: number, source = ABC_WORDS) {
  const shuffled = [...source];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled.slice(0, count);
}
