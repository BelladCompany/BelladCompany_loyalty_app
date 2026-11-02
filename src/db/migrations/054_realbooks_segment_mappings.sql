-- 054_realbooks_segment_mappings.sql
-- RealBooks Multi-Firm, Multi-Brand, and Multi-Model Segment ID Mapping Table
-- Based on official RealBooks segment configuration for Bellad and Company

CREATE TABLE IF NOT EXISTS realbooks_segments (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) DEFAULT 'bellad_and_company',
  cid VARCHAR(50) NOT NULL DEFAULT '6460',
  segid VARCHAR(50) NOT NULL,
  company_name VARCHAR(255) DEFAULT 'Bellad and Company_Demo',
  firm_name VARCHAR(255) DEFAULT 'Bellad and Company',
  brand VARCHAR(100),
  sname VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Karnataka',
  gstin VARCHAR(50),
  branch_ledger VARCHAR(255),
  is_txn_allowed BOOLEAN DEFAULT TRUE,
  is_sub_segment_allowed BOOLEAN DEFAULT FALSE,
  category_type VARCHAR(50) DEFAULT 'all', -- 'sale' (SR), 'service' (WS), or 'all'
  model_keywords TEXT[],                   -- keywords matching vehicle models e.g. ['creta', 'verna']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rb_segments_brand ON realbooks_segments(brand);
CREATE INDEX IF NOT EXISTS idx_rb_segments_city ON realbooks_segments(city);
CREATE INDEX IF NOT EXISTS idx_rb_segments_segid ON realbooks_segments(segid);
CREATE INDEX IF NOT EXISTS idx_rb_segments_cid ON realbooks_segments(cid);

-- Insert RealBooks Segment Configuration from Bellad & Company RealBooks Excel Sheet
INSERT INTO realbooks_segments (
  cid, segid, company_name, firm_name, brand, sname, name, city, state, gstin, branch_ledger, is_txn_allowed, is_sub_segment_allowed, category_type, model_keywords
) VALUES
-- Company Root
('6460', '6460', 'Bellad and Company_Demo', 'Bellad and Company', 'All', 'BAC_D', 'Bellad and Company_Demo', 'HUBBALLI', 'Karnataka', NULL, NULL, FALSE, FALSE, 'all', ARRAY['*']),

-- HERO Segments
('6460', '6461', 'Bellad and Company_Demo', 'Bellad and Company', 'Hero', 'HERO_D', 'Hero_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['hero', 'hf deluxe', 'splendor', 'passion', 'glamour', 'pleasure', 'xpulse', 'destini', 'maestro', 'xtreme', 'xoom', 'vida', 'deluxe']),
('6460', '6471', 'Bellad and Company_Demo', 'Bellad and Company', 'Hero', 'HD_D', 'Hero Dharwad_Demo', 'Dharwad', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['hero', 'hf deluxe', 'splendor', 'passion', 'glamour']),
('6460', '6473', 'Bellad and Company_Demo', 'Bellad and Company', 'Hero', 'HDSR_D', 'Hero Dharwad SR_Demo', 'Dharwad', 'Karnataka', '29AABFB6457D1ZJ', 'Hero Dharwad SR Branch', TRUE, FALSE, 'sale', ARRAY['hero', 'hf deluxe', 'splendor', 'passion', 'glamour', 'pleasure', 'xpulse', 'destini', 'maestro', 'xtreme', 'xoom', 'vida']),
('6460', '6474', 'Bellad and Company_Demo', 'Bellad and Company', 'Hero', 'HDWS_D', 'Hero Dharwad WS_Demo', 'Dharwad', 'Karnataka', '29AABFB6457D1ZJ', 'Hero Dharwad WS Branch', TRUE, FALSE, 'service', ARRAY['hero', 'hf deluxe', 'splendor', 'passion', 'glamour', 'pleasure', 'xpulse', 'destini', 'maestro', 'xtreme', 'xoom', 'vida']),
('6460', '6472', 'Bellad and Company_Demo', 'Bellad and Company', 'Hero', 'HH_D', 'Hero Hubli_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['hero', 'hf deluxe', 'splendor', 'passion', 'glamour']),
('6460', '6475', 'Bellad and Company_Demo', 'Bellad and Company', 'Hero', 'HHSR_D', 'Hero Hubli SR_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Hero Hubli SR Branch', TRUE, FALSE, 'sale', ARRAY['hero', 'hf deluxe', 'splendor', 'passion', 'glamour', 'pleasure', 'xpulse', 'destini', 'maestro', 'xtreme', 'xoom', 'vida']),
('6460', '6476', 'Bellad and Company_Demo', 'Bellad and Company', 'Hero', 'HHWS_D', 'Hero Hubli WS_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Hero Hubli WS Branch', TRUE, FALSE, 'service', ARRAY['hero', 'hf deluxe', 'splendor', 'passion', 'glamour', 'pleasure', 'xpulse', 'destini', 'maestro', 'xtreme', 'xoom', 'vida']),

-- HYUNDAI Segments
('6460', '6462', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HYD_D', 'Hyundai_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar', 'tucson', 'exter', 'kona', 'santro']),
('6460', '6480', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HYDD_D', 'Hyundai Dharwad_Demo', 'Dharwad', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar']),
('6460', '6487', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'DRSR_D', 'Hyundai Dharwad SR_Demo', 'Dharwad', 'Karnataka', '29AABFB6457D1ZJ', 'Hyundai Dharwad SR Branch', TRUE, FALSE, 'sale', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar', 'tucson', 'exter', 'kona', 'santro']),
('6460', '6488', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'DRWS_D', 'Hyundai Dharwad WS_Demo', 'Dharwad', 'Karnataka', '29AABFB6457D1ZJ', 'Hyundai Dharwad WS Branch', TRUE, FALSE, 'service', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar', 'tucson', 'exter', 'kona', 'santro']),
('6460', '6479', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HYDG_D', 'Hyundai Gadag_Demo', 'Gadag', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar']),
('6460', '6485', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HGSR_D', 'Hyundai Gadag SR_Demo', 'Gadag', 'Karnataka', '29AABFB6457D1ZJ', 'Hyundai Gadag SR Branch', TRUE, FALSE, 'sale', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar', 'tucson', 'exter', 'kona', 'santro']),
('6460', '6486', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HGWS_D', 'Hyundai Gadag WS_Demo', 'Gadag', 'Karnataka', '29AABFB6457D1ZJ', 'Hyundai Gadag WS Branch', TRUE, FALSE, 'service', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar', 'tucson', 'exter', 'kona', 'santro']),
('6460', '6478', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HYHV_D', 'Hyundai Haveri_Demo', 'Haveri', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar']),
('6460', '6483', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HVSR_D', 'Hyundai Haveri SR_Demo', 'Haveri', 'Karnataka', '29AABFB6457D1ZJ', 'Hyundai Haveri SR Branch', TRUE, FALSE, 'sale', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar', 'tucson', 'exter', 'kona', 'santro']),
('6460', '6484', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HVWS_D', 'Hyundai Haveri WS_Demo', 'Haveri', 'Karnataka', '29AABFB6457D1ZJ', 'Hyundai Haveri WS Branch', TRUE, FALSE, 'service', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar', 'tucson', 'exter', 'kona', 'santro']),
('6460', '6477', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HYHB_D', 'Hyundai Hubli_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar']),
('6460', '6481', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HYSR_D', 'Hyundai Hubli SR_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Hyundai Hubli SR Branch', TRUE, FALSE, 'sale', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar', 'tucson', 'exter', 'kona', 'santro']),
('6460', '6482', 'Bellad and Company_Demo', 'Bellad and Company', 'Hyundai', 'HYWS_D', 'Hyundai Hubli WS_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Hyundai Hubli WS Branch', TRUE, FALSE, 'service', ARRAY['hyundai', 'creta', 'verna', 'venue', 'i20', 'i10', 'aura', 'alcazar', 'tucson', 'exter', 'kona', 'santro']),

-- SWARAJ Segments
('6460', '6463', 'Bellad and Company_Demo', 'Bellad and Company', 'Swaraj', 'SWAR_D', 'Swaraj_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['swaraj', '744', '742', '855', '735', '724', '733', 'duravator', 'tractor']),
('6460', '6489', 'Bellad and Company_Demo', 'Bellad and Company', 'Swaraj', 'SWHB_D', 'Swaraj Hubli_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['swaraj', '744', '742', '855', '735', '724', '733']),
('6460', '6490', 'Bellad and Company_Demo', 'Bellad and Company', 'Swaraj', 'SHSR_D', 'Swaraj Hubli SR_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Swaraj Hubli SR Branch', TRUE, FALSE, 'sale', ARRAY['swaraj', '744', '742', '855', '735', '724', '733', 'duravator', 'tractor']),
('6460', '6491', 'Bellad and Company_Demo', 'Bellad and Company', 'Swaraj', 'SHWS_D', 'Swaraj Hubli WS_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Swaraj Hubli WS Branch', TRUE, FALSE, 'service', ARRAY['swaraj', '744', '742', '855', '735', '724', '733', 'duravator', 'tractor']),

-- CLAAS Segments
('6460', '6466', 'Bellad and Company_Demo', 'Bellad and Company', 'Claas', 'CLAS_D', 'Claas_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['claas']),
('6460', '6494', 'Bellad and Company_Demo', 'Bellad and Company', 'Claas', 'CH_D', 'Claas Hubli_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Claas Hubli Branch', TRUE, FALSE, 'all', ARRAY['claas']),

-- SONY Segments
('6460', '6464', 'Bellad and Company_Demo', 'Bellad and Company', 'Sony', 'SONY_D', 'Sony_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['sony']),
('6460', '6492', 'Bellad and Company_Demo', 'Bellad and Company', 'Sony', 'SH_D', 'Sony Hubli_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Sony Hubli Branch', TRUE, FALSE, 'all', ARRAY['sony']),

-- USED CARS Segments
('6460', '6468', 'Bellad and Company_Demo', 'Bellad and Company', 'Used Cars', 'UC_D', 'Used Cars_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'sale', ARRAY['used cars', 'pre-owned', 'exchange', 'second hand']),
('6460', '6496', 'Bellad and Company_Demo', 'Bellad and Company', 'Used Cars', 'UCH_D', 'Used Cars Hubli_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Used Cars Hubli Branch', TRUE, FALSE, 'sale', ARRAY['used cars', 'pre-owned', 'exchange', 'second hand']),

-- CORPORATE SALES & CUSTOMER CARE
('6460', '6470', 'Bellad and Company_Demo', 'Bellad and Company', 'Corporate Sales', 'CS_D', 'Corporate Sales_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Corporate Sales Branch', TRUE, FALSE, 'sale', ARRAY['corporate', 'fleet', 'b2b']),
('6460', '6465', 'Bellad and Company_Demo', 'Bellad and Company', 'Customer Care', 'CC_D', 'Customer Care_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'service', ARRAY['customer care', 'support', 'crm']),
('6460', '6493', 'Bellad and Company_Demo', 'Bellad and Company', 'Customer Care', 'CCH_D', 'Customer Care Hubli_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Customer Care Hubli Branch', TRUE, FALSE, 'service', ARRAY['customer care', 'support', 'crm']),

-- HEAD OFFICE & WINDMILL
('6460', '6469', 'Bellad and Company_Demo', 'Bellad and Company', 'Head Office', 'HO_D', 'Head Office_Demo', 'Hubli', 'Karnataka', '29AABFB6457D1ZJ', 'Head Office Branch', TRUE, FALSE, 'all', ARRAY['head office', 'general', 'corporate']),
('6460', '6467', 'Bellad and Company_Demo', 'Bellad and Company', 'Wind Mill', 'WM_D', 'Wind Mill_Demo', 'Chitradurga', 'Karnataka', '29AABFB6457D1ZJ', NULL, FALSE, TRUE, 'all', ARRAY['windmill', 'energy']),
('6460', '6495', 'Bellad and Company_Demo', 'Bellad and Company', 'Wind Mill', 'WMC_D', 'WindMill Chitradurga_Demo', 'Chitradurga', 'Karnataka', '29AABFB6457D1ZJ', 'WindMill Chitradurga Branch', TRUE, FALSE, 'all', ARRAY['windmill', 'chitradurga']),
('6460', '6723', 'Bellad and Company_Demo', 'Bellad and Company', 'Test', 'Test', 'Test', 'Delhi', 'Delhi', '29AABFB6457D1ZJ', NULL, TRUE, FALSE, 'all', ARRAY['test']);

-- Also add cid and segid tracking columns to realbooks_sync_log if not exists
ALTER TABLE realbooks_sync_log ADD COLUMN IF NOT EXISTS cid VARCHAR(50);
ALTER TABLE realbooks_sync_log ADD COLUMN IF NOT EXISTS segid VARCHAR(50);
ALTER TABLE realbooks_sync_log ADD COLUMN IF NOT EXISTS segment_name VARCHAR(255);

