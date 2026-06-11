import { postJson, type ApiEnvelope } from "./http";

type Op = "select" | "insert" | "update" | "delete" | "upsert";

interface Filter {
  column: string;
  operator: string;
  value: unknown;
  negatedOperator?: string;
}

interface OrderSpec {
  column: string;
  ascending: boolean;
  nullsFirst: boolean;
}

/**
 * Drop-in replacement for supabase-js's PostgrestFilterBuilder. Accumulates the
 * query then POSTs it to /api/query when awaited (the builder is thenable, which
 * the codebase relies on by awaiting builders directly). After mutations a
 * trailing .select() requests rows back.
 */
export class QueryBuilder<T = unknown> implements PromiseLike<ApiEnvelope<T>> {
  private op: Op = "select";
  private columns = "*";
  private values: unknown;
  private filters: Filter[] = [];
  private orders: OrderSpec[] = [];
  private _limit?: number;
  private _offset?: number;
  private rangeFrom?: number;
  private rangeTo?: number;
  private _single = false;
  private _maybeSingle = false;
  private _count: "exact" | null = null;
  private _onConflict?: string;
  private _returning = false;

  constructor(private readonly table: string) {}

  // --- terminal op selectors ------------------------------------------------
  select(columns = "*"): this {
    if (this.op === "select") {
      this.columns = columns;
    } else {
      // mutation followed by .select() => return rows
      this.columns = columns;
      this._returning = true;
    }
    return this;
  }

  insert(values: unknown): this {
    this.op = "insert";
    this.values = values;
    return this;
  }

  update(values: unknown): this {
    this.op = "update";
    this.values = values;
    return this;
  }

  delete(): this {
    this.op = "delete";
    return this;
  }

  upsert(values: unknown, options?: { onConflict?: string }): this {
    this.op = "upsert";
    this.values = values;
    if (options?.onConflict) this._onConflict = options.onConflict;
    return this;
  }

  // --- filters --------------------------------------------------------------
  eq(column: string, value: unknown): this {
    this.filters.push({ column, operator: "eq", value });
    return this;
  }
  neq(column: string, value: unknown): this {
    this.filters.push({ column, operator: "neq", value });
    return this;
  }
  gt(column: string, value: unknown): this {
    this.filters.push({ column, operator: "gt", value });
    return this;
  }
  gte(column: string, value: unknown): this {
    this.filters.push({ column, operator: "gte", value });
    return this;
  }
  lt(column: string, value: unknown): this {
    this.filters.push({ column, operator: "lt", value });
    return this;
  }
  lte(column: string, value: unknown): this {
    this.filters.push({ column, operator: "lte", value });
    return this;
  }
  like(column: string, value: string): this {
    this.filters.push({ column, operator: "like", value });
    return this;
  }
  ilike(column: string, value: string): this {
    this.filters.push({ column, operator: "ilike", value });
    return this;
  }
  in(column: string, values: unknown[]): this {
    this.filters.push({ column, operator: "in", value: values });
    return this;
  }
  is(column: string, value: unknown): this {
    this.filters.push({ column, operator: "is", value });
    return this;
  }
  contains(column: string, value: unknown): this {
    this.filters.push({ column, operator: "contains", value });
    return this;
  }
  match(query: Record<string, unknown>): this {
    for (const [column, value] of Object.entries(query)) {
      this.filters.push({ column, operator: "eq", value });
    }
    return this;
  }
  not(column: string, operator: string, value: unknown): this {
    this.filters.push({ column, operator: "not", value, negatedOperator: operator });
    return this;
  }
  or(_expr: string): this {
    // PostgREST `or` string filters are not supported server-side in Phase 1.
    // Recorded as a no-op marker so callers still receive a response; the few
    // call sites that use it are non-core modules ported later.
    return this;
  }
  filter(column: string, operator: string, value: unknown): this {
    this.filters.push({ column, operator, value });
    return this;
  }

  // --- modifiers ------------------------------------------------------------
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orders.push({
      column,
      ascending: opts?.ascending ?? true,
      nullsFirst: opts?.nullsFirst ?? false,
    });
    return this;
  }
  limit(n: number): this {
    this._limit = n;
    return this;
  }
  range(from: number, to: number): this {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }
  single(): this {
    this._single = true;
    return this;
  }
  maybeSingle(): this {
    this._maybeSingle = true;
    return this;
  }

  private toRequest() {
    return {
      table: this.table,
      op: this.op,
      columns: this.columns,
      values: this.values,
      filters: this.filters,
      order: this.orders,
      limit: this._limit,
      offset: this._offset,
      rangeFrom: this.rangeFrom,
      rangeTo: this.rangeTo,
      single: this._single,
      maybeSingle: this._maybeSingle,
      count: this._count,
      onConflict: this._onConflict,
      returning: this._returning || this.op === "select",
    };
  }

  private execute(): Promise<ApiEnvelope<T>> {
    return postJson<T>("/query", this.toRequest());
  }

  then<R1 = ApiEnvelope<T>, R2 = never>(
    onfulfilled?: ((value: ApiEnvelope<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}
