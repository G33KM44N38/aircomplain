const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { readFile } = require("node:fs/promises");
const http = require("node:http");
const crypto = require("node:crypto");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const limit = 64 * 1024;
const reportId = "0123456789abcdef01234567";
const password = "local-test-password";
const publicFiles = [
  "index.html", "temoignages.html", "confidentialite.html",
  "conditions-publication.html", "mentions-legales.html", "admin-login.html",
  "admin.html", "styles.css", "i18n.js", "navigation.js", "airport-data.js",
  "home-data.js", "home-render.js", "form-components.js", "report-form.js",
  "script.js", "public-reports.js", "admin.js", "admin-login.js",
  "assets/hero-observatoire.png",
];
const reads = [];
const inserted = [];
const updates = [];
const concatenated = [];
let server;
let cookie;

before(async () => {
  const collection = {
    async createIndex() {},
    async deleteMany() {},
    async insertOne(report) {
      inserted.push(report);
      return { insertedId: reportId };
    },
    async findOneAndUpdate(filter, update) {
      updates.push({ filter, update });
      return { _id: reportId, ...inserted.at(-1), ...update.$set };
    },
  };
  class FakeMongoClient {
    async connect() {}
    db() { return { collection: () => collection }; }
  }
  class FakeObjectId {
    constructor(value) { this.value = value; }
    static isValid(value) { return /^[a-f\d]{24}$/i.test(value); }
  }
  const trackedBuffer = Object.create(Buffer);
  trackedBuffer.concat = (chunks, ...args) => {
    concatenated.push(chunks.reduce((total, chunk) => total + chunk.length, 0));
    return Buffer.concat(chunks, ...args);
  };
  const context = vm.createContext({
    __dirname: root,
    Buffer: trackedBuffer,
    URL,
    console: { log() {}, error() {} },
    process: {
      env: {
        MONGODB_URI: "mongodb://fake.invalid/test",
        ADMIN_PASSWORD_HASH: `pbkdf2_sha256$100000$local-salt$${crypto.pbkdf2Sync(password, "local-salt", 100000, 32, "sha256").toString("base64url")}`,
        ADMIN_SESSION_SECRET: "local-test-secret",
      },
      exit(code) { throw new Error(`Unexpected server exit: ${code}`); },
    },
    require(name) {
      if (name === "mongodb") return { MongoClient: FakeMongoClient, ObjectId: FakeObjectId };
      if (name === "node:http") return { createServer: () => ({ listen() {} }) };
      if (name === "node:fs/promises") return {
        async readFile(filename) {
          reads.push(filename);
          // Never read credentials or repository internals, even on the vulnerable server.
          if (!publicFiles.includes(path.relative(root, filename))) return Buffer.from("PRIVATE_FIXTURE");
          return readFile(filename);
        },
      };
      return require(name);
    },
  });
  vm.runInContext(await readFile(path.join(root, "server.js"), "utf8"), context, { filename: "server.js" });
  await new Promise(setImmediate);
  server = http.createServer(vm.runInContext("handleRequest", context));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const login = await request("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
  assert.equal(login.status, 200);
  cookie = login.headers["set-cookie"][0].split(";")[0];
});

after(async () => {
  if (!server) return;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

function request(url, { method = "GET", headers = {}, body, unfinished = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1", port: server.address().port, path: url, method,
      headers, agent: false,
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(1000, () => req.destroy(new Error("No response before request body ended")));
    if (body !== undefined) req.write(body);
    if (unfinished) req.flushHeaders();
    else req.end();
  });
}

test("only explicit public files are served, with unchanged contents and MIME types", async () => {
  for (const filename of publicFiles) {
    const result = await request(`/${filename}?v=security-test`, { headers: { Cookie: cookie } });
    assert.equal(result.status, 200, filename);
    assert.deepEqual(result.body, await readFile(path.join(root, filename)), filename);
    const mime = filename.endsWith(".html") ? "text/html; charset=utf-8"
      : filename.endsWith(".js") ? "text/javascript; charset=utf-8"
      : filename.endsWith(".css") ? "text/css; charset=utf-8" : "image/png";
    assert.equal(result.headers["content-type"], mime, filename);
  }
  const home = await request("/");
  assert.equal(home.status, 200);
  assert.deepEqual(home.body, await readFile(path.join(root, "index.html")));
});

test("all local HTML, CSS and script references remain available", async () => {
  for (const filename of publicFiles.filter((name) => /\.(html|css|js)$/.test(name))) {
    const source = await readFile(path.join(root, filename), "utf8");
    const references = [...source.matchAll(/(?:src|href)=["']([^"']+)["']|url\(["']?([^\s)"']+)/g)];
    for (const match of references) {
      const ref = match[1] || match[2];
      if (/^(?:https?:|data:|#)/.test(ref)) continue;
      const url = new URL(ref, `http://local/${filename}`);
      const result = await request(url.pathname, { headers: { Cookie: cookie } });
      assert.equal(result.status, 200, `${filename}: ${ref}`);
    }
  }
});

test("private files, dotfiles and traversal return 404 without reading disk", async () => {
  for (const url of [
    "/server.js", "/package.json", "/package-lock.json", "/render.yaml", "/AGENTS.md",
    "/.git", "/.git/config", "/.env", "/.env.local", "/tests/server-security.cjs",
    "/node_modules/mongodb/package.json", "/missing.js", "/assets/missing.png",
    "/../server.js", "/%2e%2e/server.js", "/assets/../../server.js",
    "/assets/%2e%2e/%2e%2e/package.json", "/..%2fserver.js", "/%2eenv",
    "/%73erver.js", "/assets\\..\\server.js", "/%00", "/%ZZ",
    "/assets/../index.html", "/assets/%2e%2e/index.html", "/assets/../admin.html",
    "/constructor", "/__proto__",
  ]) {
    const beforeReads = reads.length;
    const result = await request(url);
    assert.equal(result.status, 404, url);
    assert.equal(result.body.toString(), "Not found", url);
    assert.equal(reads.length, beforeReads, `${url} reached disk`);
  }
});

test("admin HTML still requires a session", async () => {
  const denied = await request("/admin.html");
  assert.equal(denied.status, 302);
  assert.equal(denied.headers.location, "/admin-login.html");
  const allowed = await request("/admin.html", { headers: { Cookie: cookie } });
  assert.equal(allowed.status, 200);
});

const validReport = {
  route: "Paris - Dakar", incident: "Retard", flightDate: "2026-10-20",
  email: "local@example.com", message: "Un temoignage local suffisamment long pour verifier le formulaire.", consent: true,
};

test("normal report creation and authenticated status update still work", async () => {
  const created = await request("/api/reports", { method: "POST", body: JSON.stringify(validReport) });
  assert.equal(created.status, 201);
  assert.deepEqual(JSON.parse(created.body), { id: reportId, status: "pending_review" });
  assert.equal(inserted.at(-1).message, validReport.message);
  assert.equal(inserted.at(-1).email, "local@example.com");
  const updated = await request(`/api/reports/${reportId}/status`, {
    method: "PATCH", headers: { Cookie: cookie }, body: '{"status":"published"}',
  });
  assert.equal(updated.status, 200);
  assert.equal(JSON.parse(updated.body).report.status, "published");
  assert.equal(updates.at(-1).update.$set.status, "published");
});

test("exactly 64 KiB is accepted and UTF-8 is counted in bytes", async () => {
  const prefix = JSON.stringify({ ...validReport, message: "" });
  const exact = JSON.stringify({ ...validReport, message: "x".repeat(limit - Buffer.byteLength(prefix)) });
  assert.equal(Buffer.byteLength(exact), limit);
  assert.equal((await request("/api/reports", { method: "POST", body: exact })).status, 201);
  const unicode = JSON.stringify({ ...validReport, message: "\u00e9".repeat(limit / 2) });
  assert.ok(unicode.length < limit);
  assert.equal((await request("/api/reports", { method: "POST", body: unicode })).status, 413);
});

test("an interrupted body does not stop later requests", async () => {
  const beforeInserts = inserted.length;
  await new Promise((resolve) => {
    const req = http.request({
      hostname: "127.0.0.1", port: server.address().port, path: "/api/reports", method: "POST",
      headers: { "Content-Length": 1000 }, agent: false,
    });
    req.on("error", () => {});
    req.on("close", resolve);
    req.write('{"message":"partial');
    setTimeout(() => req.destroy(), 20);
  });
  assert.equal((await request("/")).status, 200);
  assert.equal(inserted.length, beforeInserts);
});

for (const [url, method] of [["/api/reports", "POST"], ["/api/admin/login", "POST"], [`/api/reports/${reportId}/status`, "PATCH"]]) {
  test(`${method} ${url}: declared oversized body rejected before any body arrives`, async () => {
    const beforeConcat = concatenated.length;
    const result = await request(url, {
      method, headers: { Cookie: cookie, "Content-Length": 1024 * 1024 * 1024 }, unfinished: true,
    });
    assert.equal(result.status, 413);
    assert.equal(result.headers.connection, "close");
    assert.equal(concatenated.length, beforeConcat);
  });
  test(`${method} ${url}: chunked body rejected before end, without concatenating it`, async () => {
    const beforeConcat = concatenated.length;
    const beforeInserts = inserted.length;
    const beforeUpdates = updates.length;
    const result = await request(url, {
      method, headers: { Cookie: cookie, "Transfer-Encoding": "chunked" }, body: Buffer.alloc(limit + 1, 120), unfinished: true,
    });
    assert.equal(result.status, 413);
    assert.equal(result.headers.connection, "close");
    assert.equal(concatenated.length, beforeConcat);
    assert.equal(inserted.length, beforeInserts);
    assert.equal(updates.length, beforeUpdates);
  });
}
