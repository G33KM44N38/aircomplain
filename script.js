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
  ["delay", "Retard moyen", "Sur les témoignages vérifiés du trimestre"],
  ["cancellations", "Annulations", "Part des vols signalés comme annulés"],
  ["baggage", "Bagages", "Déclarations de bagage retardé ou perdu"],
  ["communication", "Communication", "Passagers jugeant l'information insuffisante"],
];

const stories = [
  {
    route: "Paris - Abidjan",
    tag: "Bagage retardé",
    date: "14 mai 2026",
    text: "Bagage livré quatre jours après l'arrivée. Le passager indique avoir reçu peu d'informations concrètes au comptoir et conserve le récépissé de déclaration.",
  },
  {
    route: "Paris - Douala",
    tag: "Communication",
    date: "8 mai 2026",
    text: "Après un retard nocturne, plusieurs voyageurs disent avoir découvert les changements de porte via l'application avant l'annonce en salle d'embarquement.",
  },
  {
    route: "Kinshasa - Paris",
    tag: "Assistance",
    date: "2 mai 2026",
    text: "Une famille voyageant avec une personne âgée signale une prise en charge tardive après correspondance manquée. Le dossier est marqué à vérifier.",
  },
];

const metrics = document.querySelector("#metrics");
const tabs = document.querySelectorAll(".tab");
const storyList = document.querySelector("#stories");
const form = document.querySelector("#report-form");
const formStatus = document.querySelector("#form-status");

function renderMetrics(route) {
  const data = routeData[route];
  metrics.innerHTML = metricLabels
    .map(
      ([key, label, note]) => `
        <article class="metric-card">
          <span>${label}</span>
          <strong>${data[key]}</strong>
          <p>${note}</p>
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
            <span>${story.date}</span>
          </header>
          <h3>${story.tag}</h3>
          <p>${story.text}</p>
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
    formStatus.textContent = "Merci d'indiquer un email ou un numéro de téléphone.";
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  formStatus.textContent = "Envoi du témoignage...";

  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Le témoignage n'a pas pu être enregistré.");
    }

    form.reset();
    formStatus.textContent = `Témoignage #${result.id} enregistré en base de données pour vérification.`;
  } catch (error) {
    formStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

renderMetrics("all");
renderStories();
