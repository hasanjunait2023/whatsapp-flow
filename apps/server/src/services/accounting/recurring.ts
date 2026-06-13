import { dbAll, dbTx } from "../../db/raw.js";

/**
 * Generates expense entries from due recurring expenses. Runs on a daily
 * scheduler tick: for every active recurring rule whose next_due_date has
 * arrived, it inserts a concrete tenant_expenses row and advances the schedule.
 */

interface RecurringRow {
  id: string;
  tenant_id: string;
  amount: number;
  category_id: string | null;
  currency: string | null;
  description: string;
  frequency: string;
  day_of_month: number | null;
  payment_method: string | null;
  next_due_date: string | null;
}

function advance(from: string, frequency: string): string {
  const d = new Date(from + (from.length === 10 ? "T00:00:00Z" : ""));
  switch (frequency) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
    case "monthly":
    default:
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

export async function generateDueRecurringExpenses(
  now: Date = new Date(),
): Promise<{ generated: number }> {
  const today = now.toISOString().slice(0, 10);
  const due = await dbAll<RecurringRow>(
    `SELECT id, tenant_id, amount, category_id, currency, description, frequency,
              day_of_month, payment_method, next_due_date
         FROM tenant_recurring_expenses
        WHERE is_active = true AND next_due_date IS NOT NULL AND next_due_date <= ?`,
    today,
  );

  let generated = 0;
  for (const r of due) {
    await dbTx(async (tx) => {
      await tx.run(
        `INSERT INTO tenant_expenses
       (id, tenant_id, amount, category_id, currency, description, expense_date, payment_method, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Auto-generated from recurring expense')`,
        crypto.randomUUID(),
        r.tenant_id,
        r.amount,
        r.category_id,
        r.currency ?? "BDT",
        r.description,
        r.next_due_date,
        r.payment_method,
      );
      const next = advance(r.next_due_date as string, r.frequency);
      await tx.run(
        "UPDATE tenant_recurring_expenses SET next_due_date = ?, last_generated_at = ? WHERE id = ?",
        next,
        now.toISOString(),
        r.id,
      );
    });
    generated += 1;
  }
  return { generated };
}
