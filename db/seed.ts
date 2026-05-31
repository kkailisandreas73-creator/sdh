import bcrypt from "bcryptjs";
import { pool, query } from "../src/lib/db/pool";
import { newId } from "../src/lib/db/id";

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  await query(
    `INSERT INTO price_lists (id, name, currency, is_default)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    ["default-price-list", "Standard Wholesale", "USD", true]
  );

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
    const id = newId();
    await query(
      `INSERT INTO categories (id, slug, name, vertical, sort_order)
       VALUES ($1, $2, $3, $4, 0)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [id, cat.slug, cat.name, cat.vertical]
    );
    const res = await query<{ id: string }>(
      `SELECT id FROM categories WHERE slug = $1`,
      [cat.slug]
    );
    categoryMap[cat.slug] = res.rows[0].id;
  }
  for (const cat of categories.filter((c) => "parentSlug" in c && c.parentSlug)) {
    const parentSlug = (cat as { parentSlug: string }).parentSlug;
    const id = newId();
    await query(
      `INSERT INTO categories (id, slug, name, vertical, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, 0)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      [id, cat.slug, cat.name, cat.vertical, categoryMap[parentSlug]]
    );
    const res = await query<{ id: string }>(
      `SELECT id FROM categories WHERE slug = $1`,
      [cat.slug]
    );
    categoryMap[cat.slug] = res.rows[0].id;
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
    const productId = newId();
    const now = new Date();
    await query(
      `INSERT INTO products (id, sku, name, slug, description, category_id, brand, moq,
        allow_instant_checkout, quote_only, is_active, tags, metadata, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name`,
      [
        productId,
        p.sku,
        p.name,
        p.slug,
        p.description,
        categoryMap[p.categorySlug],
        p.brand,
        p.moq,
        !p.quoteOnly,
        p.quoteOnly ?? false,
        true,
        `${p.name} ${p.sku} ${p.brand}`.toLowerCase(),
        JSON.stringify({ vertical: p.vertical }),
        now,
      ]
    );
    const prodRes = await query<{ id: string }>(`SELECT id FROM products WHERE sku = $1`, [
      p.sku,
    ]);
    const pid = prodRes.rows[0].id;

    await query(
      `INSERT INTO product_images (id, product_id, url, alt, sort_order)
       VALUES ($1, $2, $3, $4, 0)
       ON CONFLICT (id) DO NOTHING`,
      [
        `img-${pid}`,
        pid,
        `https://placehold.co/600x400/1e3a5f/fff?text=${encodeURIComponent(p.name)}`,
        p.name,
      ]
    );

    await query(
      `INSERT INTO inventory (product_id, quantity_on_hand, reserved)
       VALUES ($1, $2, 0)
       ON CONFLICT (product_id) DO UPDATE SET quantity_on_hand = EXCLUDED.quantity_on_hand`,
      [pid, p.qty]
    );

    await query(
      `INSERT INTO price_tiers (id, price_list_id, product_id, min_qty, unit_price)
       VALUES ($1, 'default-price-list', $2, 1, $3)
       ON CONFLICT (price_list_id, product_id, min_qty) DO UPDATE SET unit_price = EXCLUDED.unit_price`,
      [newId(), pid, p.price]
    );

    if (p.moq <= 5) {
      await query(
        `INSERT INTO price_tiers (id, price_list_id, product_id, min_qty, unit_price)
         VALUES ($1, 'default-price-list', $2, 10, $3)
         ON CONFLICT (price_list_id, product_id, min_qty) DO UPDATE SET unit_price = EXCLUDED.unit_price`,
        [newId(), pid, p.price * 0.95]
      );
    }
  }

  await query(
    `INSERT INTO users (id, email, password_hash, name, role, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO NOTHING`,
    [newId(), "admin@superdiscountwholesale.com", passwordHash, "Admin User", "ADMIN", new Date()]
  );

  await query(
    `INSERT INTO accounts (id, company_name, status, payment_terms, approved_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    ["demo-account", "Demo Hardware Co", "ACTIVE", "NET30", new Date(), new Date()]
  );

  const buyerHash = await bcrypt.hash("buyer123", 12);
  await query(
    `INSERT INTO users (id, email, password_hash, name, role, account_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO NOTHING`,
    [newId(), "buyer@demo.com", buyerHash, "Demo Buyer", "BUYER", "demo-account", new Date()]
  );

  await query(
    `INSERT INTO addresses (id, account_id, type, line1, city, state, zip, country, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING`,
    [
      "demo-shipping",
      "demo-account",
      "SHIPPING",
      "123 Commerce St",
      "Chicago",
      "IL",
      "60601",
      "US",
      true,
    ]
  );

  const pages = [
    { slug: "about", title: "About Us", content: "<p>Super Discount Wholesale supplies industrial, DIY, and furniture products at competitive B2B prices.</p>" },
    { slug: "contact", title: "Contact", content: "<p>Email: sales@superdiscountwholesale.com<br/>Phone: 1-800-SUPER-DISC</p>" },
    { slug: "terms", title: "Terms of Service", content: "<p>Standard wholesale terms apply. Net-30 available for approved accounts.</p>" },
    { slug: "privacy", title: "Privacy Policy", content: "<p>We protect your business data and never sell customer information.</p>" },
  ];

  for (const page of pages) {
    await query(
      `INSERT INTO static_pages (id, slug, title, content)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content`,
      [newId(), page.slug, page.title, page.content]
    );
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
  .finally(() => pool.end());
