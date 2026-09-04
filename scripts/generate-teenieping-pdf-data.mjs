import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const groups = [
  { season: 1, start: 1, names: ["하츄핑","바로핑","아자핑","차차핑","라라핑","해핑","키키핑","아잉핑","부끄핑","부투핑","깜빡핑","띠용핑","주르핑","차나핑","따라핑","나르핑","무셔핑","투투핑","차캐핑","떠벌핑","다조핑","화나핑","시러핑","바네핑","덜덜핑","그림핑","무거핑","꺼꿀핑","씽씽핑","베베핑","코자핑","딱풀핑","모야핑","토이핑","또까핑","플라핑","노라핑","노리핑","아휴핑","똑똑핑","꽁꽁핑","찌릿핑","홀로핑","악동핑","앙대핑"] },
  { season: 3, start: 47, names: ["플로라 하츄핑","꾸래핑","나나핑","솔찌핑","빨리핑","얌얌핑","뜨거핑","삐뽀핑","힘내핑","고쳐핑","아라핑","패션핑","꼼딱핑","퐁당핑","파티핑","꾸며핑","삐짐핑","아아핑","빙글핑","행운핑","다해핑"] },
  { season: 2, start: 69, names: ["다이아 하츄핑","조아핑","방글핑","믿어핑","까르핑","아야핑","소원핑","토닥핑","쪼꼼핑","싹싹핑","맛나핑","포근핑","메모핑","공쥬핑","짝짝핑","주네핑","뚝딱핑","발레핑","원더핑","가면핑"] },
  { season: 5, start: 90, names: ["하츄핑","빤짝핑","빛나핑","초롱핑","오로라핑","나그네핑","딩동핑","다롱핑","아롱핑","고마핑","뽀송핑","깡총핑","여우핑","뿌쵸핑","훌라핑","왕자핑","고고핑","함께핑","몰래핑","유리핑","댄스핑","루루핑","뽀뽀핑","나눔핑","로미핑"] },
  { season: 4, start: 116, names: ["베리 하츄핑","샤샤핑","포실핑","말랑핑","캔디핑","머랭핑","샌드핑","또너핑","와플핑","롤리핑","마카핑","핫케핑","커핑&머핑","요거핑","눈꽃핑","푸딩핑","멜로핑","쪼꼬핑","뿌뿌핑","새콤핑","달콤핑"] },
  { season: 6, start: 138, names: ["프린세스 하츄핑","사뿐핑","아름핑","뽀니핑","다이아나핑","이클립스핑","뽀득핑","차밍핑","나비핑","실크핑","스노우핑","이슬핑","쿨쿨핑","슈슈핑","롱롱핑","큐핑","야옹핑","깨굴핑","트롯핑","샤를핑","젠틀핑"] },
];
const alreadyIncluded = new Set(["아자핑","깜빡핑","차캐핑","조아핑","따라핑","나르핑","포근핑","공쥬핑","바네핑","아이핑","고쳐핑","빤짝핑","딩동핑","나그네핑","차밍핑","큐핑","야옹핑","샤를핑","말랑핑","트럼핑","아롱핑","다롱핑","다이아나핑","이클립스핑"]);
const sourceDirectory = resolve("public/teenieping/source/pdf-images");
const targetDirectory = resolve("public/teenieping/catalog");
await mkdir(targetDirectory, { recursive: true });
const sourceFiles = await readdir(sourceDirectory);
const seen = new Set(alreadyIncluded);
const characters = [];
for (const group of groups) {
  group.names.forEach((name, nameIndex) => {
    if (seen.has(name)) return;
    seen.add(name);
    const imageNumber = group.start + group.names.length - 1 - nameIndex;
    const sourceName = sourceFiles.find((file) => file.startsWith(`image-${String(imageNumber).padStart(3, "0")}-`));
    if (!sourceName) throw new Error(`${name} 이미지(${imageNumber})를 찾지 못했습니다.`);
    const fileName = `season-${group.season}-${String(nameIndex + 1).padStart(2, "0")}.jpg`;
    characters.push({ name, image: `/teenieping/catalog/${fileName}`, hint: [...name][0], season: group.season, sourceName, fileName });
  });
}
for (const item of characters) await copyFile(resolve(sourceDirectory, item.sourceName), resolve(targetDirectory, item.fileName));
const dataPath = resolve("app/data.ts");
const dataSource = await readFile(dataPath, "utf8");
const entries = characters.map(({ name, image, hint, season }) => `    { name: ${JSON.stringify(name)}, image: ${JSON.stringify(image)}, hint: ${JSON.stringify(hint)}, season: ${season} },`).join("\n");
const updated = dataSource.replace(/    \/\/ PDF_TINIEPING_DATA_START[\s\S]*?    \/\/ PDF_TINIEPING_DATA_END/, `    // PDF_TINIEPING_DATA_START\n${entries}\n    // PDF_TINIEPING_DATA_END`);
if (updated === dataSource) throw new Error("data.ts의 PDF 데이터 구간을 찾지 못했습니다.");
await writeFile(dataPath, updated, "utf8");
console.log(`신규 티니핑 ${characters.length}명, 전체 고유 이름 ${seen.size}명`);
