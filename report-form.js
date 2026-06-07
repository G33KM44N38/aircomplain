(() => {
function initReportForm({ form, formStatus, t }) {
  form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const departureAirport = String(data.departureAirport || "").trim();
  const arrivalAirport = String(data.arrivalAirport || "").trim();

  if (!departureAirport || !arrivalAirport) {
    formStatus.textContent = t("form.need_route");
    return;
  }

  data.route = `${departureAirport} - ${arrivalAirport}`;
  form.querySelector('[name="route"]').value = data.route;

  if (!data.flightDate) {
    formStatus.textContent = t("form.need_date");
    return;
  }

  if (!data.incident) {
    formStatus.textContent = t("form.incident_placeholder");
    return;
  }

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
}

window.ReportForm = {
  initReportForm,
};
})();
