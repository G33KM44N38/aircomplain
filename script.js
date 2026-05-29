const routeData = {
  all: {
    delay: "2h18",
    cancellations: "7%",
    baggage: "31%",
    communication: "64%",
  },
  dakar: {
    delay: "1h54",
    cancellations: "5%",
    baggage: "28%",
    communication: "59%",
  },
  abidjan: {
    delay: "2h36",
    cancellations: "8%",
    baggage: "35%",
    communication: "68%",
  },
  douala: {
    delay: "2h42",
    cancellations: "9%",
    baggage: "33%",
    communication: "71%",
  },
  kinshasa: {
    delay: "2h09",
    cancellations: "6%",
    baggage: "29%",
    communication: "61%",
  },
};

const metricLabels = [
  ["delay", "metric.delay", "metric.delay_note"],
  ["cancellations", "metric.cancellations", "metric.cancellations_note"],
  ["baggage", "metric.baggage", "metric.baggage_note"],
  ["communication", "metric.communication", "metric.communication_note"],
];

const stories = [
  {
    route: "Paris - Abidjan",
    tag: "story.abidjan_tag",
    date: "story.abidjan_date",
    text: "story.abidjan_text",
  },
  {
    route: "Paris - Douala",
    tag: "story.douala_tag",
    date: "story.douala_date",
    text: "story.douala_text",
  },
  {
    route: "Kinshasa - Paris",
    tag: "story.kinshasa_tag",
    date: "story.kinshasa_date",
    text: "story.kinshasa_text",
  },
];

const localTranslations = {
  fr: {
    "metric.delay": "Retard moyen",
    "metric.delay_note": "Sur les témoignages vérifiés du trimestre",
    "metric.cancellations": "Annulations",
    "metric.cancellations_note": "Part des vols signalés comme annulés",
    "metric.baggage": "Bagages",
    "metric.baggage_note": "Déclarations de bagage retardé ou perdu",
    "metric.communication": "Communication",
    "metric.communication_note": "Passagers jugeant l'information insuffisante",
    "story.abidjan_tag": "Bagage retardé",
    "story.abidjan_date": "14 mai 2026",
    "story.abidjan_text": "Bagage livré quatre jours après l'arrivée. Le passager indique avoir reçu peu d'informations concrètes au comptoir et conserve le récépissé de déclaration.",
    "story.douala_tag": "Communication",
    "story.douala_date": "8 mai 2026",
    "story.douala_text": "Après un retard nocturne, plusieurs voyageurs disent avoir découvert les changements de porte via l'application avant l'annonce en salle d'embarquement.",
    "story.kinshasa_tag": "Assistance",
    "story.kinshasa_date": "2 mai 2026",
    "story.kinshasa_text": "Une famille voyageant avec une personne âgée signale une prise en charge tardive après correspondance manquée. Le dossier est marqué à vérifier.",
  },
  en: {
    "metric.delay": "Average delay",
    "metric.delay_note": "Based on verified testimonials from the quarter",
    "metric.cancellations": "Cancellations",
    "metric.cancellations_note": "Share of reported flights marked as cancelled",
    "metric.baggage": "Baggage",
    "metric.baggage_note": "Reports of delayed or lost baggage",
    "metric.communication": "Communication",
    "metric.communication_note": "Passengers judging information as insufficient",
    "story.abidjan_tag": "Delayed baggage",
    "story.abidjan_date": "May 14, 2026",
    "story.abidjan_text": "Baggage delivered four days after arrival. The passenger reports receiving little concrete information at the counter and kept the claim receipt.",
    "story.douala_tag": "Communication",
    "story.douala_date": "May 8, 2026",
    "story.douala_text": "After an overnight delay, several travelers say they saw gate changes in the app before any announcement in the boarding area.",
    "story.kinshasa_tag": "Assistance",
    "story.kinshasa_date": "May 2, 2026",
    "story.kinshasa_text": "A family traveling with an elderly passenger reports late assistance after a missed connection. The case is marked for verification.",
  },
};

const metrics = document.querySelector("#metrics");
const tabs = document.querySelectorAll(".tab");
const storyList = document.querySelector("#stories");
const form = document.querySelector("#report-form");
const formStatus = document.querySelector("#form-status");

function t(key, params) {
  return window.AppI18n?.t(key, params) || localTranslations.fr[key] || key;
}

function tl(key) {
  const language = window.AppI18n?.language || "fr";
  return localTranslations[language]?.[key] || localTranslations.fr[key] || key;
}

function renderMetrics(route) {
  const data = routeData[route];
  metrics.innerHTML = metricLabels
    .map(
      ([key, label, note]) => `
        <article class="metric-card">
          <span>${tl(label)}</span>
          <strong>${data[key]}</strong>
          <p>${tl(note)}</p>
        </article>
      `,
    )
    .join("");
}

function renderStories() {
  storyList.innerHTML = stories
    .map(
      (story) => `
        <article class="story">
          <header>
            <span>${story.route}</span>
            <span>${tl(story.date)}</span>
          </header>
          <h3>${tl(story.tag)}</h3>
          <p>${tl(story.text)}</p>
        </article>
      `,
    )
    .join("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    renderMetrics(tab.dataset.route);
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.email && !data.phone) {
    formStatus.textContent = t("form.need_contact");
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  formStatus.textContent = t("form.sending");

  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || t("form.generic_error"));
    }

    form.reset();
    formStatus.textContent = t("form.saved", { id: result.id });
  } catch (error) {
    formStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

renderMetrics("all");
renderStories();

window.addEventListener("languagechange", () => {
  renderMetrics(document.querySelector(".tab.active")?.dataset.route || "all");
  renderStories();
});
