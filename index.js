const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");
const fs = require("fs");

const initialUrl = normalizeUrl("https://example.com");
const queue = [initialUrl];
// 既に確認済みのURLの一覧
const confirmedLinks = new Set();
let count = 0;

const now = new Date();
const datetime = now.toLocaleString("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const dirname = datetime.replace(/[\/\-\s:]/g, "_");

// outputsディレクトリを作成
const outputDir = `outputs/${dirname}`;
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

main();

function normalizeUrl(url) {
  const newUrl = new URL(url);
  return `${newUrl.origin}${newUrl.pathname}`.replace(/\/+$/, "");
}

async function main() {
  while (queue.length > 0) {
    queue.sort();
    const target = queue.shift();
    if (confirmedLinks.has(target)) {
      continue;
    }

    count++;
    const url = new URL(target);

    console.log(`${count} / ${count + queue.length}件, fetch: ${target}`);
    try {
      await new Promise((r) => setTimeout(r, 2000));
      const response = await axios.get(target);
      const $ = cheerio.load(response.data);

      // ファイルに保存
      const filename = `${outputDir}/${url.hostname}${url.pathname.replace(
        /\//g,
        "_"
      )}.html`;
      fs.writeFileSync(filename, response.data);

      $("a[href]").each((i, elem) => {
        const link = $(elem).attr("href");
        const absoluteUrl = new URL(link, url);
        const normalizedUrl = normalizeUrl(absoluteUrl.href);
        if (normalizedUrl.startsWith(initialUrl)) {
          if (
            !confirmedLinks.has(normalizedUrl) &&
            !queue.includes(normalizedUrl)
          ) {
            try {
              queue.push(normalizeUrl(normalizedUrl));
            } catch (e) {
              console.error(e);
            }
          }
        }
      });

      confirmedLinks.add(target);
    } catch (e) {
      count--;
      console.error(e.message);
    }
  }
  fs.writeFileSync(
    `${outputDir}/_confirmedLinks.json`,
    JSON.stringify(Array.from(confirmedLinks))
  );
}
