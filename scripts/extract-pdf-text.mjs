import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const data = new Uint8Array(await readFile("public/teenieping/source/teenieping-session-1-6.pdf"));
const document = await getDocument({ data, useSystemFonts: true }).promise;
for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  console.log(`\n--- PAGE ${pageNumber} ---`);
  console.log(content.items.map((item) => "str" in item ? item.str : "").join(" "));
}
