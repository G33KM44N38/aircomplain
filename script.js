(() => {
const form = document.querySelector("#report-form");
const formStatus = document.querySelector("#form-status");
const airportData = window.AirportData || { all: [], africa: [] };

window.HomeRender.initHomeContent();

window.FormComponents.setupAirportAutocomplete({
  form,
  inputName: "departureAirport",
  panelId: "departure-airport-results",
  airports: airportData.all,
});

window.FormComponents.setupAirportAutocomplete({
  form,
  inputName: "arrivalAirport",
  panelId: "arrival-airport-results",
  airports: airportData.africa,
});

window.FormComponents.setupDatePicker({ form, t: window.HomeRender.t });
window.FormComponents.setupIncidentPicker({ form, t: window.HomeRender.t });
window.ReportForm.initReportForm({ form, formStatus, t: window.HomeRender.t });
})();
