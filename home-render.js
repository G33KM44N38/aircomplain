(() => {
const { routeData, metricLabels, stories, localTranslations } = window.HomeData;

const metrics = document.querySelector("#metrics");
const tabs = document.querySelectorAll(".tab");
const storyList = document.querySelector("#stories");

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

function initHomeContent() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      renderMetrics(tab.dataset.route);
    });
  });

  renderMetrics("all");
  renderStories();

  window.addEventListener("languagechange", () => {
    renderMetrics(document.querySelector(".tab.active")?.dataset.route || "all");
    renderStories();
  });
}

window.HomeRender = {
  initHomeContent,
  t,
};
})();
