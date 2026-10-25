const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");
const { MongoClient, ObjectId } = require("mongodb");

const root = __dirname;
const publicFiles = new Set([
  "/index.html", "/temoignages.html", "/confidentialite.html",
  "/conditions-publication.html", "/mentions-legales.html", "/admin-login.html",
  "/admin.html", "/styles.css", "/i18n.js", "/navigation.js", "/airport-data.js",
  "/home-data.js", "/home-render.js", "/form-components.js", "/report-form.js",
  "/script.js", "/public-reports.js", "/admin.js", "/admin-login.js",
  "/assets/hero-observatoire.png",
]);
const maxJsonBodyBytes = 64 * 1024;
const mongoUri = process.env.MONGODB_URI || "";
const mongoDbName = process.env.MONGODB_DB || "aircomplain";
const port = Number(process.env.PORT || 4173);
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || "";
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || "development-admin-session-secret";
const mongoClient = mongoUri ? new MongoClient(mongoUri) : null;
const adminSessions = new Map();
let reportsCollection = null;
const adminSessionTtlMs = 1000 * 60 * 60 * 8;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function initDb() {
  if (!mongoClient) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoClient.connect();
  reportsCollection = mongoClient.db(mongoDbName).collection("reports");
  await reportsCollection.createIndex({ route: 1, incident: 1, status: 1, flightDate: 1 });
  await reportsCollection.createIndex({ createdAt: -1 });
  await reportsCollection.deleteMany({
    $or: [
      {
        message: {
          $in: [
            "Test de verification production avec un temoignage assez long pour valider lenregistrement cote serveur Render.",
            "TEST_QA_AIRCOMPLAIN temoignage temporaire pour verifier le formulaire, les filtres publics et lanonymisation des coordonnees.",
          ],
        },
      },
      { message: /^TEST_QA_AIRCOMPLAIN/ },
    ],
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function verifyPassword(password, storedHash) {
  const [algorithm, iterationsValue, salt, expectedHash] = String(storedHash).split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsValue || !salt || !expectedHash) {
    return false;
  }
  const iterations = Number(iterationsValue);
  if (!Number.isInteger(iterations) || iterations < 100000) {
    return false;
  }
  const actualHash = crypto.pbkdf2Sync(String(password), salt, iterations, 32, "sha256").toString("base64url");
  return timingSafeEqualText(actualHash, expectedHash);
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf("=");
        return [decodeURIComponent(cookie.slice(0, index)), decodeURIComponent(cookie.slice(index + 1))];
      }),
  );
}

function signSessionId(sessionId) {
  return crypto.createHmac("sha256", adminSessionSecret).update(sessionId).digest("base64url");
}

function createSessionCookie(request) {
  const sessionId = crypto.randomBytes(32).toString("base64url");
  adminSessions.set(sessionId, Date.now() + adminSessionTtlMs);
  const secure = request.headers["x-forwarded-proto"] === "https";
  return {
    sessionId,
    cookie: [
      `admin_session=${encodeURIComponent(`${sessionId}.${signSessionId(sessionId)}`)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      secure ? "Secure" : "",
      `Max-Age=${Math.floor(adminSessionTtlMs / 1000)}`,
    ].filter(Boolean).join("; "),
  };
}

function clearSessionCookie() {
  return "admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

function getAdminSessionId(request) {
  const value = parseCookies(request).admin_session;
  if (!value) {
    return "";
  }
  const [sessionId, signature] = value.split(".");
  if (!sessionId || !signature || !timingSafeEqualText(signature, signSessionId(sessionId))) {
    return "";
  }
  const expiresAt = adminSessions.get(sessionId);
  if (!expiresAt || expiresAt < Date.now()) {
    adminSessions.delete(sessionId);
    return "";
  }
  return sessionId;
}

function isAuthorizedAdmin(request) {
  return Boolean(getAdminSessionId(request));
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

class BodyTooLargeError extends Error {
  constructor() {
    super("JSON body exceeds 64 KiB");
  }
}

function sendBodyError(response, error, fallbackMessage) {
  if (error instanceof BodyTooLargeError) {
    response.setHeader("Connection", "close");
    sendJson(response, 413, { error: "Corps de requete trop volumineux. Limite : 64 Kio." });
    return;
  }
  sendJson(response, 500, { error: fallbackMessage });
}

async function readJsonBody(request) {
  if (Number(request.headers["content-length"]) > maxJsonBodyBytes) {
    request.pause();
    throw new BodyTooLargeError();
  }

  const body = await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    function cleanup() {
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
      request.off("aborted", onAborted);
    }
    function onError(error) {
      cleanup();
      reject(error);
    }
    function onAborted() {
      onError(new Error("Request body aborted"));
    }
    function onData(chunk) {
      size += chunk.length;
      if (size > maxJsonBodyBytes) {
        // Leave the socket open just long enough to send the 413 response.
        request.pause();
        onError(new BodyTooLargeError());
        return;
      }
      chunks.push(chunk);
    }
    function onEnd() {
      cleanup();
      resolve(Buffer.concat(chunks, size));
    }

    request.on("data", onData);
    request.once("end", onEnd);
    request.once("error", onError);
    request.once("aborted", onAborted);
  });
  return JSON.parse(body.toString("utf8"));
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

function serializeMongoReport(report, includePrivate) {
  const serialized = {
    id: String(report._id),
    route: report.route,
    incident: report.incident,
    flightDate: report.flightDate,
    message: report.message,
    consent: report.consent,
    status: report.status,
    createdAt: report.createdAt instanceof Date ? report.createdAt.toISOString() : report.createdAt,
  };

  if (includePrivate) {
    serialized.email = report.email || "";
    serialized.phone = report.phone || "";
  }

  return serialized;
}

async function createReport(payload) {
  const report = validateReport(payload);
  if (report.error) {
    return report;
  }

  const result = await reportsCollection.insertOne({
    route: report.route,
    incident: report.incident,
    flightDate: report.flightDate,
    email: report.email || null,
    phone: report.phone || null,
    message: report.message,
    consent: true,
    status: "pending_review",
    createdAt: new Date(),
  });
  return { id: String(result.insertedId), status: "pending_review" };
}

async function updateReportStatus(reportId, status) {
  const allowedStatuses = new Set(["pending_review", "published", "hidden", "rejected"]);
  if (!ObjectId.isValid(reportId)) {
    return { error: "Identifiant de témoignage invalide." };
  }
  if (!allowedStatuses.has(status)) {
    return { error: "Statut invalide." };
  }

  const result = await reportsCollection.findOneAndUpdate(
    { _id: new ObjectId(reportId) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!result) {
    return { error: "Témoignage introuvable." };
  }

  return serializeMongoReport(result, true);
}

function buildMongoFilters(filters, includePrivate) {
  const query = {};

  if (filters.route) {
    query.route = filters.route;
  }
  if (filters.incident) {
    query.incident = filters.incident;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.from || filters.to) {
    query.flightDate = {};
    if (filters.from) {
      query.flightDate.$gte = filters.from;
    }
    if (filters.to) {
      query.flightDate.$lte = filters.to;
    }
  }
  if (filters.q) {
    const regex = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [{ message: regex }];
    if (includePrivate) {
      query.$or.push({ email: regex }, { phone: regex });
    }
  }

  return query;
}

async function listReports(filters, options = {}) {
  const includePrivate = options.includePrivate === true;
  const projection = includePrivate ? {} : { email: 0, phone: 0 };
  const reports = await reportsCollection
    .find(buildMongoFilters(filters, includePrivate), { projection })
    .sort({ createdAt: -1, _id: -1 })
    .limit(250)
    .toArray();
  return reports.map((report) => serializeMongoReport(report, includePrivate));
}

async function getReportFilters() {
  const [routes, incidents, statuses] = await Promise.all([
    reportsCollection.distinct("route"),
    reportsCollection.distinct("incident"),
    reportsCollection.distinct("status"),
  ]);
  return {
    routes: routes.sort(),
    incidents: incidents.sort(),
    statuses: statuses.sort(),
  };
}

async function countReports() {
  return reportsCollection.countDocuments();
}

async function serveStatic(request, response) {
  // Match the raw path: URL parsing would normalize traversal into public paths.
  const rawPath = request.url.split("?")[0];
  const pathname = rawPath === "/" ? "/index.html" : rawPath;
  if (!publicFiles.has(pathname)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  if (pathname === "/admin.html" && !isAuthorizedAdmin(request)) {
    redirect(response, "/admin-login.html");
    return;
  }
  const filePath = path.join(root, pathname);

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

  if (request.method === "GET" && requestUrl.pathname === "/api/admin/session") {
    sendJson(response, 200, { authenticated: isAuthorizedAdmin(request) });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/admin/login") {
    try {
      const payload = await readJsonBody(request);
      const password = String(payload.password || "");
      if (!adminPasswordHash || !verifyPassword(password, adminPasswordHash)) {
        sendJson(response, 401, { error: "Mot de passe administrateur invalide." });
        return;
      }
      const session = createSessionCookie(request);
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": session.cookie,
      });
      response.end(JSON.stringify({ authenticated: true }));
    } catch (error) {
      console.error("Admin login failed:", error);
      sendBodyError(response, error, "Erreur serveur pendant la connexion.");
    }
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/admin/logout") {
    const sessionId = getAdminSessionId(request);
    if (sessionId) {
      adminSessions.delete(sessionId);
    }
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": clearSessionCookie(),
    });
    response.end(JSON.stringify({ authenticated: false }));
    return;
  }

  if (request.method === "POST" && request.url === "/api/reports") {
    try {
      const payload = await readJsonBody(request);
      const result = await createReport(payload);
      sendJson(response, result.error ? 400 : 201, result);
    } catch (error) {
      console.error("Report creation failed:", error);
      sendBodyError(response, error, "Erreur serveur pendant l'enregistrement.");
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/reports") {
    if (!isAuthorizedAdmin(request)) {
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
    } catch (error) {
      console.error("Admin reports read failed:", error);
      sendJson(response, 500, { error: "Erreur serveur pendant la lecture des témoignages." });
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/public/reports") {
    try {
      const reports = await listReports({
        route: requestUrl.searchParams.get("route"),
        incident: requestUrl.searchParams.get("incident"),
        status: "published",
        from: requestUrl.searchParams.get("from"),
        to: requestUrl.searchParams.get("to"),
        q: requestUrl.searchParams.get("q"),
      });
      sendJson(response, 200, { reports });
    } catch (error) {
      console.error("Public reports read failed:", error);
      sendJson(response, 500, { error: "Erreur serveur pendant la lecture des témoignages." });
    }
    return;
  }

  const statusMatch = requestUrl.pathname.match(/^\/api\/reports\/([a-f\d]{24})\/status$/i);
  if (request.method === "PATCH" && statusMatch) {
    if (!isAuthorizedAdmin(request)) {
      sendJson(response, 401, { error: "Acces administration non autorise." });
      return;
    }
    try {
      const payload = await readJsonBody(request);
      const result = await updateReportStatus(statusMatch[1], String(payload.status || "").trim());
      sendJson(response, result.error ? 400 : 200, result.error ? result : { report: result });
    } catch (error) {
      console.error("Report status update failed:", error);
      sendBodyError(response, error, "Erreur serveur pendant la mise à jour du statut.");
    }
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/reports/filters") {
    try {
      sendJson(response, 200, await getReportFilters());
    } catch (error) {
      console.error("Report filters read failed:", error);
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
      console.log(`Database: MongoDB (${mongoDbName})`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
