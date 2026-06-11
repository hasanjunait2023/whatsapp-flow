import { sqlite } from "../../db/index.js";
import type { LlmTool } from "../../llm/types.js";

/**
 * Hermes tool belt. Every executor takes tenantId from the server-side context
 * — NEVER from model output — so a prompt-injected tool call cannot cross
 * tenants. The only "write" is handoff_to_human, applied by the pipeline.
 */

export const HERMES_TOOLS: LlmTool[] = [
  {
    name: "lookup_order",
    description:
      "Look up a customer's order by order number, or list recent orders for a phone number.",
    parameters: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "Exact order number" },
        phone: { type: "string", description: "Customer phone number" },
      },
    },
  },
  {
    name: "lookup_product",
    description: "Search the product catalog by name or keyword.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Product name or keyword" },
      },
      required: ["query"],
    },
  },
  {
    name: "check_stock",
    description: "Check current stock for a product by its id.",
    parameters: {
      type: "object",
      properties: {
        product_id: { type: "string" },
      },
      required: ["product_id"],
    },
  },
  {
    name: "handoff_to_human",
    description:
      "Escalate this conversation to a human team member. Use when the customer is upset, asks for a human, or you cannot help.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Short reason for the handoff" },
      },
      required: ["reason"],
    },
  },
];

export interface ToolOutcome {
  result: string;
  /** Set when handoff_to_human was called; the pipeline applies it. */
  handoffReason?: string;
}

const ORDER_LIMIT = 5;
const PRODUCT_LIMIT = 5;

export function executeHermesTool(
  tenantId: string,
  name: string,
  args: Record<string, unknown>,
): ToolOutcome {
  switch (name) {
    case "lookup_order": {
      const orderNumber = typeof args.order_number === "string" ? args.order_number : null;
      const phone = typeof args.phone === "string" ? args.phone : null;
      if (!orderNumber && !phone) {
        return { result: JSON.stringify({ error: "Provide order_number or phone" }) };
      }
      const rows = orderNumber
        ? sqlite
            .prepare(
              `SELECT order_number, status, payment_status, total, currency, courier, tracking_number, created_at
               FROM orders WHERE tenant_id = ? AND order_number = ? LIMIT 1`,
            )
            .all(tenantId, orderNumber)
        : sqlite
            .prepare(
              `SELECT order_number, status, payment_status, total, currency, courier, tracking_number, created_at
               FROM orders WHERE tenant_id = ? AND customer_phone LIKE ?
               ORDER BY created_at DESC LIMIT ${ORDER_LIMIT}`,
            )
            .all(tenantId, `%${phone!.replace(/\D/g, "").slice(-10)}%`);
      return { result: JSON.stringify({ orders: rows }) };
    }

    case "lookup_product": {
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query) return { result: JSON.stringify({ error: "query is required" }) };
      const rows = sqlite
        .prepare(
          `SELECT id, name, description, price, stock_quantity, is_active
           FROM products WHERE tenant_id = ? AND is_active = 1 AND name LIKE ?
           LIMIT ${PRODUCT_LIMIT}`,
        )
        .all(tenantId, `%${query}%`);
      return { result: JSON.stringify({ products: rows }) };
    }

    case "check_stock": {
      const productId = typeof args.product_id === "string" ? args.product_id : "";
      const row = sqlite
        .prepare(
          `SELECT id, name, stock_quantity, track_inventory FROM products
           WHERE tenant_id = ? AND id = ? LIMIT 1`,
        )
        .get(tenantId, productId);
      return { result: JSON.stringify(row ?? { error: "Product not found" }) };
    }

    case "handoff_to_human": {
      const reason = typeof args.reason === "string" ? args.reason : "Customer needs assistance";
      return {
        result: JSON.stringify({ status: "handing_off" }),
        handoffReason: reason,
      };
    }

    default:
      return { result: JSON.stringify({ error: `Unknown tool "${name}"` }) };
  }
}
