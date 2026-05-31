import { query } from "../pool";
import { newId } from "../id";

export async function createAuditLog(data: {
  actorId?: string | null;
  entity: string;
  entityId: string;
  action: string;
  payload?: string | null;
}) {
  await query(
    `INSERT INTO audit_logs (id, actor_id, entity, entity_id, action, payload)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      newId(),
      data.actorId ?? null,
      data.entity,
      data.entityId,
      data.action,
      data.payload ?? null,
    ]
  );
}
