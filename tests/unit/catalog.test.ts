import { describe, it, expect } from "vitest";
import type { PublicProduct, PricedProduct } from "@/types";

function stripPrice(product: PricedProduct): PublicProduct {
  const { unitPrice: _u, tiers: _t, canInstantCheckout: _c, ...rest } = product;
  return rest;
}

describe("guest catalog safety", () => {
  it("strips price fields from priced product", () => {
    const priced: PricedProduct = {
      id: "1",
      sku: "TEST",
      name: "Test",
      slug: "test",
      description: "d",
      brand: null,
      moq: 1,
      category: { slug: "diy", name: "DIY", vertical: "DIY" },
      images: [],
      inStock: true,
      allowInstantCheckout: true,
      quoteOnly: false,
      unitPrice: 99.99,
      tiers: [{ minQty: 1, unitPrice: 99.99 }],
      canInstantCheckout: true,
    };
    const guest = stripPrice(priced);
    expect(guest).not.toHaveProperty("unitPrice");
    expect(guest).not.toHaveProperty("tiers");
    expect(guest.name).toBe("Test");
  });
});
