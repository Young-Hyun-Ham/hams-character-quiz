import { readFile, mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const source = new URL("../public/wishcat/source/티니핑위시캣도감.pdf", import.meta.url);
const outputDirectory = new URL("../public/wishcat/catalog/", import.meta.url);
const names = [
  "ainyang",
  "alohanyang",
  "nabinyang",
  "bebenyang",
  "lattenyang",
  "ippeunyang",
  "loveyang",
  "jjaengjjaengnyang",
  "ttokttoknyang",
  "healthynyang",
  "doctornyang",
  "kkuminyang",
  "nandanyang",
  "daldalnyang",
  "ppappinyang",
  "artnyang",
  "woanyang",
  "kokonyang",
  "shampoonyang",
];

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const destination = y * (width * 4 + 1);
    scanlines[destination] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(scanlines, destination + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function toRgba(image) {
  const pixels = image.width * image.height;
  const channels = image.data.length / pixels;
  const rgba = new Uint8ClampedArray(pixels * 4);
  for (let index = 0; index < pixels; index += 1) {
    const sourceIndex = index * channels;
    const targetIndex = index * 4;
    if (channels === 1) {
      rgba[targetIndex] = image.data[sourceIndex];
      rgba[targetIndex + 1] = image.data[sourceIndex];
      rgba[targetIndex + 2] = image.data[sourceIndex];
    } else {
      rgba[targetIndex] = image.data[sourceIndex];
      rgba[targetIndex + 1] = image.data[sourceIndex + 1];
      rgba[targetIndex + 2] = image.data[sourceIndex + 2];
    }
    rgba[targetIndex + 3] = channels === 4 ? image.data[sourceIndex + 3] : 255;
  }
  return rgba;
}

function removeConnectedWhite(width, height, rgba) {
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let head = 0;
  let tail = 0;

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const offset = pixel * 4;
    const red = rgba[offset];
    const green = rgba[offset + 1];
    const blue = rgba[offset + 2];
    const minimum = Math.min(red, green, blue);
    const maximum = Math.max(red, green, blue);
    if (minimum >= 190 && maximum - minimum <= 65) queue[tail++] = pixel;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const offset = pixel * 4;
    const minimum = Math.min(rgba[offset], rgba[offset + 1], rgba[offset + 2]);
    rgba[offset + 3] = minimum >= 245 ? 0 : Math.min(255, Math.round(((245 - minimum) * 255) / 55));
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }
}

const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await readFile(source)) }).promise;
const page = await pdf.getPage(7);
const operatorList = await page.getOperatorList();
const imageNames = operatorList.argsArray
  .filter((_, index) => operatorList.fnArray[index] === pdfjsLib.OPS.paintImageXObject)
  .map((arguments_) => arguments_[0]);

if (imageNames.length !== names.length + 1) {
  throw new Error(`Expected ${names.length + 1} images on the Wishcat page, found ${imageNames.length}.`);
}

await mkdir(outputDirectory, { recursive: true });
for (let index = 0; index < names.length; index += 1) {
  const image = page.objs.get(imageNames[index]);
  const rgba = toRgba(image);
  removeConnectedWhite(image.width, image.height, rgba);
  await writeFile(new URL(`${names[index]}.png`, outputDirectory), encodePng(image.width, image.height, rgba));
}

console.log(`Extracted ${names.length} Wishcat images with transparent white backgrounds to public/wishcat/catalog.`);
