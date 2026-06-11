/**
 * Shared API contract types between apps/server and apps/web.
 * These describe the wire format of the generic query endpoint and the
 * supabase-shaped response envelope the shim relies on.
 */

export type QueryOp = "select" | "insert" | "update" | "delete" | "upsert";

export type FilterOperator =
  | "eq"
  | "neq"
  | "in"
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "like"
  | "ilike"
  | "is"
  | "not"
  | "contains"
  | "match";

export interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: unknown;
  /** for `not`, the negated operator, e.g. not('col','is',null) */
  negatedOperator?: FilterOperator;
}

export interface QueryOrder {
  column: string;
  ascending: boolean;
  nullsFirst: boolean;
}

export interface QueryRequest {
  table: string;
  op: QueryOp;
  /** select column list, or "*" */
  columns?: string;
  /** rows for insert/update/upsert */
  values?: unknown;
  filters?: QueryFilter[];
  order?: QueryOrder[];
  limit?: number;
  offset?: number;
  /** range(from,to) inclusive */
  rangeFrom?: number;
  rangeTo?: number;
  single?: boolean;
  maybeSingle?: boolean;
  /** request an exact count alongside data */
  count?: "exact" | null;
  /** count-only request (supabase .select(col,{head:true}) ) — no rows returned */
  head?: boolean;
  /** upsert conflict target columns */
  onConflict?: string;
  /** whether the builder requested rows back (.select() after a mutation) */
  returning?: boolean;
}

/** Supabase-js-shaped response envelope. */
export interface QueryResponse<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

/** Coarse realtime change event broadcast over SSE. */
export interface RealtimeChangeEvent {
  table: string;
  tenant_id: string | null;
  /** key fields hooks may filter on (e.g. contact_id, instance_id) */
  payload: Record<string, unknown>;
}
