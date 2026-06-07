const filtersForm = document.querySelector("#filters-form");
const reportsList = document.querySelector("#reports-list");
const adminStatus = document.querySelector("#admin-status");
const reportCount = document.querySelector("#report-count");
const resetButton = document.querySelector("#reset-filters");
const choiceFilters = {};
const dateFilters = {};

const statusLabels = {
  fr: {
    pending_review: "À vérifier",
    verified: "Vérifié",
    hidden: "Masqué",
    rejected: "Rejeté",
    published: "Publié",
  },
  en: {
    pending_review: "To review",
    verified: "Verified",
    hidden: "Hidden",
    rejected: "Rejected",
    published: "Published",
  },
};

function t(key, params) {
  return window.AppI18n?.t(key, params) || key;
}

function statusLabel(value) {
  const language = window.AppI18n?.language || "fr";
  return statusLabels[language]?.[value] || statusLabels.fr[value] || value;
}

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
  return window.AppI18n?.formatDate(value) || new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromIso(value) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function filterLabel(input, label, emptyKey, labeler = (value) => value) {
  label.textContent = input.value ? labeler(input.value) : t(emptyKey);
}

function closeAllPickers(except) {
  document.querySelectorAll(".filter-picker, .admin-date-picker").forEach((picker) => {
    if (picker !== except) {
      picker.hidden = true;
    }
  });
  document.querySelectorAll(".filter-trigger").forEach((trigger) => {
    if (trigger.getAttribute("aria-controls") !== except?.id) {
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

function setupChoiceFilter({ name, emptyKey, labeler = (value) => value }) {
  const input = document.querySelector(`#${name}-filter`);
  const trigger = document.querySelector(`#${name}-filter-trigger`);
  const picker = document.querySelector(`#${name}-filter-picker`);
  const label = trigger.querySelector("[data-filter-label]");
  let values = [];

  function closePicker() {
    picker.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function renderOptions() {
    const options = ["", ...values];
    picker.innerHTML = options
      .map((value) => {
        const selected = input.value === value;
        const text = value ? labeler(value) : t(emptyKey);
        return `
          <button
            type="button"
            class="filter-option${selected ? " selected" : ""}"
            role="option"
            aria-selected="${selected}"
            data-filter-value="${escapeHtml(value)}"
          >${escapeHtml(text)}</button>
        `;
      })
      .join("");
  }

  function openPicker() {
    closeAllPickers(picker);
    renderOptions();
    picker.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  trigger.addEventListener("click", () => {
    if (picker.hidden) {
      openPicker();
    } else {
      closePicker();
    }
  });

  picker.addEventListener("click", (event) => {
    const option = event.target.closest("[data-filter-value]");
    if (!option) {
      return;
    }
    input.value = option.dataset.filterValue;
    filterLabel(input, label, emptyKey, labeler);
    closePicker();
    loadReports();
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePicker();
    }
  });

  choiceFilters[name] = {
    setValues(nextValues) {
      values = nextValues;
      renderOptions();
      filterLabel(input, label, emptyKey, labeler);
    },
    reset() {
      input.value = "";
      filterLabel(input, label, emptyKey, labeler);
      renderOptions();
    },
    refreshLabel() {
      filterLabel(input, label, emptyKey, labeler);
      renderOptions();
    },
  };
}

function setupDateFilter({ name }) {
  const input = document.querySelector(`#${name}-filter`);
  const trigger = document.querySelector(`#${name}-filter-trigger`);
  const picker = document.querySelector(`#${name}-filter-picker`);
  const label = trigger.querySelector("[data-date-label]");
  const emptyKey = label.dataset.emptyLabel;
  const monthLabel = picker.querySelector("[data-date-month]");
  const weekdays = picker.querySelector("[data-date-weekdays]");
  const grid = picker.querySelector("[data-date-grid]");
  let visibleMonth = new Date();
  visibleMonth.setDate(1);

  function locale() {
    return window.AppI18n?.language === "en" ? "en-US" : "fr-FR";
  }

  function updateLabel() {
    const selected = dateFromIso(input.value);
    label.textContent = selected ? new Intl.DateTimeFormat(locale(), { dateStyle: "medium" }).format(selected) : t(emptyKey);
  }

  function renderDatePicker() {
    const selectedIso = input.value;
    const monthFormatter = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" });
    const weekdayFormatter = new Intl.DateTimeFormat(locale(), { weekday: "short" });
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const todayIso = formatIsoDate(new Date());

    monthLabel.textContent = monthFormatter.format(visibleMonth);
    weekdays.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const monday = new Date(2026, 0, 5 + index);
      return `<span>${weekdayFormatter.format(monday)}</span>`;
    }).join("");

    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push('<span class="date-empty"></span>');
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
      const iso = formatIsoDate(date);
      cells.push(`
        <button
          type="button"
          class="date-day${iso === selectedIso ? " selected" : ""}${iso === todayIso ? " today" : ""}"
          data-date-value="${iso}"
          aria-pressed="${iso === selectedIso}"
        >${day}</button>
      `);
    }
    grid.innerHTML = cells.join("");
  }

  function closePicker() {
    picker.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function openPicker() {
    const selected = dateFromIso(input.value);
    if (selected) {
      visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
    }
    closeAllPickers(picker);
    renderDatePicker();
    picker.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  trigger.addEventListener("click", () => {
    if (picker.hidden) {
      openPicker();
    } else {
      closePicker();
    }
  });

  picker.querySelector("[data-date-prev]").addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    renderDatePicker();
  });

  picker.querySelector("[data-date-next]").addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    renderDatePicker();
  });

  grid.addEventListener("click", (event) => {
    const day = event.target.closest("[data-date-value]");
    if (!day) {
      return;
    }
    input.value = day.dataset.dateValue;
    updateLabel();
    closePicker();
    loadReports();
  });

  dateFilters[name] = {
    reset() {
      input.value = "";
      visibleMonth = new Date();
      visibleMonth.setDate(1);
      updateLabel();
      renderDatePicker();
    },
    refreshLabel() {
      updateLabel();
      renderDatePicker();
    },
  };

  updateLabel();
  renderDatePicker();
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

function adminToken() {
  return new URLSearchParams(window.location.search).get("token") || "";
}

function visibilityAction(report) {
  if (report.status === "published") {
    return {
      status: "hidden",
      label: t("admin.hide_public"),
    };
  }
  return {
    status: "published",
    label: t("admin.show_public"),
  };
}

function renderReports(reports) {
  reportCount.textContent = reports.length;

  if (!reports.length) {
    reportsList.innerHTML = `
      <div class="empty-state">
        <h3>${t("empty.public_title")}</h3>
        <p>${t("empty.admin_text")}</p>
      </div>
    `;
    return;
  }

  reportsList.innerHTML = reports
    .map(
      (report) => {
        const action = visibilityAction(report);
        return `
        <article class="report-item" data-report-id="${escapeHtml(report.id)}">
          <header>
            <div>
              <span class="report-id">#${report.id}</span>
              <h3>${escapeHtml(report.route)}</h3>
            </div>
            <span class="status-pill">${escapeHtml(statusLabel(report.status))}</span>
          </header>
          <dl class="report-meta">
            <div>
              <dt>${t("report.flight_date")}</dt>
              <dd>${formatDate(report.flightDate)}</dd>
            </div>
            <div>
              <dt>${t("report.incident")}</dt>
              <dd>${escapeHtml(report.incident)}</dd>
            </div>
            <div>
              <dt>${t("report.email")}</dt>
              <dd>${escapeHtml(report.email || "-")}</dd>
            </div>
            <div>
              <dt>${t("report.phone")}</dt>
              <dd>${escapeHtml(report.phone || "-")}</dd>
            </div>
          </dl>
          <p class="report-message">${escapeHtml(report.message)}</p>
          <footer class="report-footer">
            <span>${t("report.received", { date: window.AppI18n?.formatDateTime(report.createdAt) || new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${report.createdAt.replace(" ", "T")}Z`)) })}</span>
            <button
              class="button ghost report-visibility-action"
              type="button"
              data-report-id="${escapeHtml(report.id)}"
              data-next-status="${escapeHtml(action.status)}"
            >${escapeHtml(action.label)}</button>
          </footer>
        </article>
      `;
      },
    )
    .join("");
}

async function updateReportVisibility(reportId, status) {
  adminStatus.textContent = t("status.updating");
  const params = new URLSearchParams();
  const token = adminToken();
  if (token) {
    params.set("token", token);
  }

  const response = await fetch(`/api/reports/${reportId}/status?${params.toString()}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || t("status.update_error"));
  }
  await loadFilters();
  await loadReports();
}

async function loadFilters() {
  const response = await fetch("/api/reports/filters");
  const filters = await response.json();
  choiceFilters.route.setValues(filters.routes || []);
  choiceFilters.incident.setValues(filters.incidents || []);
  choiceFilters.status.setValues(filters.statuses || []);
}

async function loadReports() {
  adminStatus.textContent = t("status.loading");
  try {
    const response = await fetch(`/api/reports?${buildQuery().toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || t("status.read_error"));
    }
    renderReports(data.reports || []);
    adminStatus.textContent = t("status.updated");
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
  Object.values(choiceFilters).forEach((filter) => filter.reset());
  Object.values(dateFilters).forEach((filter) => filter.reset());
  loadReports();
});

reportsList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-next-status]");
  if (!button) {
    return;
  }
  button.disabled = true;
  try {
    await updateReportVisibility(button.dataset.reportId, button.dataset.nextStatus);
  } catch (error) {
    adminStatus.textContent = error.message;
    button.disabled = false;
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".filter-trigger, .filter-picker, .admin-date-picker")) {
    closeAllPickers();
  }
});

setupChoiceFilter({ name: "route", emptyKey: "filters.all_routes" });
setupChoiceFilter({ name: "incident", emptyKey: "filters.all_incidents" });
setupChoiceFilter({ name: "status", emptyKey: "filters.all_statuses", labeler: statusLabel });
setupDateFilter({ name: "from" });
setupDateFilter({ name: "to" });

loadFilters().then(loadReports);

window.addEventListener("languagechange", () => {
  Object.values(choiceFilters).forEach((filter) => filter.refreshLabel());
  Object.values(dateFilters).forEach((filter) => filter.refreshLabel());
  loadFilters().then(loadReports);
});
