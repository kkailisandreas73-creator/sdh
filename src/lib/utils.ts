import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function verticalSlug(vertical: string): string {
  return vertical.toLowerCase();
}

export function verticalFromSlug(slug: string): "INDUSTRIAL" | "DIY" | "FURNITURE" | null {
  const map: Record<string, "INDUSTRIAL" | "DIY" | "FURNITURE"> = {
    industrial: "INDUSTRIAL",
    diy: "DIY",
    furniture: "FURNITURE",
  };
  return map[slug.toLowerCase()] ?? null;
}
