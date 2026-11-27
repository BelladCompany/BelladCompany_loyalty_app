import db from '../src/config/db.js';

async function seedOffers() {
  try {
    console.log('Seeding sample city-exclusive offers for Hubli (50%) and Bangalore (80%)...');

    // 1. Hubli Tata Motors Offer (50%)
    const hubliRes = await db.query(
      `SELECT offer_id FROM dealership_offers WHERE title ILIKE '%Hubballi Tata Motors Festive Bonanza%' LIMIT 1`
    );

    if (hubliRes.rows.length === 0) {
      await db.query(
        `INSERT INTO dealership_offers (
          brand_name, model_name, category, branch_name, city, target_cities, discount_percent, is_statewide,
          title, benefit, description, highlights, valid_month, valid_till, badge, badge_color,
          image_url, whatsapp_number, is_active, priority
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20
        )`,
        [
          'Tata Motors',
          'Nexon & Punch',
          'suv',
          'All Branches',
          'Hubli',
          ['Hubli'],
          50.00,
          false,
          'Hubballi Tata Motors Festive Bonanza - 50% Off & Benefits',
          '50% Off Roadside Assistance & ₹75,000 Exchange Bonus',
          'Exclusive regional scheme for Hubli-Dharwad customers. Get 50% off select genuine accessories and roadside assistance packages when upgrading to any Tata SUV.',
          JSON.stringify([
            '50% Discount on 3-Year RSA Package',
            'Exchange bonus up to ₹75,000',
            '5,000 Bellad Loyalty Points on Booking',
            'Instant delivery from Hubballi showroom'
          ]),
          'November 2026',
          'Valid till 30 Nov 2026',
          'HUBLI 50% SPECIAL',
          'bg-amber-100 text-amber-900 border-amber-300 font-bold',
          'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
          '919035354159',
          true,
          10
        ]
      );
      console.log('Inserted Hubli 50% Tata offer.');
    } else {
      console.log('Hubli Tata offer already exists.');
    }

    // 2. Bangalore Tata Motors Offer (80%)
    const bangaloreRes = await db.query(
      `SELECT offer_id FROM dealership_offers WHERE title ILIKE '%Bangalore Tata Motors Mega Tech Festival%' LIMIT 1`
    );

    if (bangaloreRes.rows.length === 0) {
      await db.query(
        `INSERT INTO dealership_offers (
          brand_name, model_name, category, branch_name, city, target_cities, discount_percent, is_statewide,
          title, benefit, description, highlights, valid_month, valid_till, badge, badge_color,
          image_url, whatsapp_number, is_active, priority
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20
        )`,
        [
          'Tata Motors',
          'Curvv EV & Harrier',
          'ev',
          'Tata Motors Sarjapur Bangalore',
          'Bangalore',
          ['Bangalore'],
          80.00,
          false,
          'Bangalore Tata Motors Mega Tech Festival - Up to 80% Off & EV Benefits',
          'Up to 80% Off Wallbox Charger & ₹1,20,000 Benefits',
          'Bangalore metro special for IT corridor drivers at Sarjapur & Bommasandra showrooms. Avail 80% off Home Fast Charger installation plus complete zero road-tax benefits.',
          JSON.stringify([
            '80% Subsidy on 7.2 kW Home Fast Charger',
            'Zero Road Tax in Karnataka for EVs',
            'Free 2-Year Extended Warranty',
            '10,000 Bellad Reward Points credited'
          ]),
          'November 2026',
          'Valid till 30 Nov 2026',
          'BANGALORE 80% SPECIAL',
          'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
          'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
          '919035354159',
          true,
          10
        ]
      );
      console.log('Inserted Bangalore 80% Tata offer.');
    } else {
      console.log('Bangalore Tata offer already exists.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding location offers:', err);
    process.exit(1);
  }
}

seedOffers();
