import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import rawGlobAssets from "./scripts/vite-plugin-raw-glob-assets.mjs";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { isEmbeddable } from "./backend/checkEmbed.mjs";
import { resolveAllowedPath, isUntrustedCaller } from "./backend/devFsGuard.mjs";

function emitVersionJson() {
  return {
    name: "emit-version-json",
    generateBundle() {
      const v = createHash("sha1").update(Date.now().toString()).digest("hex").slice(0, 10);
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ v }) });
    },
  };
}

// Dev-only: file system API so the in-browser editors can read/write src files
function devFsPlugin() {
  return {
    name: "dev-fs-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/dev-fs") && !req.url?.startsWith("/api/github") && !req.url?.startsWith("/api/check-embed")) return next();
        const url = new URL(req.url, "http://localhost");
        const action = url.pathname.replace("/api/dev-fs/", "").replace("/api/dev-fs", "").replace("/api/", "");
        const root = process.cwd();

        const json = (data, status = 200) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        };
        // Only pages on this machine may use these endpoints (see backend/devFsGuard.mjs).
        if (isUntrustedCaller(req.headers)) return json({ error: "Forbidden origin" }, 403);

        try {
          if (action === "ping") {
            return json({ ok: true, mode: "vite-dev" });

          } else if (action === "check-embed" && req.method === "GET") {
            const targetUrl = url.searchParams.get("url");
            const requestOrigin = url.searchParams.get("origin") || "";
            if (!targetUrl) return json({ error: "Missing url" }, 400);
            try {
              const resObj = await fetch(targetUrl, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } });
              const xfo = resObj.headers.get("x-frame-options") || "";
              const csp = resObj.headers.get("content-security-policy") || "";
              const embeddable = isEmbeddable({ xfo, csp, requestOrigin, targetUrl });
              return json({ url: targetUrl, embeddable });
            } catch (e) {
              return json({ url: targetUrl, embeddable: false, error: e.message });
            }

          // GitHub PR creation — same logic as backend/server.mjs but runs inside Vite dev server
          } else if (req.method === "POST" && req.url?.startsWith("/api/github/pr")) {
            let body = "";
            req.on("data", d => (body += d));
            req.on("end", async () => {
              try {
                const { title, description, branchName, files, githubToken } = JSON.parse(body);
                const token = githubToken || process.env.GITHUB_TOKEN || "";
                const owner = process.env.GITHUB_OWNER || "g4m3rm1k3";
                const repo  = process.env.GITHUB_REPO  || "upskillos";
                const base  = process.env.GITHUB_BASE_BRANCH || "main";
                if (!token) return json({ error: "GitHub token required. Set GITHUB_TOKEN env var or enter it in the form." }, 503);
                if (!title || !branchName || !files?.length) return json({ error: "Missing required fields" }, 400);
                const h = {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  Accept: "application/vnd.github+json",
                  "X-GitHub-Api-Version": "2022-11-28",
                };
                const api = `https://api.github.com/repos/${owner}/${repo}`;
                const refResp = await fetch(`${api}/git/ref/heads/${base}`, { headers: h });
                if (!refResp.ok) throw new Error(`Base branch "${base}" not found: ${await refResp.text()}`);
                const { object: { sha: baseSha } } = await refResp.json();
                const branchResp = await fetch(`${api}/git/refs`, { method: "POST", headers: h, body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }) });
                if (!branchResp.ok) throw new Error(`Create branch failed: ${await branchResp.text()}`);
                for (const file of files) {
                  const ghPath = file.path.replace(/\\/g, "/").replace(/^\//, "");
                  let sha;
                  const ex = await fetch(`${api}/contents/${ghPath}?ref=${branchName}`, { headers: h });
                  if (ex.ok) sha = (await ex.json()).sha;
                  const content = Buffer.from(file.content, "utf-8").toString("base64");
                  const putResp = await fetch(`${api}/contents/${ghPath}`, { method: "PUT", headers: h, body: JSON.stringify({ message: `Update ${ghPath}`, content, branch: branchName, ...(sha ? { sha } : {}) }) });
                  if (!putResp.ok) throw new Error(`Write ${ghPath} failed: ${await putResp.text()}`);
                }
                const prResp = await fetch(`${api}/pulls`, { method: "POST", headers: h, body: JSON.stringify({ title, body: description || "", head: branchName, base }) });
                if (!prResp.ok) throw new Error(`Create PR failed: ${await prResp.text()}`);
                json({ ok: true, prUrl: (await prResp.json()).html_url });
              } catch (e) {
                json({ error: e.message }, 500);
              }
            });
            return;

          } else if (action === "list" && req.method === "GET") {
            const dir = url.searchParams.get("dir") || "src/courses/geometry/diagrams";
            const extParam = url.searchParams.get("ext");
            const absDir = resolveAllowedPath(root, dir);
            if (!absDir) return json({ error: "Only folders inside src/ or public/ can be listed" }, 403);
            if (!fs.existsSync(absDir)) return json([]);
            const entries = fs.readdirSync(absDir, { withFileTypes: true });
            let files;
            if (!extParam) {
              files = entries.map(e => ({ name: e.name, path: `${dir}/${e.name}`, type: e.isDirectory() ? "dir" : "file" }));
            } else {
              const exts = extParam.split(",").map(e => e.trim().replace(/^\./, ""));
              files = entries.filter(e => e.isFile() && exts.some(x => e.name.endsWith(`.${x}`))).map(e => ({ name: e.name, path: `${dir}/${e.name}`, type: "file" }));
            }
            return json(files);

          } else if (action === "read" && req.method === "GET") {
            const filePath = url.searchParams.get("path") || "";
            const absPath = resolveAllowedPath(root, filePath);
            if (!absPath) return json({ error: "Only files inside src/ or public/ can be read" }, 403);
            const content = fs.readFileSync(absPath, "utf-8");
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            return res.end(content);

          } else if (action === "write" && req.method === "POST") {
            let body = "";
            req.on("data", d => (body += d));
            req.on("end", () => {
              try {
                const { filePath, content } = JSON.parse(body);
                const absPath = resolveAllowedPath(root, filePath);
                if (!absPath) return json({ error: "Writes are only allowed inside src/ or public/" }, 403);
                fs.mkdirSync(path.dirname(absPath), { recursive: true });
                fs.writeFileSync(absPath, content, "utf-8");
                json({ ok: true });
              } catch (e) {
                json({ error: e.message }, 500);
              }
            });
          } else {
            next();
          }
        } catch (e) {
          json({ error: e.message }, 500);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [rawGlobAssets(), react(), emitVersionJson(), devFsPlugin()],
  resolve: {
    alias: {
      '@opencalc/openmat': path.resolve(process.cwd(), 'packages/openmat/src/index.ts'),
    },
  },
  base: process.env.VITE_BASE_URL ?? (process.env.ELECTRON_BUILD ? "./" : "/"),
  // One fixed port: the browser stores caches (including the ~1 GB in-browser AI model) per origin,
  // and every localhost port is a separate origin. Silently moving to 5174, 5175… when 5173 is busy
  // downloaded and stored the model again for each port. Pass --port explicitly for a second server.
  server: { port: 5173, strictPort: true },
  build: {
    outDir: "dist",
    reportCompressedSize: false,
    contentHash: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "d3-vendor": ["d3"],
          "three-vendor": ["three"],
          "katex-vendor": ["katex"],
        },
      },
    },
  },
});
