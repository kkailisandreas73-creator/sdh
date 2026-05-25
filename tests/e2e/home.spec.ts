import { test, expect } from "@playwright/test";

test("home page loads with brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Super Discount Wholesale" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Industrial" })).toBeVisible();
});

test("guest product page hides price", async ({ page }) => {
  await page.goto("/products/cordless-drill-kit-20v");
  await expect(page.getByText("Sign in for pricing")).toBeVisible();
  await expect(page.getByText("$")).not.toBeVisible();
});
