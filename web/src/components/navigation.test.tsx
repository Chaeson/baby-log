import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Navigation } from "./navigation";
vi.mock("next/navigation", () => ({ usePathname: () => "/records" }));
it("links all five destinations and identifies the active page", () => {
  render(<Navigation />);
  expect(screen.getByRole("link", { name: "기록" })).toHaveAttribute("href", "/records");
  expect(screen.getByRole("link", { name: "기록" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "오늘" })).not.toHaveAttribute("aria-current");
  expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/dashboard", "/records", "/insights", "/ai", "/settings"]);
});
