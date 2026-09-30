import { test, expect } from "@playwright/test";
test("invalid API requests fail safely", async ({ request }) => {
  expect(
    (
      await request.post("/api/questions", {
        data: { mineId: "m01", question: "x" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/demo/import", {
        headers: { Origin: "https://untrusted.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/demo/import", {
        data: "{broken",
        headers: { "Content-Type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/demo/import", {
        data: { padding: "x".repeat(17000) },
      })
    ).status(),
  ).toBe(413);
  expect((await request.get("/api/evidence/no-such-id")).status()).toBe(404);
});
test("map failure keeps an accessible mine list", async ({ page }) => {
  await page.route("**/*.tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/map");
  await expect(
    page.getByText("Map tiles are unavailable. Use the mine list below."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Aaranya Open Cast/ }).first(),
  ).toBeVisible();
});
test("all workspace pages and evidence previews work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Mine intelligence, connected." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open Digital Mine Twin" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Aaranya Open Cast" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /View source d04 page 1/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Source excerpt")).toBeVisible();
  await expect(page.getByRole("dialog").locator("img")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  for (const [path, title] of [
    ["documents", "Your evidence library"],
    ["timeline", "GeoTimeline"],
    ["validation", "Evidence, ready for review."],
    ["ai", "CoalSMART AI"],
    ["reports", "From evidence to a clear brief."],
    ["map", "CoalMap"],
  ]) {
    await page.goto(`/${path}`);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/documents");
  await page
    .getByRole("combobox", { name: "Document format" })
    .selectOption("Excel");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("reviews persist across two browsers and reject concurrent edits", async ({
  page,
  browser,
  request,
}) => {
  const snap = await (await request.get("/api/data")).json();
  test.skip(!snap.connected, "Requires configured and seeded Supabase.");
  await page.goto("/validation?mine=m01");
  const c = snap.conflicts.find((c: { mineId: string }) => c.mineId === "m01");
  test.skip(!c, "The baseline conflict is needed.");
  await page.getByRole("button", { name: "Accept value A" }).first().click();
  await expect(page.getByText("Demo resolved")).toBeVisible();
  const second = await browser.newContext();
  const secondPage = await second.newPage();
  await secondPage.goto("/validation?mine=m01");
  await expect(secondPage.getByText("Demo resolved")).toBeVisible();
  const stale = await request.post(
    `/api/conflicts/${encodeURIComponent(c.id)}/resolve`,
    { data: { expectedVersion: c.version, selectedFactId: null } },
  );
  expect(stale.status()).toBe(409);
  await second.close();
  const current = await (await request.get("/api/data")).json();
  const reset = await request.post("/api/demo/reset", {
    data: { expectedRevision: current.revision, confirm: "RESET SHARED DEMO" },
  });
  expect(reset.ok()).toBe(true);
});
test("live AI, conflict handling and report approval complete the loop", async ({
  page,
  request,
}) => {
  const snap = await (await request.get("/api/data")).json();
  test.skip(
    !snap.connected || !snap.aiAvailable,
    "Requires configured OpenAI and Supabase.",
  );
  await page.goto("/ai?mine=m01");
  await page
    .getByRole("button", { name: "What was production in 2023?" })
    .click();
  await expect(page.getByText("4.50 Mt", { exact: true })).toBeVisible({
    timeout: 60000,
  });
  await page.goto("/reports?mine=m01");
  await page.getByRole("button", { name: "Generate brief" }).click();
  await expect(page.locator("#print-report")).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "Demo approve", exact: true }).click();
  await expect(
    page.getByText("Demo approved", { exact: true }).first(),
  ).toBeVisible();
});
test("mobile layout has no horizontal overflow and navigates by keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Documents", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Your evidence library" }),
  ).toBeVisible();
});
