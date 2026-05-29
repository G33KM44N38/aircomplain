const filtersForm = document.querySelector("#filters-form");
const reportsList = document.querySelector("#reports-list");
const adminStatus = document.querySelector("#admin-status");
const reportCount = document.querySelector("#report-count");
const resetButton = document.querySelector("#reset-filters");

const statusLabels = {
  pending_review: "À vérifier",
  verified: "Vérifié",
  rejected: "Rejeté",
  published: "Publié",
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function fillSelect(select, values, labeler = (value) => value) {
  const firstOption = select.querySelector("option");
  select.innerHTML = "";
  select.append(firstOption);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labeler(value);
    select.append(option);
  });
}

function buildQuery() {
  const params = new URLSearchParams();
  const token = new URLSearchParams(window.location.search).get("token");
  if (token) {
    params.set("token", token);
  }
  new FormData(filtersForm).forEach((value, key) => {
    const trimmed = String(value).trim();
    if (trimmed) {
      params.set(key, trimmed);
    }
  });
  return params;
}

function renderReports(reports) {
  reportCount.textContent = reports.length;

  if (!reports.length) {
    reportsList.innerHTML = `
      <div class="empty-state">
        <h3>Aucun témoignage trouvé</h3>
        <p>Modifiez les filtres ou ajoutez un nouveau signalement depuis le site public.</p>
      </div>
    `;
    return;
  }

  reportsList.innerHTML = reports
    .map(
      (report) => `
        <article class="report-item">
          <header>
            <div>
              <span class="report-id">#${report.id}</span>
              <h3>${escapeHtml(report.route)}</h3>
            </div>
            <span class="status-pill">${escapeHtml(statusLabels[report.status] || report.status)}</span>
          </header>
          <dl class="report-meta">
            <div>
              <dt>Date du vol</dt>
              <dd>${formatDate(report.flightDate)}</dd>
            </div>
            <div>
              <dt>Incident</dt>
              <dd>${escapeHtml(report.incident)}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>${escapeHtml(report.email || "-")}</dd>
            </div>
            <div>
              <dt>Téléphone</dt>
              <dd>${escapeHtml(report.phone || "-")}</dd>
            </div>
          </dl>
          <p class="report-message">${escapeHtml(report.message)}</p>
          <footer>Reçu le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${report.createdAt.replace(" ", "T")}Z`))}</footer>
        </article>
      `,
    )
    .join("");
}

async function loadFilters() {
  const response = await fetch("/api/reports/filters");
  const filters = await response.json();
  fillSelect(document.querySelector("#route-filter"), filters.routes || []);
  fillSelect(document.querySelector("#incident-filter"), filters.incidents || []);
  fillSelect(document.querySelector("#status-filter"), filters.statuses || [], (value) => statusLabels[value] || value);
}

async function loadReports() {
  adminStatus.textContent = "Chargement...";
  try {
    const response = await fetch(`/api/reports?${buildQuery().toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Lecture impossible.");
    }
    renderReports(data.reports || []);
    adminStatus.textContent = "Liste à jour";
  } catch (error) {
    adminStatus.textContent = error.message;
  }
}

filtersForm.addEventListener("input", () => {
  loadReports();
});

filtersForm.addEventListener("change", () => {
  loadReports();
});

resetButton.addEventListener("click", () => {
  filtersForm.reset();
  loadReports();
});

loadFilters().then(loadReports);
