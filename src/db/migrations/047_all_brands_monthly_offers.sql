-- ============================================================================
-- Migration 047: Add Monthly Offers for All Dealership Brands & Branches
-- (Tata, MG, Hero, Vida, Ather, Hyundai, Maruti Suzuki, Swaraj, Workshop)
-- ============================================================================

INSERT INTO dealership_offers (
  tenant_id, brand_name, model_name, category, branch_name, city,
  title, benefit, description, highlights, code, valid_month, valid_till,
  badge, badge_color, image_url, whatsapp_number, whatsapp_msg, is_active, priority
)
VALUES
-- Hyundai
(
  'bellad_and_company',
  'Hyundai',
  'Creta & Creta N Line',
  'suv',
  'HYUNDAI HUBLI',
  'Hubli, Dharwad, Gadag, Haveri',
  'Hyundai Creta Mega Festive Bonanza',
  'Up to ₹85,000 Total Benefits + 3-Year Complimentary Maintenance',
  'India’s favourite SUV with Level 2 ADAS, voice-enabled panoramic sunroof, and lowest EMI schemes across Hyundai Hubli, Dharwad and Gadag showrooms.',
  '["Level 2 SmartSense ADAS", "Voice-Enabled Panoramic Sunroof", "Dual-Zone Climate Control", "₹35,000 Exchange Bonus"]'::jsonb,
  'BELLAD-CRETA-NOV',
  'November 2026',
  'Valid till 30 Nov 2026',
  'TOP SELLING SUV',
  'bg-blue-600 text-white font-bold',
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
  '918197348730',
  'Hi Bellad Hyundai, I want to inquire about the Creta November offer.',
  true,
  7
),
(
  'bellad_and_company',
  'Hyundai',
  'Venue & Exter Sub-Compact SUV',
  'suv',
  'HYUNDAI DHARWAD',
  'Dharwad, Gadag, Hubli',
  'Hyundai Venue & Exter Smart City Festive Offer',
  'Benefits Up to ₹50,000 + ₹20,000 Exchange Bonus',
  'Dashcam with dual camera on Exter, smart electric sunroof on Venue, and instant 100% on-road financing with zero processing fee.',
  '["Standard 6 Airbags Across All Variants", "Dual-Camera Dashcam", "Connected Car BlueLink Tech", "Zero Processing Fee Financing"]'::jsonb,
  'BELLAD-VENUE-NOV',
  'November 2026',
  'Valid till 30 Nov 2026',
  'COMPACT SUV VALUE',
  'bg-emerald-600 text-white font-bold',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  '918197348730',
  'Hi Bellad Hyundai, please share quotation for Venue and Exter.',
  true,
  6
),

-- Maruti Suzuki
(
  'bellad_and_company',
  'Maruti Suzuki',
  'Swift, Baleno & Brezza',
  'new_vehicle',
  'All Branches',
  'Hubli, Belgaum, Dharwad, Bangalore',
  'Maruti Suzuki All-New Swift & Baleno Dhmaka',
  'Up to ₹60,000 Savings + Free 5-Year Extended Warranty',
  'Z-Series ultra high mileage engine (25+ kmpl), 6 airbags standard, and exchange bonus on your existing car with same-day delivery.',
  '["25.75 kmpl Best-in-Class Mileage", "Standard 6 Airbags", "9-inch SmartPlay Pro+ Audio", "₹25,000 Exchange Bonus"]'::jsonb,
  'BELLAD-MARUTI-NOV',
  'November 2026',
  'Valid till 30 Nov 2026',
  'FESTIVE MILEAGE KING',
  'bg-amber-500 text-slate-950 font-black',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
  '918197348730',
  'Hi Bellad Maruti Suzuki, I am interested in Swift / Baleno November deals.',
  true,
  5
),

-- Vida Electric
(
  'bellad_and_company',
  'Vida',
  'Vida V1 Pro & Plus (Powered by Hero)',
  'bike_scooter',
  'Vida Hubli',
  'Hubli, Dharwad',
  'Hero Vida V1 Pro Removable Battery Electric Scooter',
  'Flat ₹28,000 Benefit + Free Fast Charging at Bellad Points',
  'Removable dual batteries with portable home charger. Includes ₹10,000 cash discount, 5-year battery warranty, and ₹5,000 Bellad loyalty rewards.',
  '["Removable Dual Li-Ion Batteries", "165 km IDC True Range", "Custom Riding Modes with Cruise Control", "5-Year Battery Warranty"]'::jsonb,
  'BELLAD-VIDA-NOV',
  'November 2026',
  'Valid till 30 Nov 2026',
  'REMOVABLE BATTERY EV',
  'bg-orange-500 text-slate-950 font-black',
  'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
  '918197348730',
  'Hi Bellad Vida, I want to book a test drive for Vida V1 Pro.',
  true,
  6
),

-- Swaraj Tractors
(
  'bellad_and_company',
  'Swaraj',
  'Swaraj 744 XT, 855 FE & Target Compact',
  'new_vehicle',
  'SWARAJ HUBLI',
  'Hubli, Belgaum, Haveri, Byadgi, Gadag',
  'Swaraj Krishi Utsav Special Farmer Scheme',
  '₹45,000 Exchange Bonus + Free Rotavator Implement Subsidy Support',
  'Power and reliability trusted by Karnataka farmers for decades. Lowest interest agricultural loan approval in 24 hours with minimum paperwork.',
  '["High Torque Fuel-Efficient Engine", "Multi-Speed Reverse PTO", "Power Steering & Oil Immersed Brakes", "24-Hour Loan Sanction"]'::jsonb,
  'BELLAD-SWARAJ-NOV',
  'November 2026',
  'Valid till 30 Nov 2026',
  'FARMER UTILITY SPECIAL',
  'bg-emerald-700 text-white font-bold',
  'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
  '918197348730',
  'Hi Bellad Swaraj, I would like to inquire about Swaraj tractor farmer finance and offers.',
  true,
  4
)
ON CONFLICT (offer_id) DO NOTHING;

