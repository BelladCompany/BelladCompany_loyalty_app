-- 080_customer_spare_parts_link_v2.sql
-- Links every itemized spare part and labour line item directly to the customer and vehicle

ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS customer_id VARCHAR(32);
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(32);
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS vehicle_id INTEGER;
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_cust ON invoice_line_items (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_phone ON invoice_line_items (tenant_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_veh_id ON invoice_line_items (tenant_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_inv_no ON invoice_line_items (tenant_id, invoice_number);
