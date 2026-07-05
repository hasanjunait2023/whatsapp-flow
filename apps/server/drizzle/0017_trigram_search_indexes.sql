-- 0017_trigram_search_indexes.sql
-- GIN trigram indexes for leading-wildcard LIKE searches in Hermes AI tools.
-- Hermes' lookup_order uses LIKE '%<last-10-digits>%' on customer_phone,
-- and lookup_product uses LIKE '%<query>%' on products.name.
-- B-tree indexes cannot accelerate leading-wildcard patterns; GIN trigram can.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "orders_customer_phone_trgm_idx"
    ON "orders" USING gin ("customer_phone" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_name_trgm_idx"
    ON "products" USING gin ("name" gin_trgm_ops);
