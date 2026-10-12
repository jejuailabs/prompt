import fs from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { unpackZip } from "../../src/modules/landing-pages/zip";
import { inspectBundle } from "../../src/modules/landing-pages/resources";
const root = "C:/Users/na/Desktop/남원 10주년 기념행사 샘플 랜딩페이지",
  bundle: Record<string, Uint8Array> = {};
bundle["index.html"] = fs.readFileSync(path.join(root, "index.html"));
for (const file of fs.readdirSync(path.join(root, "assets")))
  bundle["assets/" + file] = fs.readFileSync(path.join(root, "assets", file));
fs.mkdirSync("tmp/landing-qa", { recursive: true });
const zip = zipSync(bundle, { level: 6 });
fs.writeFileSync("tmp/landing-qa/남원 기념행사.zip", zip);
const manifest = inspectBundle(unpackZip(zip), "http://127.0.0.1:4186");
fs.writeFileSync(
  "tmp/landing-qa/sample-manifest.json",
  JSON.stringify(manifest, null, 2),
);
console.log(
  JSON.stringify(
    {
      zipBytes: zip.length,
      entry: manifest.entry,
      files: manifest.files.length,
      totalBytes: manifest.totalBytes,
      externalOrigins: manifest.externalOrigins,
    },
    null,
    2,
  ),
);
