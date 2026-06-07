(() => {
function normalizeSearch(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function findAirports(airports, query) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!terms.length) {
    return airports.slice(0, 8);
  }

  return airports
    .map((airport) => {
      const search = normalizeSearch(airport.search || airport.display);
      if (!terms.every((term) => search.includes(term))) {
        return null;
      }
      const codeMatch = terms.some((term) => airport.code.toLowerCase() === term);
      const startsWithCode = terms.some((term) => airport.code.toLowerCase().startsWith(term));
      const startsWithCity = airport.city && normalizeSearch(airport.city).startsWith(terms[0]);
      const score = Number(codeMatch) * 30 + Number(startsWithCode) * 20 + Number(startsWithCity) * 10;
      return { airport, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.airport.display.localeCompare(b.airport.display))
    .slice(0, 8)
    .map((result) => result.airport);
}

function setupAirportAutocomplete({ form, inputName, panelId, airports }) {
  const input = form.querySelector(`[name="${inputName}"]`);
  const panel = document.querySelector(`#${panelId}`);
  let activeIndex = -1;
  let matches = [];

  function closePanel() {
    activeIndex = -1;
    panel.hidden = true;
    panel.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function selectAirport(airport) {
    input.value = airport.label;
    input.dataset.airportCode = airport.code;
    closePanel();
  }

  function renderPanel() {
    matches = findAirports(airports, input.value);
    if (!matches.length) {
      closePanel();
      return;
    }

    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
    panel.innerHTML = matches
      .map(
        (airport, index) => `
          <button
            class="autocomplete-option${index === activeIndex ? " active" : ""}"
            id="${panelId}-option-${index}"
            type="button"
            role="option"
            aria-selected="${index === activeIndex}"
            data-index="${index}"
          >
            <strong>${escapeHtml(airport.code)}</strong>
            <span>${escapeHtml(airport.display)}</span>
          </button>
        `,
      )
      .join("");

    if (activeIndex >= 0) {
      input.setAttribute("aria-activedescendant", `${panelId}-option-${activeIndex}`);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  input.addEventListener("input", () => {
    delete input.dataset.airportCode;
    activeIndex = -1;
    renderPanel();
  });

  input.addEventListener("focus", () => {
    renderPanel();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") {
      return;
    }
    if (panel.hidden) {
      renderPanel();
    }
    if (!matches.length) {
      return;
    }
    event.preventDefault();
    if (event.key === "ArrowDown") {
      activeIndex = Math.min(activeIndex + 1, matches.length - 1);
      renderPanel();
    }
    if (event.key === "ArrowUp") {
      activeIndex = Math.max(activeIndex - 1, 0);
      renderPanel();
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      selectAirport(matches[activeIndex]);
    }
  });

  panel.addEventListener("click", (event) => {
    const option = event.target.closest(".autocomplete-option");
    if (!option) {
      return;
    }
    selectAirport(matches[Number(option.dataset.index)]);
  });

  document.addEventListener("click", (event) => {
    if (!input.contains(event.target) && !panel.contains(event.target)) {
      closePanel();
    }
  });

  closePanel();
}

function setupDatePicker({ form, t }) {
  const flightDateInput = form.querySelector('[name="flightDate"]');
  const dateTrigger = document.querySelector("#flight-date-trigger");
  const dateLabel = document.querySelector("[data-date-label]");
  const datePicker = document.querySelector("#flight-date-picker");
  const dateMonthLabel = document.querySelector("[data-date-month]");
  const dateWeekdays = document.querySelector("[data-date-weekdays]");
  const dateGrid = document.querySelector("[data-date-grid]");
  let visibleMonth = new Date();
  visibleMonth.setDate(1);

  function locale() {
    return window.AppI18n?.language === "en" ? "en-US" : "fr-FR";
  }

  function closeDatePicker() {
    datePicker.hidden = true;
    dateTrigger.setAttribute("aria-expanded", "false");
  }

  function openDatePicker() {
    datePicker.hidden = false;
    dateTrigger.setAttribute("aria-expanded", "true");
    renderDatePicker();
  }

  function updateDateLabel() {
    const selected = dateFromIso(flightDateInput.value);
    dateLabel.textContent = selected
      ? new Intl.DateTimeFormat(locale(), { dateStyle: "medium" }).format(selected)
      : t("form.date_placeholder");
  }

  function renderDatePicker() {
    const selectedIso = flightDateInput.value;
    const monthFormatter = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" });
    const weekdayFormatter = new Intl.DateTimeFormat(locale(), { weekday: "short" });
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const todayIso = formatIsoDate(new Date());

    dateMonthLabel.textContent = monthFormatter.format(visibleMonth);
    dateWeekdays.innerHTML = Array.from({ length: 7 }, (_, index) => {
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
    dateGrid.innerHTML = cells.join("");
  }

  dateTrigger.addEventListener("click", () => {
    if (datePicker.hidden) {
      const selected = dateFromIso(flightDateInput.value);
      if (selected) {
        visibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
      }
      openDatePicker();
    } else {
      closeDatePicker();
    }
  });

  document.querySelector("[data-date-prev]").addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    renderDatePicker();
  });

  document.querySelector("[data-date-next]").addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    renderDatePicker();
  });

  dateGrid.addEventListener("click", (event) => {
    const day = event.target.closest("[data-date-value]");
    if (!day) {
      return;
    }
    flightDateInput.value = day.dataset.dateValue;
    updateDateLabel();
    closeDatePicker();
  });

  document.addEventListener("click", (event) => {
    if (!datePicker.contains(event.target) && !dateTrigger.contains(event.target)) {
      closeDatePicker();
    }
  });

  dateTrigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDatePicker();
    }
  });

  form.addEventListener("reset", () => {
    setTimeout(() => {
      updateDateLabel();
      visibleMonth = new Date();
      visibleMonth.setDate(1);
      renderDatePicker();
    }, 0);
  });

  updateDateLabel();
  renderDatePicker();

  window.addEventListener("languagechange", () => {
    updateDateLabel();
    renderDatePicker();
  });
}

function setupIncidentPicker({ form, t }) {
  const incidentInput = form.querySelector('[name="incident"]');
  const incidentTrigger = document.querySelector("#incident-trigger");
  const incidentLabel = document.querySelector("[data-incident-label]");
  const incidentPicker = document.querySelector("#incident-picker");
  const options = Array.from(document.querySelectorAll(".incident-option"));
  let activeIndex = -1;

  function closeIncidentPicker() {
    incidentPicker.hidden = true;
    incidentTrigger.setAttribute("aria-expanded", "false");
  }

  function openIncidentPicker() {
    incidentPicker.hidden = false;
    incidentTrigger.setAttribute("aria-expanded", "true");
  }

  function updateActiveOption() {
    options.forEach((option, index) => {
      option.classList.toggle("active", index === activeIndex);
      option.setAttribute("aria-selected", String(index === activeIndex));
    });
  }

  function selectIncident(option) {
    incidentInput.value = option.dataset.incidentValue;
    incidentInput.dataset.i18nValue = option.dataset.i18nValue;
    incidentLabel.textContent = t(option.dataset.i18nValue);
    options.forEach((item) => item.classList.toggle("selected", item === option));
    closeIncidentPicker();
  }

  incidentTrigger.addEventListener("click", () => {
    if (incidentPicker.hidden) {
      openIncidentPicker();
    } else {
      closeIncidentPicker();
    }
  });

  incidentTrigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeIncidentPicker();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (incidentPicker.hidden) {
      openIncidentPicker();
    }
    if (event.key === "ArrowDown") {
      activeIndex = Math.min(activeIndex + 1, options.length - 1);
      updateActiveOption();
    }
    if (event.key === "ArrowUp") {
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveOption();
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      selectIncident(options[activeIndex]);
    }
  });

  options.forEach((option, index) => {
    option.addEventListener("click", () => {
      activeIndex = index;
      updateActiveOption();
      selectIncident(option);
    });
  });

  document.addEventListener("click", (event) => {
    if (!incidentPicker.contains(event.target) && !incidentTrigger.contains(event.target)) {
      closeIncidentPicker();
    }
  });

  form.addEventListener("reset", () => {
    setTimeout(() => {
      incidentInput.value = "";
      delete incidentInput.dataset.i18nValue;
      incidentLabel.textContent = t("form.incident_placeholder");
      activeIndex = -1;
      options.forEach((option) => option.classList.remove("active", "selected"));
      updateActiveOption();
    }, 0);
  });

  window.addEventListener("languagechange", () => {
    incidentLabel.textContent = incidentInput.dataset.i18nValue ? t(incidentInput.dataset.i18nValue) : t("form.incident_placeholder");
  });

  updateActiveOption();
}

window.FormComponents = {
  setupAirportAutocomplete,
  setupDatePicker,
  setupIncidentPicker,
};
})();
