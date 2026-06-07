const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { MongoClient } = require("mongodb");

const root = __dirname;
const mongoUri = process.env.MONGODB_URI || "";
const mongoDbName = process.env.MONGODB_DB || "aircomplain";
const port = Number(process.env.PORT || 4173);
const adminToken = process.env.ADMIN_TOKEN || "";
const mongoClient = mongoUri ? new MongoClient(mongoUri) : null;
let reportsCollection = null;

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
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  if (pathname === "/admin.html" && !isAuthorizedAdmin(requestUrl)) {
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
    } catch (error) {
      console.error("Report creation failed:", error);
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
        status: "pending_review",
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
