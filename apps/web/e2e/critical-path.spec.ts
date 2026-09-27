import { test, expect } from "@playwright/test";

function uniqueId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

test.describe("critical path", () => {
  test("register → create server → send channel message", async ({ page }) => {
    const id = uniqueId();
    const email = `e2e_${id}@example.com`;
    const username = `e2e_${id}`.slice(0, 32);
    const password = "E2eTest1pass";
    const serverName = `E2E Arena ${id}`;
    const messageText = `Hello from Playwright ${id}`;

    await page.goto("/auth/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/channels/, { timeout: 30_000 });
    await expect(page.getByText("Welcome to Nexus")).toBeVisible();

    await page.getByRole("button", { name: "Create Server" }).click();
    await page.getByPlaceholder("My Awesome Server").fill(serverName);
    await page
      .locator("form")
      .filter({ hasText: "Create Your Server" })
      .getByRole("button", { name: "Create Server" })
      .click();

    await expect(page).toHaveURL(/\/channels\/[^/]+/, { timeout: 30_000 });
    await expect(page.getByText("general")).toBeVisible({ timeout: 15_000 });

    const messageInput = page.getByPlaceholder("Send a message... (@username to mention)");
    await expect(messageInput).toBeVisible({ timeout: 20_000 });
    await messageInput.fill(messageText);
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText(messageText)).toBeVisible({ timeout: 15_000 });
  });

  test("login with existing account", async ({ page }) => {
    const id = uniqueId();
    const email = `login_${id}@example.com`;
    const username = `login_${id}`.slice(0, 32);
    const password = "E2eTest1pass";

    await page.goto("/auth/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/channels/, { timeout: 30_000 });

    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/channels/, { timeout: 30_000 });
    await expect(page.getByText("Welcome to Nexus")).toBeVisible();
  });
});
