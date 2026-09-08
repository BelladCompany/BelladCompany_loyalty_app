const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const env = require('../config/env');

async function seed() {
  console.log('🌱 Seeding initial database records...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantId = env.defaultTenantId;

    // 1. Seed Brands
    let brandRow = (await client.query(
      `SELECT brand_id AS id, brand_name AS name FROM brands WHERE tenant_id = $1 AND brand_name = $2;`,
      [tenantId, 'Maruti Suzuki']
    )).rows[0];
    if (!brandRow) {
      brandRow = (await client.query(
        `INSERT INTO brands (brand_name, tenant_id)
         VALUES ($1, $2)
         RETURNING brand_id AS id, brand_name AS name;`,
        ['Maruti Suzuki', tenantId]
      )).rows[0];
    }
    const brandId = brandRow ? brandRow.id : null;
    console.log(`- Seeded brand: ${brandRow ? brandRow.name : 'Maruti Suzuki'} (ID: ${brandId})`);

    // 2. Seed Branches
    let branchRow = (await client.query(
      `SELECT branch_id AS id, branch_name AS name FROM branches WHERE tenant_id = $1 AND branch_name = $2;`,
      [tenantId, 'Central Showroom - Bangalore']
    )).rows[0];
    if (!branchRow) {
      branchRow = (await client.query(
        `INSERT INTO branches (branch_name, branch_city, tenant_id)
         VALUES ($1, $2, $3)
         RETURNING branch_id AS id, branch_name AS name;`,
        ['Central Showroom - Bangalore', 'Bangalore', tenantId]
      )).rows[0];
    }
    const branchId = branchRow ? branchRow.id : null;
    console.log(`- Seeded branch: ${branchRow ? branchRow.name : 'Central Showroom'} (ID: ${branchId})`);

    // 3. Seed Users (admin and cashier)
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const cashierPasswordHash = await bcrypt.hash('Cashier@123', 10);

    const adminUserRes = await client.query(
      `INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id
       RETURNING user_id, username;`,
      ['admin', adminPasswordHash, 'admin', branchId, tenantId]
    );
    const adminUserId = adminUserRes.rows[0].user_id;
    console.log('- Seeded user: admin (role: admin, password: Admin@123)');

    await client.query(
      `INSERT INTO users (username, password_hash, role, branch_id, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id;`,
      ['cashier', cashierPasswordHash, 'cashier', branchId, tenantId]
    );
    console.log('- Seeded user: cashier (role: cashier, password: Cashier@123)');

    // 4. Seed Referral Approvers
    const existingApprover = (await client.query(
      `SELECT approver_id AS id, name FROM referral_approvers WHERE tenant_id = $1 AND name = $2;`,
      [tenantId, 'Admin Approver']
    )).rows[0];
    let approverId = existingApprover ? existingApprover.id : null;
    if (!existingApprover) {
      const appRes = await client.query(
        `INSERT INTO referral_approvers (tenant_id, name, active)
         VALUES ($1, $2, $3)
         RETURNING approver_id AS id, name;`,
        [tenantId, 'Admin Approver', true]
      );
      approverId = appRes.rows[0].id;
    }
    console.log(`- Seeded referral approver: Admin Approver (ID: ${approverId})`);

    // 5. Seed Tier Rules
    const tiers = [
      { name: 'Silver', minPoints: 0 },
      { name: 'Gold', minPoints: 5000 },
      { name: 'Platinum', minPoints: 15000 },
    ];

    for (const tier of tiers) {
      const existingTier = (await client.query(
        `SELECT tier_rule_id FROM tier_rules WHERE tenant_id = $1 AND tier_name = $2;`,
        [tenantId, tier.name]
      )).rows[0];
      if (!existingTier) {
        await client.query(
          `INSERT INTO tier_rules (tenant_id, tier_name, min_lifetime_points)
           VALUES ($1, $2, $3);`,
          [tenantId, tier.name, tier.minPoints]
        );
      }
    }
    console.log('- Seeded default tier rules (Silver, Gold, Platinum)');

    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
