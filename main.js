import { readdir, readFile, writeFile } from "fs/promises";
import sharp from "sharp";
import { parse } from "node-html-parser";

function useSafeFilename(filename) {
  return filename.replaceAll(" ", "_");
}

async function main() {
  const files = await readdir("./source");

  if (files.length)
    await Promise.all(
      files.map(async (file) => {
        const lastDotIdx = file.lastIndexOf(".");
        const ext = file.slice(lastDotIdx);
        const filename = file.slice(0, lastDotIdx);

        const isSvg = ext === ".svg";
        const isImg = ext === ".jpg";

        if (isImg)
          await sharp(`./source/${file}`)
            .webp({ quality: 85 })
            .toFile(`./dist/${useSafeFilename(filename)}.webp`);

        if (isSvg) {
          const fileContent = await readFile(`./source/${file}`, {
            encoding: "utf-8",
          });

          const root = parse(fileContent);
          const svg = root.querySelector("svg");
          const img = svg.querySelector("image");
          const rects = svg.querySelectorAll("rect");
          const defs = svg.querySelector("defs");
          const group = svg.querySelector("g");

          const width = svg.getAttribute("width");
          const height = svg.getAttribute("height");

          img.setAttributes({
            "xlink:href": `${useSafeFilename(filename)}.webp`,
            "data-name": `${useSafeFilename(filename)}`,
            width,
            height,
          });

          svg.appendChild(img);

          rects.forEach((rect, index) => {
            if (index === 0) return;

            const id = rect.getAttribute("id");

            if (!id) {
              rect.remove();
              return;
            }

            const [, , numbers] = id.split("-");

            rect.setAttribute(
              "id",
              `img-rect-${
                parseInt(numbers) > 10 ? numbers.replace(/\_\d/, "") : numbers
              }`
            );
            rect.setAttribute("stroke", "currentColor");
            rect.setAttribute("tabindex", "0");
            rect.setAttribute("fill", "transparent");
            rect.removeAttribute("stroke-opacity");

            svg.appendChild(rect);
          });

          defs?.remove();
          group?.remove();

          svg.removeWhitespace();

          const outputFile = svg.toString();

          await writeFile(
            `./dist/${useSafeFilename(filename)}.svg`,
            outputFile
          );
        }
      })
    );
}

main();
