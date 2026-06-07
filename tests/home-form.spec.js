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
