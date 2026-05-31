import { query } from "../pool";
import { mapAccount, mapUser } from "../mappers";
import { newId } from "../id";

export async function createAccount(data: {
  companyName: string;
  taxId?: string | null;
  status?: string;
  paymentTerms?: string;
}) {
  const id = newId();
  const now = new Date();
  await query(
    `INSERT INTO accounts (id, company_name, tax_id, status, payment_terms, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      id,
      data.companyName,
      data.taxId ?? null,
      data.status ?? "PENDING",
      data.paymentTerms ?? "CARD_ONLY",
      now,
    ]
  );
  const { rows } = await query(`SELECT * FROM accounts WHERE id = $1`, [id]);
  return mapAccount(rows[0]);
}

export async function listPendingAccounts() {
  const { rows } = await query(
    `SELECT a.* FROM accounts a WHERE a.status = 'PENDING' ORDER BY a.created_at DESC`
  );
  const accounts = rows.map(mapAccount);
  const result = [];
  for (const acc of accounts) {
    const usersRes = await query(`SELECT * FROM users WHERE account_id = $1`, [acc.id]);
    result.push({
      ...acc,
      users: usersRes.rows.map(mapUser),
    });
  }
  return result;
}

export async function listAllAccounts() {
  const { rows } = await query(`SELECT * FROM accounts ORDER BY created_at DESC`);
  const accounts = rows.map(mapAccount);
  const result = [];
  for (const acc of accounts) {
    const usersRes = await query(`SELECT * FROM users WHERE account_id = $1`, [acc.id]);
    result.push({
      ...acc,
      users: usersRes.rows.map(mapUser),
    });
  }
  return result;
}

export async function updateAccount(
  id: string,
  data: {
    status?: string;
    paymentTerms?: string;
    approvedAt?: Date | null;
    approvedById?: string | null;
  }
) {
  const sets = ["updated_at = $2"];
  const params: unknown[] = [id, new Date()];
  if (data.status != null) {
    params.push(data.status);
    sets.push(`status = $${params.length}`);
  }
  if (data.paymentTerms != null) {
    params.push(data.paymentTerms);
    sets.push(`payment_terms = $${params.length}`);
  }
  if (data.approvedAt !== undefined) {
    params.push(data.approvedAt);
    sets.push(`approved_at = $${params.length}`);
  }
  if (data.approvedById !== undefined) {
    params.push(data.approvedById);
    sets.push(`approved_by = $${params.length}`);
  }
  await query(`UPDATE accounts SET ${sets.join(", ")} WHERE id = $1`, params);
  const { rows } = await query(`SELECT * FROM accounts WHERE id = $1`, [id]);
  const acc = mapAccount(rows[0]);
  const usersRes = await query(`SELECT * FROM users WHERE account_id = $1`, [id]);
  return { ...acc, users: usersRes.rows.map(mapUser) };
}

export async function countPendingAccounts() {
  const { rows } = await query(
    `SELECT COUNT(*)::text AS count FROM accounts WHERE status = 'PENDING'`
  );
  return Number(rows[0].count);
}
