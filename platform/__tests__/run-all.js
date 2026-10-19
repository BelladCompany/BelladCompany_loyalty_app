require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log('🚀 ENTERPRISE TEST SUITE: WHITE-LABEL LOYALTY PLATFORM & STUDIO');
console.log('================================================================\n');

const testSuites = [
  { name: 'Pure Rules Engine & Conflict Resolution', file: 'platform/engine/__tests__/engine.test.js' },
  { name: 'Financial-Grade Double-Entry Ledger', file: 'platform/ledger/__tests__/ledger.test.js' },
  { name: 'Platform REST APIs & Real-Time Publish', file: 'platform/api/__tests__/api.test.js' },
];

let allPassed = true;

for (const suite of testSuites) {
  console.log(`\n▶️  Executing Suite: ${suite.name}`);
  const result = spawnSync('node', [suite.file], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../../'),
  });

  if (result.status !== 0) {
    allPassed = false;
    console.error(`❌ Suite Failed: ${suite.name} (Exit code: ${result.status})`);
  } else {
    console.log(`✨ Suite Completed: ${suite.name}`);
  }
}

console.log('\n================================================================');
if (allPassed) {
  console.log('🎉 ALL ENTERPRISE TEST SUITES PASSED CLEANLY (100% SUCCESS)');
  console.log('================================================================\n');
  process.exit(0);
} else {
  console.error('💥 ONE OR MORE TEST SUITES FAILED');
  console.log('================================================================\n');
  process.exit(1);
}
