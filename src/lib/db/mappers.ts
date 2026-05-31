import type {
  Account,
  Address,
  Cart,
  CartItem,
  Category,
  Inventory,
  Order,
  OrderLine,
  PriceList,
  PriceTier,
  Product,
  ProductImage,
  Quote,
  QuoteLine,
  Shipment,
  StaticPage,
  User,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function mapUser(r: any): User {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    name: r.name,
    role: r.role,
    accountId: r.account_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapAccount(r: any): Account {
  return {
    id: r.id,
    companyName: r.company_name,
    taxId: r.tax_id,
    status: r.status,
    tierId: r.tier_id,
    paymentTerms: r.payment_terms,
    approvedAt: r.approved_at,
    approvedById: r.approved_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapAddress(r: any): Address {
  return {
    id: r.id,
    accountId: r.account_id,
    type: r.type,
    line1: r.line1,
    line2: r.line2,
    city: r.city,
    state: r.state,
    zip: r.zip,
    country: r.country,
    isDefault: r.is_default,
  };
}

export function mapCategory(r: any): Category {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    parentId: r.parent_id,
    vertical: r.vertical,
    sortOrder: r.sort_order,
  };
}

export function mapProduct(r: any): Product {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    slug: r.slug,
    description: r.description,
    categoryId: r.category_id,
    brand: r.brand,
    moq: r.moq,
    allowInstantCheckout: r.allow_instant_checkout,
    quoteOnly: r.quote_only,
    isActive: r.is_active,
    metadata: r.metadata,
    tags: r.tags,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapInventory(r: any): Inventory {
  return {
    productId: r.product_id,
    quantityOnHand: r.quantity_on_hand,
    reserved: r.reserved,
    reorderPoint: r.reorder_point,
  };
}

export function mapProductImage(r: any): ProductImage {
  return {
    id: r.id,
    productId: r.product_id,
    url: r.url,
    alt: r.alt,
    sortOrder: r.sort_order,
  };
}

export function mapPriceList(r: any): PriceList {
  return {
    id: r.id,
    name: r.name,
    currency: r.currency,
    isDefault: r.is_default,
    createdAt: r.created_at,
  };
}

export function mapPriceTier(r: any): PriceTier {
  return {
    id: r.id,
    priceListId: r.price_list_id,
    productId: r.product_id,
    minQty: r.min_qty,
    unitPrice: Number(r.unit_price),
  };
}

export function mapCart(r: any): Cart {
  return {
    id: r.id,
    userId: r.user_id,
    updatedAt: r.updated_at,
  };
}

export function mapCartItem(r: any): CartItem {
  return {
    id: r.id,
    cartId: r.cart_id,
    productId: r.product_id,
    quantity: r.quantity,
  };
}

export function mapQuote(r: any): Quote {
  return {
    id: r.id,
    accountId: r.account_id,
    userId: r.user_id,
    status: r.status,
    buyerNotes: r.buyer_notes,
    adminNotes: r.admin_notes,
    validUntil: r.valid_until,
    submittedAt: r.submitted_at,
    quotedAt: r.quoted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapQuoteLine(r: any): QuoteLine {
  return {
    id: r.id,
    quoteId: r.quote_id,
    productId: r.product_id,
    quantity: r.quantity,
    requestedPrice: r.requested_price != null ? Number(r.requested_price) : null,
    quotedUnitPrice:
      r.quoted_unit_price != null ? Number(r.quoted_unit_price) : null,
    lineNotes: r.line_notes,
  };
}

export function mapOrder(r: any): Order {
  return {
    id: r.id,
    accountId: r.account_id,
    userId: r.user_id,
    quoteId: r.quote_id,
    status: r.status,
    paymentMethod: r.payment_method,
    subtotal: Number(r.subtotal),
    tax: Number(r.tax),
    shipping: Number(r.shipping),
    total: Number(r.total),
    poNumber: r.po_number,
    stripePaymentIntentId: r.stripe_payment_intent_id,
    internalNotes: r.internal_notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapOrderLine(r: any): OrderLine {
  return {
    id: r.id,
    orderId: r.order_id,
    productId: r.product_id,
    skuSnapshot: r.sku_snapshot,
    nameSnapshot: r.name_snapshot,
    quantity: r.quantity,
    unitPrice: Number(r.unit_price),
    lineTotal: Number(r.line_total),
  };
}

export function mapShipment(r: any): Shipment {
  return {
    id: r.id,
    orderId: r.order_id,
    carrier: r.carrier,
    trackingNumber: r.tracking_number,
    shippedAt: r.shipped_at,
  };
}

export function mapStaticPage(r: any): StaticPage {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    content: r.content,
  };
}
