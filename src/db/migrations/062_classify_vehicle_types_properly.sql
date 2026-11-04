-- Migration 062: Properly classify vehicle types for 2-wheelers, 4-wheelers, and tractors
-- Hero, Ather, Vida = 2W; Swaraj = TRACTOR; Tata, Hyundai, MG = 4W

DO $$
BEGIN
  -- 0. Update check constraint on vehicles to allow 'TRACTOR'
  ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
  ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check CHECK (vehicle_type IN ('2W', '4W', 'CV', '3W', 'TRACTOR'));

  -- 1. Hero MotoCorp -> 2W (Bikes / Scooters)
  UPDATE vehicles 
  SET vehicle_type = '2W'
  WHERE UPPER(brand_name) LIKE '%HERO%' 
     OR UPPER(model) LIKE '%SPLENDOR%' 
     OR UPPER(model) LIKE '%DESTINI%' 
     OR UPPER(model) LIKE '%HF%' 
     OR UPPER(model) LIKE '%PASSION%' 
     OR UPPER(model) LIKE '%GLAMOUR%' 
     OR UPPER(model) LIKE '%XPULSE%' 
     OR UPPER(model) LIKE '%PLEASURE%' 
     OR UPPER(model) LIKE '%MAESTRO%';

  -- 2. Ather Energy & Vida -> 2W (Electric Scooters)
  UPDATE vehicles 
  SET vehicle_type = '2W'
  WHERE UPPER(brand_name) LIKE '%ATHER%' 
     OR UPPER(brand_name) LIKE '%VIDA%' 
     OR UPPER(model) LIKE '%ATHER%' 
     OR UPPER(model) LIKE '%RIZTA%' 
     OR UPPER(model) LIKE '%450X%' 
     OR UPPER(model) LIKE '%450%' 
     OR UPPER(model) LIKE '%VIDA%';

  -- 3. Swaraj -> TRACTOR
  UPDATE vehicles 
  SET vehicle_type = 'TRACTOR'
  WHERE UPPER(brand_name) LIKE '%SWARAJ%' 
     OR UPPER(model) LIKE '%SWARAJ%' 
     OR (model IN ('742', '744', '855', '735', '724', '843', '963') AND (brand_name IS NULL OR UPPER(brand_name) LIKE '%SWARAJ%'));

  -- 4. Tata Motors, Hyundai, MG -> 4W (Cars / SUVs)
  UPDATE vehicles 
  SET vehicle_type = '4W'
  WHERE UPPER(brand_name) LIKE '%TATA%' 
     OR UPPER(brand_name) LIKE '%HYUNDAI%' 
     OR UPPER(brand_name) LIKE '%MG%' 
     OR UPPER(model) LIKE '%NEXON%' 
     OR UPPER(model) LIKE '%PUNCH%' 
     OR UPPER(model) LIKE '%HARRIER%' 
     OR UPPER(model) LIKE '%SAFARI%' 
     OR UPPER(model) LIKE '%ALTROZ%' 
     OR UPPER(model) LIKE '%TIAGO%' 
     OR UPPER(model) LIKE '%TIGOR%' 
     OR UPPER(model) LIKE '%CURVV%' 
     OR UPPER(model) LIKE '%CRETA%' 
     OR UPPER(model) LIKE '%VENUE%' 
     OR UPPER(model) LIKE '%VERNA%' 
     OR UPPER(model) LIKE '%EXTER%' 
     OR UPPER(model) LIKE '%COMET%' 
     OR UPPER(model) LIKE '%WINDSOR%';

END $$;
