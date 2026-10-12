import { parse as parseHTML, parseFragment, serialize } from "parse5";
import postcss from "postcss";
import valueParser from "postcss-value-parser";
import { parse as parseJS } from "acorn";
import { LandingError } from "./errors";
import { externalOrigin } from "./origins";
import { fileInfo, findEntry, extension, safePath } from "./zip";
import type { BundleManifest } from "./types";

type Tree = any;
interface Context {
  manifest: BundleManifest;
  paths: Set<string>;
  appOrigin?: string;
  prefix?: string;
}
function localUrl(raw: string, file: string, c: Context, required = true) {
  raw = raw.trim();
  if (!raw || raw.startsWith("#")) return raw;
  if (/^blob:/i.test(raw))
    throw new LandingError(
      "고정 blob URL은 다시 열 때 유지되지 않습니다. 실제 파일을 ZIP에 포함해주세요: " +
        file,
    );
  if (/^(?:data:|mailto:|tel:)/i.test(raw)) return raw;
  if (raw.startsWith("//") || /^https?:/i.test(raw)) {
    const origin = externalOrigin(
      raw.startsWith("//") ? "https:" + raw : raw,
      c.appOrigin,
    );
    if (!c.manifest.externalOrigins.includes(origin))
      c.manifest.externalOrigins.push(origin);
    if (c.manifest.externalOrigins.join(" ").length > 1000)
      throw new LandingError(
        "외부 리소스 출처가 너무 많습니다. 파일을 ZIP 안에 포함해주세요.",
      );
    return raw;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) || raw.includes("\\"))
    throw new LandingError("지원하지 않는 리소스 경로: " + file + " → " + raw);
  const relative = file.slice(c.manifest.siteRoot.length),
    url = new URL(raw, "https://bundle.invalid/" + relative);
  let logical: string;
  try {
    logical = decodeURIComponent(url.pathname).replace(/^\//, "");
  } catch {
    throw new LandingError(
      "URL 인코딩이 올바르지 않습니다: " + file + " → " + raw,
    );
  }
  if (!logical) logical = "index.html";
  if (logical.endsWith("/")) logical += "index.html";
  safePath(logical);
  let path = c.manifest.siteRoot + logical;
  const same = [...c.paths].find(
    (p) => p.normalize("NFC") === path.normalize("NFC"),
  );
  if (same) {
    path = same;
    logical = path.slice(c.manifest.siteRoot.length);
  }
  if (
    !c.paths.has(path) &&
    c.paths.has(path.replace(/\/$/, "") + "/index.html")
  ) {
    path = path.replace(/\/$/, "") + "/index.html";
    logical = path.slice(c.manifest.siteRoot.length);
  }
  if (!c.paths.has(path)) {
    if (required)
      throw new LandingError(
        "필요한 파일이 없습니다: " +
          file +
          " → " +
          raw +
          " (찾는 파일: " +
          path +
          ")",
      );
    return raw;
  }
  return c.prefix
    ? c.prefix +
        "/" +
        logical.split("/").map(encodeURIComponent).join("/") +
        url.search +
        url.hash
    : raw;
}
function cssText(text: string, file: string, c: Context) {
  let root;
  try {
    root = postcss.parse(text, { from: file });
  } catch {
    throw new LandingError("CSS 문법을 확인해주세요: " + file);
  }
  const value = (input: string) => {
    const v = valueParser(input);
    v.walk((n) => {
      if (n.type === "function" && n.value.toLowerCase() === "url") {
        const inner = valueParser.stringify(n.nodes).trim(),
          q = inner[0] === '"' || inner[0] === "'";
        const raw = q ? inner.slice(1, -1) : inner;
        if (raw.includes("\\"))
          throw new LandingError(
            "CSS 이스케이프 URL은 현재 지원하지 않습니다. 공백은 %20으로 작성해주세요: " +
              file,
          );
        const result = localUrl(raw, file, c);
        if (c.prefix && result !== raw)
          n.nodes = [
            {
              type: "string",
              quote: '"',
              value: result,
              sourceIndex: 0,
              sourceEndIndex: result.length,
            },
          ];
        return false;
      }
    });
    return v.toString();
  };
  root.walkDecls((d) => {
    d.value = value(d.value);
  });
  root.walkAtRules((a) => {
    if (a.name.toLowerCase() === "import") {
      const v = valueParser(a.params),
        first = v.nodes.find((n) => n.type !== "space");
      if (first?.type === "string") {
        const result = localUrl(first.value, file, c);
        if (c.prefix) first.value = result;
        a.params = v.toString();
      } else a.params = value(a.params);
    } else a.params = value(a.params);
  });
  return root.toString();
}
function jsText(text: string, file: string, c: Context, module = false) {
  let ast: any;
  try {
    ast = parseJS(text, {
      ecmaVersion: "latest",
      sourceType: module ? "module" : "script",
      allowReturnOutsideFunction: true,
    });
  } catch {
    throw new LandingError(
      "브라우저 JavaScript 문법을 확인해주세요. npm 빌드·서버 코드는 지원하지 않습니다: " +
        file,
    );
  }
  const edits: { start: number; end: number; value: string }[] = [];
  const read = (node: any, base = file) => {
    if (node?.type === "Literal" && typeof node.value === "string") {
      const result = localUrl(node.value, base, c);
      if (c.prefix && result !== node.value)
        edits.push({
          start: node.start,
          end: node.end,
          value: JSON.stringify(result),
        });
    } else if (node?.type === "TemplateLiteral" && !node.expressions.length) {
      const raw = node.quasis[0].value.cooked || "",
        result = localUrl(raw, base, c);
      if (c.prefix && result !== raw)
        edits.push({
          start: node.start,
          end: node.end,
          value: JSON.stringify(result),
        });
    } else
      throw new LandingError(
        "동적으로 조합하는 리소스 주소는 사전 검증할 수 없습니다. 고정 URL로 작성해주세요: " +
          file,
      );
  };
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (
      [
        "ImportDeclaration",
        "ExportNamedDeclaration",
        "ExportAllDeclaration",
      ].includes(n.type) &&
      n.source
    ) {
      if (
        typeof n.source.value === "string" &&
        !/^(?:\.\.?\/|\/|https?:|\/\/)/.test(n.source.value)
      )
        throw new LandingError(
          "npm 패키지 import는 지원하지 않습니다. 브라우저용 정적 번들을 넣어주세요: " +
            file +
            " → " +
            n.source.value,
        );
      read(n.source);
    }
    if (n.type === "ImportExpression") read(n.source);
    if (
      n.type === "CallExpression" &&
      n.callee?.type === "MemberExpression" &&
      n.callee.property?.name === "open" &&
      n.arguments[0]?.type === "Literal" &&
      /^(GET|HEAD)$/i.test(n.arguments[0].value)
    )
      read(n.arguments[1], c.manifest.entry);
    if (
      n.type === "CallExpression" &&
      n.callee?.type === "Identifier" &&
      n.callee.name === "fetch"
    )
      read(n.arguments[0], c.manifest.entry);
    if (n.type === "NewExpression" && n.callee?.name === "URL")
      read(n.arguments[0]);
    if (
      n.type === "NewExpression" &&
      ["Worker", "SharedWorker"].includes(n.callee?.name)
    )
      throw new LandingError(
        "Web Worker·Service Worker는 지원하지 않습니다: " + file,
      );
    if (
      n.type === "CallExpression" &&
      n.callee?.type === "MemberExpression" &&
      n.callee.property?.name === "register" &&
      n.callee.object?.property?.name === "serviceWorker"
    )
      throw new LandingError("Service Worker는 지원하지 않습니다: " + file);
    if (
      n.type === "AssignmentExpression" &&
      n.left?.type === "MemberExpression" &&
      ["src", "href", "poster"].includes(n.left.property?.name)
    ) {
      if (n.right.type === "Literal" && typeof n.right.value === "string")
        read(n.right, c.manifest.entry);
      else if (
        n.right.type === "TemplateLiteral" ||
        n.right.type === "BinaryExpression"
      )
        throw new LandingError("동적 리소스 경로는 지원하지 않습니다: " + file);
    }
    for (const [key, v] of Object.entries(n))
      if (!["start", "end", "loc"].includes(key)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") walk(v);
      }
  };
  walk(ast);
  const unique = [...new Map(edits.map((e) => [e.start, e])).values()].sort(
    (a, b) => b.start - a.start,
  );
  for (const e of unique)
    text = text.slice(0, e.start) + e.value + text.slice(e.end);
  return text;
}
function htmlText(
  text: string,
  file: string,
  c: Context,
  sessionId?: string,
  svg = false,
) {
  const tree: any = svg ? parseFragment(text) : parseHTML(text);
  const visit = (n: Tree) => {
    if (n.tagName) {
      const attrs: Record<string, string> = Object.fromEntries(
        (n.attrs || []).map((a: any) => [a.name, a.value]),
      );
      if (n.tagName === "base")
        throw new LandingError(
          "HTML의 base 태그는 지원하지 않습니다. 상대 경로 또는 /assets 경로를 사용해주세요: " +
            file,
        );
      if (["iframe", "object", "embed"].includes(n.tagName))
        throw new LandingError(
          "중첩 iframe·object·embed는 지원하지 않습니다: " + file,
        );
      if (
        n.tagName === "meta" &&
        ["refresh", "content-security-policy"].includes(
          (attrs["http-equiv"] || "").toLowerCase(),
        )
      )
        throw new LandingError(
          "자동 이동·별도 CSP meta는 현재 지원하지 않습니다: " + file,
        );
      if (
        n.tagName === "script" &&
        ["importmap", "speculationrules"].includes(attrs.type)
      )
        throw new LandingError(
          "import map·사전 탐색은 지원하지 않습니다: " + file,
        );
      for (const a of n.attrs || []) {
        if (
          ["src", "href", "poster", "data-src", "data-href"].includes(a.name)
        ) {
          if (n.tagName === "a" && /^(?:https?:|\/\/)/i.test(a.value)) {
            externalOrigin(
              a.value.startsWith("//") ? "https:" + a.value : a.value,
              c.appOrigin,
            );
            continue;
          }
          a.value = localUrl(a.value, file, c);
        } else if (a.name === "srcset") {
          if (a.value.includes("data:"))
            throw new LandingError(
              "data URL srcset은 지원하지 않습니다: " + file,
            );
          a.value = a.value
            .split(",")
            .map((part: string) => {
              const [url, ...size] = part.trim().split(/\s+/);
              return [localUrl(url, file, c), ...size].join(" ");
            })
            .join(", ");
        } else if (a.name === "style")
          a.value = cssText("a{" + a.value + "}", file, c).replace(
            /^a\{|\}$/g,
            "",
          );
        else if (a.name.startsWith("on")) a.value = jsText(a.value, file, c);
        else if (["action", "formaction"].includes(a.name) && a.value)
          throw new LandingError(
            "서버로 전송하는 폼은 지원하지 않습니다: " + file,
          );
      }
      if (
        n.tagName === "style" ||
        (n.tagName === "script" &&
          !attrs.src &&
          ["", "module", "text/javascript", "application/javascript"].includes(
            attrs.type || "",
          ))
      ) {
        const child = n.childNodes?.find((x: any) => x.nodeName === "#text");
        if (child)
          child.value =
            n.tagName === "style"
              ? cssText(child.value, file, c)
              : jsText(child.value, file, c, attrs.type === "module");
      }
    }
    for (const child of n.childNodes || []) visit(child);
    if (n.content) visit(n.content);
  };
  visit(tree);
  let result = serialize(tree);
  if (c.prefix && !svg) {
    const logical = file
        .slice(c.manifest.siteRoot.length)
        .split("/")
        .map(encodeURIComponent)
        .join("/"),
      base = c.prefix + "/" + logical;
    result = result.replace(
      /<head>/i,
      '<head><base href="' +
        base +
        '"><meta name="referrer" content="no-referrer">',
    );
    const bridge = `<script>(()=>{const id=${JSON.stringify(sessionId)},send=(type,detail)=>parent.postMessage({source:"playlab-landing-preview",sessionId:id,type,detail},"*");addEventListener("DOMContentLoaded",()=>send("ready"));addEventListener("load",()=>send("ready"));addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();send("close");}});addEventListener("error",e=>{const n=e.target;if(n&&n!==window&&n.tagName)send("resource-error",String(n.src||n.href||n.tagName).slice(0,500));else if(e.message)send("script-error",String(e.message).slice(0,300));},true);addEventListener("unhandledrejection",e=>send("script-error",String(e.reason?.message||e.reason||"스크립트 처리 실패").slice(0,300)));try{new PerformanceObserver(list=>{for(const r of list.getEntries())if(r.responseStatus>=400)send("resource-error","HTTP "+r.responseStatus+" · "+r.name.slice(0,400))}).observe({type:"resource",buffered:true})}catch{}addEventListener("securitypolicyviolation",e=>send("resource-error","지원하지 않거나 차단된 리소스: "+String(e.blockedURI).slice(0,300)));document.addEventListener("click",e=>{const a=e.target.closest?.("a[href]");if(a){if(a.hasAttribute("download")||a.target&&a.target!=="_self"){e.preventDefault();send("notice","미리보기에서는 다운로드·새 창·상위 페이지 이동을 지원하지 않습니다.");return;}const u=new URL(a.href);if(u.origin!==location.origin){e.preventDefault();send("notice","외부 페이지 이동은 미리보기에서 지원하지 않습니다.");}}},true);})();<\/script>`;
    result = result.replace(/<head>/i, "<head>" + bridge);
  }
  return result;
}
export function inspectBundle(files: Map<string, Buffer>, appOrigin?: string) {
  const found = findEntry(files),
    manifest: BundleManifest = {
      ...found,
      files: [...files].map(([p, b]) => fileInfo(p, b)),
      externalOrigins: [],
      warnings: [
        "외부 폰트·스크립트는 해당 서비스와 네트워크가 필요합니다.",
        "서버 코드·폼의 서버 전송·새 창·상위 페이지 이동·Worker·브라우저 저장소는 지원하지 않습니다.",
      ],
      totalBytes: [...files.values()].reduce((n, b) => n + b.length, 0),
    },
    context: Context = { manifest, paths: new Set(files.keys()), appOrigin };
  for (const [file, data] of files) {
    const ext = extension(file);
    if (!["html", "htm", "css", "js", "mjs", "svg"].includes(ext)) continue;
    const text = data.toString("utf8").replace(/^\uFEFF/, "");
    if (["html", "htm"].includes(ext)) htmlText(text, file, context);
    else if (ext === "svg") htmlText(text, file, context, undefined, true);
    else if (ext === "css") cssText(text, file, context);
    else if (["js", "mjs"].includes(ext))
      jsText(
        text,
        file,
        context,
        ext === "mjs" || /^\s*(?:import|export)\s/m.test(text),
      );
  }
  return manifest;
}
export function renderFile(
  file: string,
  bytes: Buffer,
  manifest: BundleManifest,
  prefix: string,
  sessionId: string,
) {
  const c: Context = {
      manifest: structuredClone(manifest),
      paths: new Set(manifest.files.map((f) => f.path)),
      prefix,
    },
    ext = extension(file);
  if (!["html", "htm", "css", "js", "mjs", "svg"].includes(ext)) return bytes;
  const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
  if (["html", "htm"].includes(ext))
    return Buffer.from(htmlText(text, file, c, sessionId));
  if (ext === "svg")
    return Buffer.from(htmlText(text, file, c, undefined, true));
  if (ext === "css") return Buffer.from(cssText(text, file, c));
  if (["js", "mjs"].includes(ext))
    return Buffer.from(
      jsText(
        text,
        file,
        c,
        ext === "mjs" || /^\s*(?:import|export)\s/m.test(text),
      ),
    );
  return bytes;
}
