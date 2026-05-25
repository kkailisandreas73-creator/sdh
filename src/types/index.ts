export type PublicProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  moq: number;
  category: { slug: string; name: string; vertical: string };
  images: { url: string; alt: string | null }[];
  inStock: boolean;
  allowInstantCheckout: boolean;
  quoteOnly: boolean;
};

export type PricedProduct = PublicProduct & {
  unitPrice: number;
  tiers: { minQty: number; unitPrice: number }[];
  canInstantCheckout: boolean;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: "BUYER" | "ADMIN";
  accountId: string | null;
  accountStatus: string | null;
  paymentTerms: string | null;
};

export type CartLineView = {
  id: string;
  productId: string;
  quantity: number;
  product: PricedProduct;
  lineTotal: number;
  eligibility: "instant" | "quoteOnly";
};
