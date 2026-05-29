const { createServer } = require("node:http");
const { execFile } = require("node:child_process");
const { mkdir, readFile } = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const dbPath = path.join(dataDir, "air-observatoire.sqlite");
const port = Number(process.env.PORT || 4173);
const adminToken = process.env.ADMIN_TOKEN || "";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function runSql(sql) {
  return new Promise((resolve, reject) => {
    execFile("sqlite3", [dbPath, sql], { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function sqlValue(value) {
  if (value === undefined || value === null || value === "") {
    return "NULL";
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlLike(value) {
  return `%${String(value).replaceAll("'", "''").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

async function initDb() {
  await mkdir(dataDir, { recursive: true });
  await runSql(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL,
      incident TEXT NOT NULL,
      flight_date TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      message TEXT NOT NULL,
      consent INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_review',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await runSql(`
    DELETE FROM reports
    WHERE message = 'Test de verification production avec un temoignage assez long pour valider lenregistrement cote serveur Render.';
  `);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function isAuthorizedAdmin(requestUrl) {
  if (!adminToken) {
    return true;
  }
  return requestUrl.searchParams.get("token") === adminToken;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validateReport(payload) {
  const route = String(payload.route || "").trim();
  const incident = String(payload.incident || "").trim();
  const flightDate = String(payload.flightDate || "").trim();
  const email = String(payload.email || "").trim();
  const phone = String(payload.phone || "").trim();
  const message = String(payload.message || "").trim();
  const consent = payload.consent === "on" || payload.consent === true;

  if (!route || !incident || !flightDate || !message || !consent) {
    return { error: "Merci de remplir tous les champs obligatoires." };
  }
  if (!email && !phone) {
    return { error: "Merci d'indiquer un email ou un numéro de téléphone." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "L'adresse email n'est pas valide." };
  }
  if (phone && !/^[+()\d\s.-]{6,24}$/.test(phone)) {
    return { error: "Le numéro de téléphone n'est pas valide." };
  }
  if (message.length < 40) {
    return { error: "Le témoignage doit contenir au moins 40 caractères." };
  }

  return { route, incident, flightDate, email, phone, message, consent };
}

async function createReport(payload) {
  const report = validateReport(payload);
  if (report.error) {
    return report;
  }

  const id = await runSql(`
    INSERT INTO reports (route, incident, flight_date, email, phone, message, consent)
    VALUES (
      ${sqlValue(report.route)},
      ${sqlValue(report.incident)},
      ${sqlValue(report.flightDate)},
      ${sqlValue(report.email)},
      ${sqlValue(report.phone)},
      ${sqlValue(report.message)},
      1
    )
    RETURNING id;
  `);

  return { id: Number(id), status: "pending_review" };
}

async function listReports(filters, options = {}) {
  const conditions = [];
  const includePrivate = options.includePrivate === true;

  if (filters.route) {
    conditions.push(`route = ${sqlValue(filters.route)}`);
  }
  if (filters.incident) {
    conditions.push(`incident = ${sqlValue(filters.incident)}`);
  }
  if (filters.status) {
    conditions.push(`status = ${sqlValue(filters.status)}`);
  }
  if (filters.from) {
    conditions.push(`flight_date >= ${sqlValue(filters.from)}`);
  }
  if (filters.to) {
    conditions.push(`flight_date <= ${sqlValue(filters.to)}`);
  }
  if (filters.q) {
    const query = sqlValue(sqlLike(filters.q));
    conditions.push(`(message LIKE ${query} ESCAPE '\\' OR email LIKE ${query} ESCAPE '\\' OR phone LIKE ${query} ESCAPE '\\')`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await runSql(`
    SELECT json_group_array(
      json_object(
        'id', id,
        'route', route,
        'incident', incident,
        'flightDate', flight_date,
        ${includePrivate ? "'email', email," : ""}
        ${includePrivate ? "'phone', phone," : ""}
        'message', message,
        'consent', consent,
        'status', status,
        'createdAt', created_at
      )
    )
    FROM (
      SELECT *
      FROM reports
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT 250
    );
  `);

  return JSON.parse(rows || "[]");
}

async function getReportFilters() {
  const rows = await runSql(`
    SELECT json_object(
      'routes', COALESCE((SELECT json_group_array(route) FROM (SELECT DISTINCT route FROM reports ORDER BY route)), json('[]')),
      'incidents', COALESCE((SELECT json_group_array(incident) FROM (SELECT DISTINCT incident FROM reports ORDER BY incident)), json('[]')),
      'statuses', COALESCE((SELECT json_group_array(status) FROM (SELECT DISTINCT status FROM reports ORDER BY status)), json('[]'))
    );
  `);

  return JSON.parse(rows || '{"routes":[],"incidents":[],"statuses":[]}');
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  if ((pathname === "/admin.html" || pathname === "/admin.js") && !isAuthorizedAdmin(requestUrl)) {
    response.writeHead(401, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Acces administration non autorise.");
    return;
  }
  const filePath = path.normalize(path.join(root, pathname));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "POST" && request.url === "/api/reports") {
    try {
      const payload = await readJsonBody(request);
      const result = await createReport(payload);
      sendJson(response, result.error ? 400 : 201, result);
    } catch {
      sendJson(response, 500, { error: "Erreur serveur pendant l'enregistrement." });
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/reports") {
    if (!isAuthorizedAdmin(requestUrl)) {
      sendJson(response, 401, { error: "Acces administration non autorise." });
      return;
    }
    try {
      const reports = await listReports({
        route: requestUrl.searchParams.get("route"),
        incident: requestUrl.searchParams.get("incident"),
        status: requestUrl.searchParams.get("status"),
        from: requestUrl.searchParams.get("from"),
        to: requestUrl.searchParams.get("to"),
        q: requestUrl.searchParams.get("q"),
      }, { includePrivate: true });
      sendJson(response, 200, { reports });
    } catch {
      sendJson(response, 500, { error: "Erreur serveur pendant la lecture des témoignages." });
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/public/reports") {
    try {
      const reports = await listReports({
        route: requestUrl.searchParams.get("route"),
        incident: requestUrl.searchParams.get("incident"),
        status: "pending_review",
        from: requestUrl.searchParams.get("from"),
        to: requestUrl.searchParams.get("to"),
        q: requestUrl.searchParams.get("q"),
      });
      sendJson(response, 200, { reports });
    } catch {
      sendJson(response, 500, { error: "Erreur serveur pendant la lecture des témoignages." });
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/reports/filters") {
    try {
      sendJson(response, 200, await getReportFilters());
    } catch {
      sendJson(response, 500, { error: "Erreur serveur pendant la lecture des filtres." });
    }
    return;
  }

  if (request.method === "GET" && request.url === "/api/reports/count") {
    const count = await runSql("SELECT COUNT(*) FROM reports;");
    sendJson(response, 200, { count: Number(count) });
    return;
  }

  if (request.method === "GET") {
    await serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
}

initDb()
  .then(() => {
    createServer(handleRequest).listen(port, () => {
      console.log(`Air Afrique Observatoire running on http://localhost:${port}`);
      console.log(`SQLite database: ${dbPath}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
