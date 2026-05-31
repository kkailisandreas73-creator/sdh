export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  role: string;
  accountId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Account = {
  id: string;
  companyName: string;
  taxId: string | null;
  status: string;
  tierId: string | null;
  paymentTerms: string;
  approvedAt: Date | null;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Address = {
  id: string;
  accountId: string;
  type: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  vertical: string;
  sortOrder: number;
};

export type ProductImage = {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};

export type Inventory = {
  productId: string;
  quantityOnHand: number;
  reserved: number;
  reorderPoint: number | null;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brand: string | null;
  moq: number;
  allowInstantCheckout: boolean;
  quoteOnly: boolean;
  isActive: boolean;
  metadata: string | null;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductDetail = Product & {
  category: Pick<Category, "slug" | "name" | "vertical">;
  images: { url: string; alt: string | null }[];
  inventory: Inventory | null;
};

export type PriceList = {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
  createdAt: Date;
};

export type PriceTier = {
  id: string;
  priceListId: string;
  productId: string;
  minQty: number;
  unitPrice: number;
};

export type AccountPriceOverride = {
  id: string;
  accountId: string;
  productId: string;
  unitPrice: number;
  validFrom: Date;
  validTo: Date | null;
};

export type Cart = {
  id: string;
  userId: string;
  updatedAt: Date;
};

export type CartItem = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
};

export type CartItemWithProduct = CartItem & { product: ProductDetail };

export type Quote = {
  id: string;
  accountId: string;
  userId: string;
  status: string;
  buyerNotes: string | null;
  adminNotes: string | null;
  validUntil: Date | null;
  submittedAt: Date | null;
  quotedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type QuoteLine = {
  id: string;
  quoteId: string;
  productId: string;
  quantity: number;
  requestedPrice: number | null;
  quotedUnitPrice: number | null;
  lineNotes: string | null;
};

export type QuoteLineWithProduct = QuoteLine & { product: Product };

export type QuoteWithLines = Quote & {
  lines: QuoteLineWithProduct[];
  account?: Account;
  user?: User;
};

export type Order = {
  id: string;
  accountId: string;
  userId: string;
  quoteId: string | null;
  status: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  poNumber: string | null;
  stripePaymentIntentId: string | null;
  internalNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderLine = {
  id: string;
  orderId: string;
  productId: string;
  skuSnapshot: string;
  nameSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Shipment = {
  id: string;
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: Date | null;
};

export type OrderWithRelations = Order & {
  lines: OrderLine[];
  shipments: Shipment[];
  quote?: Quote | null;
  account?: Account;
  user?: User;
};

export type StaticPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
};

export type CategoryWithChildren = Category & {
  children: Category[];
};

export type CategoryTree = Category & {
  children: CategoryTree[];
};

/** Flat category row for admin tree (depth and counts from SQL). */
export type CategoryAdminRow = Category & {
  depth: number;
  productCount: number;
};
