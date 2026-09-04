import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const endpoint = "https://pokemonkorea.co.kr/ajax/pokedex";
const pages = Array.from({ length: 100 }, (_, index) => index + 1);

async function fetchPage(page) {
  const body = new URLSearchParams({
    mode: "load_more", word: "", characters: "", pn: String(page), area: "",
    snumber: "1", snumber2: "1025", sortselval: "number asc,number_count asc", typestr: "",
  });
  const response = await fetch(endpoint, { method: "POST", body });
  if (!response.ok) throw new Error(`도감 ${page}페이지 요청 실패: ${response.status}`);
  return response.text();
}

const responses = [];
for (let start = 0; start < pages.length; start += 8) {
  responses.push(...await Promise.all(pages.slice(start, start + 8).map(fetchPage)));
}

const pokemon = new Map();
for (const html of responses) {
  for (const item of html.matchAll(/<li class="col-lg-2 col-6"[\s\S]*?<\/li>/g)) {
    const image = item[0].match(/<img src="(https:\/\/data1\.pokemonkorea\.co\.kr\/newdata\/pokedex\/mid\/(\d{4})\d{2}\.png)"/);
    const heading = item[0].match(/<h3><p>No\.(\d{4})<\/p>\s*([^<]+)<\/h3>/);
    if (!image || !heading) continue;
    const number = Number(heading[1]);
    if (!pokemon.has(number)) pokemon.set(number, { number, name: heading[2].trim(), image: image[1] });
  }
}

const sorted = [...pokemon.values()].sort((a, b) => a.number - b.number);
if (sorted.length < 1000) throw new Error(`포켓몬이 ${sorted.length}마리만 수집되어 파일을 만들지 않았습니다.`);

const source = `// 포켓몬코리아 공식 도감에서 생성한 기본 모습 데이터입니다.\n// 갱신: pnpm pokemon:sync\nimport type { Character } from "./data";\n\nexport const pokemonCharacters: Character[] = ${JSON.stringify(sorted.map(({ number, name, image }) => ({ id: number, name, image, hint: [...name][0] })), null, 2)};\n`;
await writeFile(resolve("app/pokemon-data.generated.ts"), source, "utf8");
console.log(`포켓몬 ${sorted.length}마리를 생성했습니다.`);
