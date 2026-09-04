import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const seasonByName = new Map([
  ["아자핑", 1], ["깜빡핑", 1], ["차캐핑", 1], ["따라핑", 1], ["나르핑", 1], ["바네핑", 1], ["아이핑", 1],
  ["조아핑", 2], ["포근핑", 2], ["공쥬핑", 2], ["고쳐핑", 3],
  ["말랑핑", 4], ["트럼핑", 4],
  ["빤짝핑", 5], ["딩동핑", 5], ["나그네핑", 5], ["아롱핑", 5], ["다롱핑", 5],
  ["차밍핑", 6], ["큐핑", 6], ["야옹핑", 6], ["샤를핑", 6], ["다이아나핑", 6], ["이클립스핑", 6],
]);

const path = resolve("app/data.ts");
const source = await readFile(path, "utf8");
const sectionPattern = /(\{ slug: "teenieping"[\s\S]*?characters: \[\r?\n)([\s\S]*?)(  \] \},\r?\n  \{ slug: "cinnamoroll")/;
const section = source.match(sectionPattern);
if (!section) throw new Error("data.ts에서 티니핑 데이터 구간을 찾지 못했습니다.");

const characters = [...section[2].matchAll(/\{ name: "([^"]+)", image: "([^"]+)", hint: "([^"]+)"(?:, season: (\d+))? \},/g)].map((match) => ({
  name: match[1], image: match[2], hint: match[3], season: match[4] ? Number(match[4]) : seasonByName.get(match[1]),
}));
if (characters.length === 0 || characters.some((item) => !item.season)) throw new Error(`데이터 수 또는 시즌 값이 올바르지 않습니다: ${characters.length}개`);

characters.sort((left, right) => left.season - right.season || left.image.localeCompare(right.image, "en"));
const rendered = characters.map((item) => `    { name: ${JSON.stringify(item.name)}, image: ${JSON.stringify(item.image)}, hint: ${JSON.stringify(item.hint)}, season: ${item.season} },`).join("\n");
await writeFile(path, source.replace(sectionPattern, `$1${rendered}\n$3`), "utf8");
console.log(`티니핑 ${characters.length}개를 season, image 오름차순으로 정렬했습니다.`);
