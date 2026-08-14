-- FR-1: the financial ledger is append-only. Enforce it at the database layer
-- so no code path (or manual psql session) can silently UPDATE or DELETE a
-- Transaction row. Corrections must be recorded as new (offsetting) entries.

CREATE OR REPLACE FUNCTION ledger_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'The ledger is append-only: Transaction rows cannot be updated or deleted (table %, op %). Record an offsetting transaction instead.', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transaction_append_only ON "Transaction";
CREATE TRIGGER transaction_append_only
  BEFORE UPDATE OR DELETE ON "Transaction"
  FOR EACH ROW
  EXECUTE FUNCTION ledger_append_only();
