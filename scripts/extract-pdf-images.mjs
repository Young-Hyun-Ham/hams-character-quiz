import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = resolve("public/teenieping/source/teenieping-session-1-6.pdf");
const output = resolve("public/teenieping/source/pdf-images");
await mkdir(output, { recursive: true });
const buffer = await readFile(input);
const source = buffer.toString("latin1");
const objectPattern = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
let match;
let count = 0;
while ((match = objectPattern.exec(source))) {
  const object = match[2];
  if (!object.includes("/Subtype /Image") || !object.includes("/DCTDecode")) continue;
  const streamMarker = object.indexOf("stream");
  const endMarker = object.lastIndexOf("endstream");
  if (streamMarker < 0 || endMarker < 0) continue;
  let start = match.index + match[0].indexOf("stream") + 6;
  if (source[start] === "\r" && source[start + 1] === "\n") start += 2;
  else if (source[start] === "\n") start += 1;
  let end = match.index + match[0].lastIndexOf("endstream");
  while (end > start && (source[end - 1] === "\r" || source[end - 1] === "\n")) end -= 1;
  const image = buffer.subarray(start, end);
  if (image[0] !== 0xff || image[1] !== 0xd8) continue;
  count += 1;
  await writeFile(resolve(output, `image-${String(count).padStart(3, "0")}-obj-${match[1]}.jpg`), image);
}
console.log(`JPEG 이미지 ${count}개를 추출했습니다.`);
