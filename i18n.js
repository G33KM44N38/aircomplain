const I18N_STORAGE_KEY = "air-observatoire-language";
const DEFAULT_LANGUAGE = "fr";

const translations = {
  fr: {
    "nav.home": "Accueil",
    "nav.public_site": "Site public",
    "nav.observatory": "Observatoire",
    "nav.testimonials": "Témoignages",
    "nav.all_testimonials": "Tous les témoignages",
    "nav.report": "Signaler",
    "nav.submit_testimonial": "Déposer un témoignage",
    "nav.public_testimonials": "Témoignages publics",
    "nav.new_testimonial": "Nouveau témoignage",
    "nav.open_menu": "Ouvrir le menu",
    "nav.main_aria": "Navigation principale",
    "nav.mobile_aria": "Navigation mobile",
    "nav.testimonials_aria": "Navigation témoignages",
    "nav.admin_aria": "Navigation administration",
    "aria.home": "Accueil Air Afrique Observatoire",
    "aria.back_home": "Retour à l'accueil",
    "aria.back_public": "Retour au site public",
    "aria.demo_metrics": "Indicateurs de démonstration",
    "home.meta_description": "Observatoire citoyen de la qualité des services aériens entre l'Afrique et l'Europe.",
    "home.title": "Air Afrique Observatoire",
    "home.eyebrow": "Plateforme citoyenne Afrique-Europe",
    "home.hero_title": "Observer, documenter, améliorer l'expérience des passagers africains.",
    "home.hero_copy": "Un espace indépendant pour centraliser les témoignages, suivre les incidents récurrents et transformer les expériences de voyage en données utiles.",
    "home.cta_report": "Déposer un témoignage",
    "home.cta_explore": "Explorer les témoignages",
    "home.metric_reports": "témoignages collectés",
    "home.metric_routes": "routes suivies",
    "home.metric_comm": "signalent une communication insuffisante",
    "home.mvp": "MVP opérationnel",
    "home.facts_title": "Un observatoire centré sur les faits, pas sur l'accusation.",
    "home.collect_title": "Collecter",
    "home.collect_text": "Des récits structurés par date, route, type d'incident, preuves disponibles et niveau d'impact.",
    "home.verify_title": "Vérifier",
    "home.verify_text": "Une modération éditoriale protège les personnes, filtre les accusations non étayées et anonymise les données.",
    "home.publish_title": "Publier",
    "home.publish_text": "Des tendances lisibles, des recommandations pratiques et des dossiers comparatifs pour ouvrir le dialogue.",
    "home.dashboard": "Tableau de bord",
    "home.routes_title": "Suivi des lignes signalées",
    "home.routes_aria": "Filtrer par route",
    "home.tab_all": "Toutes",
    "home.recent": "Témoignages récents",
    "home.recent_title": "Des expériences classées pour repérer les problèmes récurrents.",
    "home.recent_copy": "Les exemples ci-dessous illustrent le format public visé: factuel, daté, anonymisé, et centré sur ce qui peut être vérifié ou amélioré.",
    "home.contribute": "Contribuer",
    "home.form_title": "Signaler une expérience de voyage",
    "home.form_copy": "Ce formulaire de démonstration prépare les champs clés du futur produit: route, date, catégorie, contact, impact et consentement de publication.",
    "form.route": "Route concernée",
    "form.route_placeholder": "Choisir une route",
    "form.route_other": "Autre route Afrique-Europe",
    "form.incident": "Type d'incident",
    "form.incident_placeholder": "Choisir une catégorie",
    "form.flight_date": "Date du vol",
    "form.email": "Email",
    "form.phone": "Téléphone",
    "form.contact_note": "Indiquez au moins un moyen de contact pour le suivi du dossier.",
    "form.message": "Votre témoignage",
    "form.message_placeholder": "Décrivez les faits observables: heure, aéroport, informations reçues, conséquences...",
    "form.consent": "J'accepte que mon témoignage soit vérifié et publié de façon anonymisée.",
    "form.submit": "Envoyer pour vérification",
    "form.need_contact": "Merci d'indiquer un email ou un numéro de téléphone.",
    "form.sending": "Envoi du témoignage...",
    "form.generic_error": "Le témoignage n'a pas pu être enregistré.",
    "form.saved": "Témoignage #{id} enregistré en base de données pour vérification.",
    "incident.delay": "Retard important",
    "incident.cancel": "Annulation",
    "incident.baggage": "Bagage perdu ou retardé",
    "incident.communication": "Communication insuffisante",
    "incident.assistance": "Accueil ou assistance",
    "footer.prototype": "Air Afrique Observatoire est un prototype indépendant. Les données affichées sont fictives pour le MVP.",
    "footer.top": "Retour en haut",
    "public.title": "Témoignages - Air Afrique Observatoire",
    "public.eyebrow": "Observatoire public",
    "public.heading": "Témoignages des voyageurs",
    "public.copy": "Parcourez les signalements anonymisés par trajet, date, type d'incident ou mot-clé.",
    "public.summary": "Témoignages",
    "filters.title": "Filtres",
    "filters.reset": "Réinitialiser",
    "filters.route": "Trajet",
    "filters.all_routes": "Tous les trajets",
    "filters.incident": "Type d'incident",
    "filters.all_incidents": "Tous les incidents",
    "filters.status": "Statut",
    "filters.all_statuses": "Tous les statuts",
    "filters.from": "Date début",
    "filters.to": "Date fin",
    "filters.search": "Recherche",
    "filters.public_placeholder": "Mot dans un témoignage...",
    "filters.admin_placeholder": "Nom, téléphone, mot dans le témoignage...",
    "public.results": "Résultats",
    "status.loading": "Chargement...",
    "status.updated": "Liste à jour",
    "status.read_error": "Lecture impossible.",
    "empty.public_title": "Aucun témoignage trouvé",
    "empty.public_text": "Modifiez les filtres ou déposez le premier témoignage pour alimenter l'observatoire.",
    "empty.admin_text": "Modifiez les filtres ou ajoutez un nouveau signalement depuis le site public.",
    "report.testimonial": "Témoignage",
    "report.flight_date": "Date du vol",
    "report.route": "Trajet",
    "report.category": "Catégorie",
    "report.incident": "Incident",
    "report.email": "Email",
    "report.phone": "Téléphone",
    "report.received": "Reçu le {date}",
    "admin.title": "Administration - Air Afrique Observatoire",
    "admin.eyebrow": "Administration",
    "admin.heading": "Suivi des témoignages",
    "admin.copy": "Consultez les signalements enregistrés en base, filtrez par trajet, date, incident ou mot-clé, puis préparez la vérification.",
    "admin.summary": "Total affiché",
    "admin.testimonials": "Témoignages",
  },
  en: {
    "nav.home": "Home",
    "nav.public_site": "Public site",
    "nav.observatory": "Observatory",
    "nav.testimonials": "Testimonials",
    "nav.all_testimonials": "All testimonials",
    "nav.report": "Report",
    "nav.submit_testimonial": "Submit a testimonial",
    "nav.public_testimonials": "Public testimonials",
    "nav.new_testimonial": "New testimonial",
    "nav.open_menu": "Open menu",
    "nav.main_aria": "Main navigation",
    "nav.mobile_aria": "Mobile navigation",
    "nav.testimonials_aria": "Testimonials navigation",
    "nav.admin_aria": "Administration navigation",
    "aria.home": "Air Afrique Observatoire home",
    "aria.back_home": "Back to home",
    "aria.back_public": "Back to the public site",
    "aria.demo_metrics": "Demo indicators",
    "home.meta_description": "A civic observatory tracking air service quality between Africa and Europe.",
    "home.title": "Air Afrique Observatory",
    "home.eyebrow": "Africa-Europe civic platform",
    "home.hero_title": "Observe, document, and improve the experience of African passengers.",
    "home.hero_copy": "An independent space to centralize testimonials, track recurring incidents, and turn travel experiences into useful data.",
    "home.cta_report": "Submit a testimonial",
    "home.cta_explore": "Explore testimonials",
    "home.metric_reports": "testimonials collected",
    "home.metric_routes": "routes monitored",
    "home.metric_comm": "report insufficient communication",
    "home.mvp": "Operational MVP",
    "home.facts_title": "An observatory focused on facts, not accusations.",
    "home.collect_title": "Collect",
    "home.collect_text": "Structured accounts by date, route, incident type, available evidence, and level of impact.",
    "home.verify_title": "Verify",
    "home.verify_text": "Editorial moderation protects people, filters unsupported allegations, and anonymizes data.",
    "home.publish_title": "Publish",
    "home.publish_text": "Readable trends, practical recommendations, and comparative briefs to open dialogue.",
    "home.dashboard": "Dashboard",
    "home.routes_title": "Monitoring reported routes",
    "home.routes_aria": "Filter by route",
    "home.tab_all": "All",
    "home.recent": "Recent testimonials",
    "home.recent_title": "Classified experiences to spot recurring issues.",
    "home.recent_copy": "The examples below show the target public format: factual, dated, anonymized, and focused on what can be verified or improved.",
    "home.contribute": "Contribute",
    "home.form_title": "Report a travel experience",
    "home.form_copy": "This demo form prepares the future product's key fields: route, date, category, contact details, impact, and publication consent.",
    "form.route": "Route concerned",
    "form.route_placeholder": "Choose a route",
    "form.route_other": "Other Africa-Europe route",
    "form.incident": "Incident type",
    "form.incident_placeholder": "Choose a category",
    "form.flight_date": "Flight date",
    "form.email": "Email",
    "form.phone": "Phone",
    "form.contact_note": "Provide at least one contact method so the case can be followed up.",
    "form.message": "Your testimonial",
    "form.message_placeholder": "Describe observable facts: time, airport, information received, consequences...",
    "form.consent": "I agree that my testimonial may be verified and published anonymously.",
    "form.submit": "Send for verification",
    "form.need_contact": "Please provide an email address or phone number.",
    "form.sending": "Sending testimonial...",
    "form.generic_error": "The testimonial could not be saved.",
    "form.saved": "Testimonial #{id} saved in the database for verification.",
    "incident.delay": "Major delay",
    "incident.cancel": "Cancellation",
    "incident.baggage": "Lost or delayed baggage",
    "incident.communication": "Insufficient communication",
    "incident.assistance": "Reception or assistance",
    "footer.prototype": "Air Afrique Observatory is an independent prototype. Displayed data is fictional for the MVP.",
    "footer.top": "Back to top",
    "public.title": "Testimonials - Air Afrique Observatory",
    "public.eyebrow": "Public observatory",
    "public.heading": "Traveler testimonials",
    "public.copy": "Browse anonymized reports by route, date, incident type, or keyword.",
    "public.summary": "Testimonials",
    "filters.title": "Filters",
    "filters.reset": "Reset",
    "filters.route": "Route",
    "filters.all_routes": "All routes",
    "filters.incident": "Incident type",
    "filters.all_incidents": "All incidents",
    "filters.status": "Status",
    "filters.all_statuses": "All statuses",
    "filters.from": "Start date",
    "filters.to": "End date",
    "filters.search": "Search",
    "filters.public_placeholder": "Word in a testimonial...",
    "filters.admin_placeholder": "Name, phone, word in testimonial...",
    "public.results": "Results",
    "status.loading": "Loading...",
    "status.updated": "List updated",
    "status.read_error": "Unable to read data.",
    "empty.public_title": "No testimonial found",
    "empty.public_text": "Change the filters or submit the first testimonial to feed the observatory.",
    "empty.admin_text": "Change the filters or add a new report from the public site.",
    "report.testimonial": "Testimonial",
    "report.flight_date": "Flight date",
    "report.route": "Route",
    "report.category": "Category",
    "report.incident": "Incident",
    "report.email": "Email",
    "report.phone": "Phone",
    "report.received": "Received on {date}",
    "admin.title": "Administration - Air Afrique Observatory",
    "admin.eyebrow": "Administration",
    "admin.heading": "Testimonial monitoring",
    "admin.copy": "Review reports stored in the database, filter by route, date, incident, or keyword, then prepare verification.",
    "admin.summary": "Total shown",
    "admin.testimonials": "Testimonials",
  },
};

function getInitialLanguage() {
  const params = new URLSearchParams(window.location.search);
  const queryLanguage = params.get("lang");
  const savedLanguage = localStorage.getItem(I18N_STORAGE_KEY);
  const browserLanguage = navigator.language?.toLowerCase().startsWith("en") ? "en" : DEFAULT_LANGUAGE;
  return translations[queryLanguage] ? queryLanguage : translations[savedLanguage] ? savedLanguage : browserLanguage;
}

function translate(key, params = {}) {
  const language = window.AppI18n?.language || getInitialLanguage();
  const value = translations[language]?.[key] || translations[DEFAULT_LANGUAGE][key] || key;
  return Object.entries(params).reduce((text, [param, replacement]) => text.replace(`{${param}}`, replacement), value);
}

function applyTranslations() {
  const language = window.AppI18n.language;
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", translate(element.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", translate(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-content]").forEach((element) => {
    element.setAttribute("content", translate(element.dataset.i18nContent));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.textContent = translate(element.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-language-option]").forEach((button) => {
    const isActive = button.dataset.languageOption === language;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setLanguage(language) {
  if (!translations[language]) {
    return;
  }
  window.AppI18n.language = language;
  localStorage.setItem(I18N_STORAGE_KEY, language);
  applyTranslations();
  window.dispatchEvent(new CustomEvent("languagechange", { detail: { language } }));
}

window.AppI18n = {
  language: getInitialLanguage(),
  setLanguage,
  t: translate,
  formatDate(value, options = { dateStyle: "medium" }) {
    if (!value) {
      return "-";
    }
    return new Intl.DateTimeFormat(this.language === "en" ? "en-US" : "fr-FR", options).format(
      new Date(`${value}T00:00:00`),
    );
  },
  formatDateTime(value) {
    if (!value) {
      return "-";
    }
    const date = value.includes("T") ? new Date(value) : new Date(`${value.replace(" ", "T")}Z`);
    return new Intl.DateTimeFormat(this.language === "en" ? "en-US" : "fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-language-option]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.languageOption));
  });
  applyTranslations();
});
