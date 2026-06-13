import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { dbGet, dbRun } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { generateDueRecurringExpenses } = await import("../src/services/accounting/recurring.js");

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

beforeAll(async () => {
  await runMigrations();
  await dbRun("INSERT INTO tenants (id, name, owner_id) VALUES (?, 'T', 'o')", TENANT);
});

describe("recurring expense generator", () => {
  it("materialises a due monthly recurring expense and advances next_due_date", async () => {
    await dbRun(
      `INSERT INTO tenant_recurring_expenses
           (id, tenant_id, amount, currency, description, frequency, is_active, next_due_date)
         VALUES ('rec-1', ?, 1500, 'BDT', 'Office rent', 'monthly', true, '2024-01-01')`,
      TENANT,
    );

    const res = await generateDueRecurringExpenses(new Date("2024-02-15T00:00:00Z"));
    expect(res.generated).toBe(1);

    const exp = (await dbGet(
      "SELECT amount, description, expense_date FROM tenant_expenses WHERE tenant_id = ?",
      TENANT,
    )) as { amount: number; description: string; expense_date: string };
    expect(exp.amount).toBe(1500);
    expect(exp.description).toBe("Office rent");
    expect(exp.expense_date).toBe("2024-01-01");

    const rec = (await dbGet(
      "SELECT next_due_date, last_generated_at FROM tenant_recurring_expenses WHERE id = 'rec-1'",
    )) as { next_due_date: string; last_generated_at: string };
    expect(rec.next_due_date).toBe("2024-02-01"); // advanced one month
    expect(rec.last_generated_at).toBeTruthy();
  });

  it("does not regenerate when nothing is due", async () => {
    const res = await generateDueRecurringExpenses(new Date("2024-01-05T00:00:00Z"));
    expect(res.generated).toBe(0);
  });
});
