import { runMigrations } from "../src/db/migrate.js";
import { seedPlans, PLAN_SEEDS } from "../src/services/billing/seed-plans.js";

/**
 * Seeds the four subscription plans (idempotent upsert by id). Run with:
 *   pnpm --filter server exec tsx scripts/seed-plans.ts
 * Safe to re-run; refreshes prices/limits without duplicating rows.
 */
function main(): void {
  runMigrations();
  seedPlans();
  process.stdout.write(`Seeded ${PLAN_SEEDS.length} plans:\n`);
  for (const p of PLAN_SEEDS) {
    const price = p.price_monthly > 0 ? `BDT ${p.price_monthly}/mo` : "contact sales";
    process.stdout.write(
      `  ${p.id.padEnd(11)} ${price.padEnd(18)} ` +
        `instances=${p.max_instances} pages=${p.max_pages} agents=${p.max_agents}\n`,
    );
  }
}

main();
process.exit(0);
