import { query } from "../pool";
import { mapAccount, mapAddress, mapUser } from "../mappers";
import type { User } from "../types";
import { newId } from "../id";

export async function findUserByEmail(email: string) {
  const { rows } = await query(`SELECT * FROM users WHERE email = $1`, [
    email.toLowerCase(),
  ]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: string) {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserWithAccount(email: string) {
  const { rows } = await query(
    `SELECT u.*, a.id AS acc_id, a.company_name, a.tax_id, a.status AS acc_status,
            a.tier_id, a.payment_terms, a.approved_at, a.approved_by,
            a.created_at AS acc_created_at, a.updated_at AS acc_updated_at
     FROM users u
     LEFT JOIN accounts a ON a.id = u.account_id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  if (!rows[0]) return null;
  const user = mapUser(rows[0]);
  const account = rows[0].acc_id
    ? mapAccount({
        id: rows[0].acc_id,
        company_name: rows[0].company_name,
        tax_id: rows[0].tax_id,
        status: rows[0].acc_status,
        tier_id: rows[0].tier_id,
        payment_terms: rows[0].payment_terms,
        approved_at: rows[0].approved_at,
        approved_by: rows[0].approved_by,
        created_at: rows[0].acc_created_at,
        updated_at: rows[0].acc_updated_at,
      })
    : null;
  return { user, account };
}

export async function findUserWithAccountById(id: string) {
  const { rows } = await query(
    `SELECT u.*, a.id AS acc_id, a.company_name, a.tax_id, a.status AS acc_status,
            a.tier_id, a.payment_terms, a.approved_at, a.approved_by,
            a.created_at AS acc_created_at, a.updated_at AS acc_updated_at
     FROM users u
     LEFT JOIN accounts a ON a.id = u.account_id
     WHERE u.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const user = mapUser(rows[0]);
  const account = rows[0].acc_id
    ? mapAccount({
        id: rows[0].acc_id,
        company_name: rows[0].company_name,
        tax_id: rows[0].tax_id,
        status: rows[0].acc_status,
        tier_id: rows[0].tier_id,
        payment_terms: rows[0].payment_terms,
        approved_at: rows[0].approved_at,
        approved_by: rows[0].approved_by,
        created_at: rows[0].acc_created_at,
        updated_at: rows[0].acc_updated_at,
      })
    : null;
  return { user, account };
}

export async function findUserProfile(id: string) {
  const { rows } = await query(
    `SELECT u.*, a.id AS acc_id, a.company_name, a.tax_id, a.status AS acc_status,
            a.tier_id, a.payment_terms, a.approved_at, a.approved_by,
            a.created_at AS acc_created_at, a.updated_at AS acc_updated_at
     FROM users u
     LEFT JOIN accounts a ON a.id = u.account_id
     WHERE u.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const user = mapUser(rows[0]);
  let account = null;
  let addresses: ReturnType<typeof mapAddress>[] = [];
  if (rows[0].acc_id) {
    account = mapAccount({
      id: rows[0].acc_id,
      company_name: rows[0].company_name,
      tax_id: rows[0].tax_id,
      status: rows[0].acc_status,
      tier_id: rows[0].tier_id,
      payment_terms: rows[0].payment_terms,
      approved_at: rows[0].approved_at,
      approved_by: rows[0].approved_by,
      created_at: rows[0].acc_created_at,
      updated_at: rows[0].acc_updated_at,
    });
    const addrRes = await query(`SELECT * FROM addresses WHERE account_id = $1`, [
      rows[0].acc_id,
    ]);
    addresses = addrRes.rows.map(mapAddress);
  }
  return { user, account, addresses };
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name?: string | null;
  role?: string;
  accountId?: string | null;
}): Promise<User> {
  const id = newId();
  const now = new Date();
  await query(
    `INSERT INTO users (id, email, password_hash, name, role, account_id, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      data.email.toLowerCase(),
      data.passwordHash,
      data.name ?? null,
      data.role ?? "BUYER",
      data.accountId ?? null,
      now,
    ]
  );
  return (await findUserById(id))!;
}
