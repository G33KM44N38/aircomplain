const { createServer } = require("node:http");
const { execFile } = require("node:child_process");
const { mkdir, readFile } = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const dbPath = path.join(dataDir, "air-observatoire.sqlite");
const databaseUrl = process.env.DATABASE_URL || "";
const port = Number(process.env.PORT || 4173);
const adminToken = process.env.ADMIN_TOKEN || "";
const dbDriver = databaseUrl ? "postgres" : "sqlite";
const pgPool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    })
  : null;

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

function sqliteValue(value) {
  if (value === undefined || value === null || value === "") {
    return "NULL";
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function likeValue(value) {
  return `%${String(value).replaceAll("'", "''").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

async function initDb() {
  if (dbDriver === "postgres") {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGSERIAL PRIMARY KEY,
        route TEXT NOT NULL,
        incident TEXT NOT NULL,
        flight_date DATE NOT NULL,
        email TEXT,
        phone TEXT,
        message TEXT NOT NULL,
        consent BOOLEAN NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_review',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pgPool.query("CREATE INDEX IF NOT EXISTS reports_filters_idx ON reports (route, incident, status, flight_date);");
    await pgPool.query("CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports (created_at DESC);");
    await pgPool.query(`
      DELETE FROM reports
      WHERE message IN (
        'Test de verification production avec un temoignage assez long pour valider lenregistrement cote serveur Render.',
        'TEST_QA_AIRCOMPLAIN temoignage temporaire pour verifier le formulaire, les filtres publics et lanonymisation des coordonnees.'
      )
      OR message LIKE 'TEST_QA_AIRCOMPLAIN%';
    `);
    return;
  }

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
      WHERE message IN (
        'Test de verification production avec un temoignage assez long pour valider lenregistrement cote serveur Render.',
        'TEST_QA_AIRCOMPLAIN temoignage temporaire pour verifier le formulaire, les filtres publics et lanonymisation des coordonnees.'
      )
      OR message LIKE 'TEST_QA_AIRCOMPLAIN%';
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

  if (dbDriver === "postgres") {
    const result = await pgPool.query(
      `
        INSERT INTO reports (route, incident, flight_date, email, phone, message, consent)
        VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), $6, true)
        RETURNING id;
      `,
      [report.route, report.incident, report.flightDate, report.email, report.phone, report.message],
    );
    return { id: Number(result.rows[0].id), status: "pending_review" };
  }

  const id = await runSql(`
    INSERT INTO reports (route, incident, flight_date, email, phone, message, consent)
    VALUES (
      ${sqliteValue(report.route)},
      ${sqliteValue(report.incident)},
      ${sqliteValue(report.flightDate)},
      ${sqliteValue(report.email)},
      ${sqliteValue(report.phone)},
      ${sqliteValue(report.message)},
      1
    )
    RETURNING id;
  `);

  return { id: Number(id), status: "pending_review" };
}

function buildPostgresFilters(filters, includePrivate) {
  const conditions = [];
  const values = [];
  const addParam = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.route) {
    conditions.push(`route = ${addParam(filters.route)}`);
  }
  if (filters.incident) {
    conditions.push(`incident = ${addParam(filters.incident)}`);
  }
  if (filters.status) {
    conditions.push(`status = ${addParam(filters.status)}`);
  }
  if (filters.from) {
    conditions.push(`flight_date >= ${addParam(filters.from)}`);
  }
  if (filters.to) {
    conditions.push(`flight_date <= ${addParam(filters.to)}`);
  }
  if (filters.q) {
    const query = addParam(likeValue(filters.q));
    const privateSearch = includePrivate ? ` OR email ILIKE ${query} ESCAPE '\\' OR phone ILIKE ${query} ESCAPE '\\'` : "";
    conditions.push(`(message ILIKE ${query} ESCAPE '\\'${privateSearch})`);
  }

  return { whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", values };
}

function buildSqliteFilters(filters, includePrivate) {
  const conditions = [];

  if (filters.route) {
    conditions.push(`route = ${sqliteValue(filters.route)}`);
  }
  if (filters.incident) {
    conditions.push(`incident = ${sqliteValue(filters.incident)}`);
  }
  if (filters.status) {
    conditions.push(`status = ${sqliteValue(filters.status)}`);
  }
  if (filters.from) {
    conditions.push(`flight_date >= ${sqliteValue(filters.from)}`);
  }
  if (filters.to) {
    conditions.push(`flight_date <= ${sqliteValue(filters.to)}`);
  }
  if (filters.q) {
    const query = sqliteValue(likeValue(filters.q));
    const privateSearch = includePrivate ? ` OR email LIKE ${query} ESCAPE '\\' OR phone LIKE ${query} ESCAPE '\\'` : "";
    conditions.push(`(message LIKE ${query} ESCAPE '\\'${privateSearch})`);
  }

  return conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
}

async function listReports(filters, options = {}) {
  const includePrivate = options.includePrivate === true;

  if (dbDriver === "postgres") {
    const { whereClause, values } = buildPostgresFilters(filters, includePrivate);
    const result = await pgPool.query(
      `
        SELECT
          id,
          route,
          incident,
          to_char(flight_date, 'YYYY-MM-DD') AS "flightDate",
          ${includePrivate ? "email," : ""}
          ${includePrivate ? "phone," : ""}
          message,
          consent,
          status,
          created_at AS "createdAt"
        FROM reports
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT 250;
      `,
      values,
    );
    return result.rows.map((row) => ({ ...row, id: Number(row.id) }));
  }

  const whereClause = buildSqliteFilters(filters, includePrivate);
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
  if (dbDriver === "postgres") {
    const [routes, incidents, statuses] = await Promise.all([
      pgPool.query("SELECT DISTINCT route FROM reports ORDER BY route;"),
      pgPool.query("SELECT DISTINCT incident FROM reports ORDER BY incident;"),
      pgPool.query("SELECT DISTINCT status FROM reports ORDER BY status;"),
    ]);
    return {
      routes: routes.rows.map((row) => row.route),
      incidents: incidents.rows.map((row) => row.incident),
      statuses: statuses.rows.map((row) => row.status),
    };
  }

  const rows = await runSql(`
    SELECT json_object(
      'routes', COALESCE((SELECT json_group_array(route) FROM (SELECT DISTINCT route FROM reports ORDER BY route)), json('[]')),
      'incidents', COALESCE((SELECT json_group_array(incident) FROM (SELECT DISTINCT incident FROM reports ORDER BY incident)), json('[]')),
      'statuses', COALESCE((SELECT json_group_array(status) FROM (SELECT DISTINCT status FROM reports ORDER BY status)), json('[]'))
    );
  `);

  return JSON.parse(rows || '{"routes":[],"incidents":[],"statuses":[]}');
}

async function countReports() {
  if (dbDriver === "postgres") {
    const result = await pgPool.query("SELECT COUNT(*) AS count FROM reports;");
    return Number(result.rows[0].count);
  }
  return Number(await runSql("SELECT COUNT(*) FROM reports;"));
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
    sendJson(response, 200, { count: await countReports() });
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
      console.log(dbDriver === "postgres" ? "Database: PostgreSQL" : `SQLite database: ${dbPath}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
