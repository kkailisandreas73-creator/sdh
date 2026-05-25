import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const defaultPriceList = await prisma.priceList.upsert({
    where: { id: "default-price-list" },
    update: {},
    create: {
      id: "default-price-list",
      name: "Standard Wholesale",
      currency: "USD",
      isDefault: true,
    },
  });

  const categories = [
    { slug: "industrial", name: "Industrial", vertical: "INDUSTRIAL" },
    { slug: "diy", name: "DIY", vertical: "DIY" },
    { slug: "furniture", name: "Furniture", vertical: "FURNITURE" },
    { slug: "industrial-tools", name: "Tools & Equipment", vertical: "INDUSTRIAL", parentSlug: "industrial" },
    { slug: "industrial-safety", name: "Safety & PPE", vertical: "INDUSTRIAL", parentSlug: "industrial" },
    { slug: "diy-hardware", name: "Hardware", vertical: "DIY", parentSlug: "diy" },
    { slug: "diy-paint", name: "Paint & Supplies", vertical: "DIY", parentSlug: "diy" },
    { slug: "furniture-office", name: "Office Furniture", vertical: "FURNITURE", parentSlug: "furniture" },
    { slug: "furniture-warehouse", name: "Warehouse & Storage", vertical: "FURNITURE", parentSlug: "furniture" },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories.filter((c) => !("parentSlug" in c && c.parentSlug))) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { slug: cat.slug, name: cat.name, vertical: cat.vertical, sortOrder: 0 },
    });
    categoryMap[cat.slug] = created.id;
  }
  for (const cat of categories.filter((c) => "parentSlug" in c && c.parentSlug)) {
    const parentSlug = (cat as { parentSlug: string }).parentSlug;
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        slug: cat.slug,
        name: cat.name,
        vertical: cat.vertical,
        parentId: categoryMap[parentSlug],
        sortOrder: 0,
      },
    });
    categoryMap[cat.slug] = created.id;
  }

  const products = [
    {
      sku: "IND-001",
      name: "Industrial Safety Helmet",
      slug: "industrial-safety-helmet",
      description: "ANSI-rated hard hat for warehouse and construction use.",
      categorySlug: "industrial-safety",
      brand: "ProSafe",
      moq: 10,
      price: 12.99,
      qty: 500,
      vertical: "INDUSTRIAL",
    },
    {
      sku: "IND-002",
      name: "Heavy-Duty Pallet Jack",
      slug: "heavy-duty-pallet-jack",
      description: "5500 lb capacity manual pallet jack.",
      categorySlug: "industrial-tools",
      brand: "LiftPro",
      moq: 1,
      price: 289.0,
      qty: 45,
      quoteOnly: true,
    },
    {
      sku: "DIY-001",
      name: "Cordless Drill Kit 20V",
      slug: "cordless-drill-kit-20v",
      description: "Brushless drill/driver with 2 batteries and charger.",
      categorySlug: "diy-hardware",
      brand: "BuildRight",
      moq: 5,
      price: 89.99,
      qty: 200,
    },
    {
      sku: "DIY-002",
      name: "Interior Paint 5 Gallon",
      slug: "interior-paint-5-gallon",
      description: "Low-VOC matte white, contractor pack.",
      categorySlug: "diy-paint",
      brand: "ColorMax",
      moq: 4,
      price: 74.5,
      qty: 120,
    },
    {
      sku: "FUR-001",
      name: "Ergonomic Office Chair",
      slug: "ergonomic-office-chair",
      description: "Mesh back, adjustable lumbar, BIFMA certified.",
      categorySlug: "furniture-office",
      brand: "ComfortWork",
      moq: 2,
      price: 149.0,
      qty: 80,
    },
    {
      sku: "FUR-002",
      name: "Steel Shelving Unit 72in",
      slug: "steel-shelving-unit-72in",
      description: "5-shelf boltless shelving, 4000 lb capacity.",
      categorySlug: "furniture-warehouse",
      brand: "StoreMax",
      moq: 1,
      price: 199.99,
      qty: 60,
      quoteOnly: true,
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId: categoryMap[p.categorySlug],
        brand: p.brand,
        moq: p.moq,
        allowInstantCheckout: !p.quoteOnly,
        quoteOnly: p.quoteOnly ?? false,
        isActive: true,
        tags: `${p.name} ${p.sku} ${p.brand}`.toLowerCase(),
        metadata: JSON.stringify({ vertical: p.vertical }),
      },
    });

    await prisma.productImage.upsert({
      where: { id: `img-${product.id}` },
      update: {},
      create: {
        id: `img-${product.id}`,
        productId: product.id,
        url: `https://placehold.co/600x400/1e3a5f/fff?text=${encodeURIComponent(p.name)}`,
        alt: p.name,
        sortOrder: 0,
      },
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: { quantityOnHand: p.qty },
      create: { productId: product.id, quantityOnHand: p.qty, reserved: 0 },
    });

    await prisma.priceTier.upsert({
      where: {
        priceListId_productId_minQty: {
          priceListId: defaultPriceList.id,
          productId: product.id,
          minQty: 1,
        },
      },
      update: { unitPrice: p.price },
      create: {
        priceListId: defaultPriceList.id,
        productId: product.id,
        minQty: 1,
        unitPrice: p.price,
      },
    });

    if (p.moq <= 5) {
      await prisma.priceTier.upsert({
        where: {
          priceListId_productId_minQty: {
            priceListId: defaultPriceList.id,
            productId: product.id,
            minQty: 10,
          },
        },
        update: { unitPrice: p.price * 0.95 },
        create: {
          priceListId: defaultPriceList.id,
          productId: product.id,
          minQty: 10,
          unitPrice: p.price * 0.95,
        },
      });
    }
  }

  await prisma.user.upsert({
    where: { email: "admin@superdiscountwholesale.com" },
    update: {},
    create: {
      email: "admin@superdiscountwholesale.com",
      passwordHash,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  const demoAccount = await prisma.account.upsert({
    where: { id: "demo-account" },
    update: {},
    create: {
      id: "demo-account",
      companyName: "Demo Hardware Co",
      status: "ACTIVE",
      paymentTerms: "NET30",
      approvedAt: new Date(),
    },
  });

  const buyerHash = await bcrypt.hash("buyer123", 12);
  await prisma.user.upsert({
    where: { email: "buyer@demo.com" },
    update: {},
    create: {
      email: "buyer@demo.com",
      passwordHash: buyerHash,
      name: "Demo Buyer",
      role: "BUYER",
      accountId: demoAccount.id,
    },
  });

  await prisma.address.upsert({
    where: { id: "demo-shipping" },
    update: {},
    create: {
      id: "demo-shipping",
      accountId: demoAccount.id,
      type: "SHIPPING",
      line1: "123 Commerce St",
      city: "Chicago",
      state: "IL",
      zip: "60601",
      country: "US",
      isDefault: true,
    },
  });

  const pages = [
    { slug: "about", title: "About Us", content: "<p>Super Discount Wholesale supplies industrial, DIY, and furniture products at competitive B2B prices.</p>" },
    { slug: "contact", title: "Contact", content: "<p>Email: sales@superdiscountwholesale.com<br/>Phone: 1-800-SUPER-DISC</p>" },
    { slug: "terms", title: "Terms of Service", content: "<p>Standard wholesale terms apply. Net-30 available for approved accounts.</p>" },
    { slug: "privacy", title: "Privacy Policy", content: "<p>We protect your business data and never sell customer information.</p>" },
  ];

  for (const page of pages) {
    await prisma.staticPage.upsert({
      where: { slug: page.slug },
      update: { title: page.title, content: page.content },
      create: page,
    });
  }

  console.log("Seed completed.");
  console.log("Admin: admin@superdiscountwholesale.com / admin123");
  console.log("Buyer: buyer@demo.com / buyer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
