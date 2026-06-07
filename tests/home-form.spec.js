const { test, expect } = require("@playwright/test");

test("homepage report form uses custom pickers and submits a complete route", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  let submittedReport;
  await page.route("**/api/reports", async (route) => {
    submittedReport = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "playwright-report", status: "pending_review" }),
    });
  });

  await page.goto("/");

  await expect(page.locator("#report-form select[name='incident']")).toHaveCount(0);
  await expect(page.locator("#report-form input[type='date']")).toHaveCount(0);

  await page.locator("input[name='departureAirport']").fill("Aalborg");
  await expect(page.locator("#departure-airport-results .autocomplete-option")).toContainText(["AAL"]);
  await page.locator("#departure-airport-results .autocomplete-option").first().click();

  await page.locator("input[name='arrivalAirport']").fill("Dakar");
  await expect(page.locator("#arrival-airport-results .autocomplete-option")).toContainText(["DSS"]);
  await page.locator("#arrival-airport-results .autocomplete-option").first().click();

  await page.locator("#incident-trigger").click();
  await page.getByRole("option", { name: /communication/i }).click();

  await page.locator("#flight-date-trigger").click();
  await page.locator("#flight-date-picker [data-date-value]").first().click();
  await expect(page.locator("input[name='flightDate']")).not.toHaveValue("");

  await page.getByLabel(/email/i).fill("qa@example.com");
  await page
    .locator("textarea[name='message']")
    .fill("TEST_QA_AIRCOMPLAIN parcours Playwright complet avec trajet, date, incident et contact valide.");
  await page.locator("input[name='consent']").check();

  await page.locator("#report-form button[type='submit']").click();

  await expect(page.locator("#form-status")).toContainText("playwright-report");
  expect(submittedReport).toMatchObject({
    incident: "Communication insuffisante",
    email: "qa@example.com",
    consent: "on",
  });
  expect(submittedReport.route).toContain("Aalborg");
  expect(submittedReport.route).toContain("DSS");
  expect(submittedReport.flightDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(consoleErrors).toEqual([]);
});

test("homepage keeps mobile navigation usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator(".menu-toggle").click();
  await expect(page.locator("body")).toHaveClass(/menu-open/);

  await page.locator("#mobile-menu").getByRole("link", { name: /tous les témoignages|all testimonials/i }).click();
  await expect(page).toHaveURL(/temoignages\.html$/);
});

test("admin filters use custom pickers", async ({ page }) => {
  const report = {
    id: "admin-picker-report",
    route: "Paris Charles de Gaulle (CDG) - Félix-Houphouët-Boigny International Airport (ABJ)",
    incident: "Communication insuffisante",
    flightDate: "2026-06-07",
    message: "Témoignage de test admin suffisamment long pour vérifier les filtres custom.",
    consent: true,
    status: "pending_review",
    createdAt: "2026-06-07T17:00:00.000Z",
    email: "admin-filter@example.com",
    phone: "+225 07 00 00 00 00",
  };
  const requests = [];

  await page.route("**/api/reports/filters", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        routes: [report.route],
        incidents: [report.incident],
        statuses: [report.status],
      }),
    });
  });

  await page.route("**/api/reports?**", async (route) => {
    requests.push(new URL(route.request().url()).searchParams.toString());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reports: [report] }),
    });
  });

  await page.goto("/admin.html");

  await expect(page.locator("#filters-form select")).toHaveCount(0);
  await expect(page.locator("#filters-form input[type='date']")).toHaveCount(0);
  await expect(page.locator("#reports-list .report-item")).toContainText("admin-filter@example.com");

  await page.locator("#route-filter-trigger").click();
  await page.locator("#route-filter-picker .filter-option", { hasText: "CDG" }).click();
  await expect(page.locator("#route-filter")).toHaveValue(report.route);

  await page.locator("#incident-filter-trigger").click();
  await page.locator("#incident-filter-picker .filter-option", { hasText: "Communication" }).click();
  await expect(page.locator("#incident-filter")).toHaveValue(report.incident);

  await page.locator("#status-filter-trigger").click();
  await page.locator("#status-filter-picker .filter-option", { hasText: /À vérifier|To review/ }).click();
  await expect(page.locator("#status-filter")).toHaveValue(report.status);

  await page.locator("#from-filter-trigger").click();
  await page.locator("#from-filter-picker [data-date-value]").first().click();
  await expect(page.locator("#from-filter")).not.toHaveValue("");

  await page.locator("#reset-filters").click();
  await expect(page.locator("#route-filter")).toHaveValue("");
  await expect(page.locator("#incident-filter")).toHaveValue("");
  await expect(page.locator("#status-filter")).toHaveValue("");
  await expect(page.locator("#from-filter")).toHaveValue("");
  expect(requests.some((query) => query.includes("route="))).toBe(true);
});
