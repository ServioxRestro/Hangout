// Run all integration tests
const { testDineInOrderPlacement } = require('./test-dine-in-order');
const { testTakeawayOrderPlacement } = require('./test-takeaway-order');
const { testReactQueryHooks } = require('./test-react-query');

async function runAllTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(10) + 'HANGOUT - INTEGRATION TESTS' + ' '.repeat(20) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Dine-in Order Placement
  results.total++;
  try {
    const passed = await testDineInOrderPlacement();
    if (passed) {
      results.passed++;
      results.tests.push({ name: 'Dine-in Order Placement', status: 'PASSED' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Dine-in Order Placement', status: 'FAILED' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Dine-in Order Placement', status: 'ERROR', error: error.message });
  }

  // Test 2: Takeaway Order Placement
  results.total++;
  try {
    const passed = await testTakeawayOrderPlacement();
    if (passed) {
      results.passed++;
      results.tests.push({ name: 'Takeaway Order Placement', status: 'PASSED' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Takeaway Order Placement', status: 'FAILED' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Takeaway Order Placement', status: 'ERROR', error: error.message });
  }

  // Test 3: React Query Hooks
  results.total++;
  try {
    const passed = await testReactQueryHooks();
    if (passed) {
      results.passed++;
      results.tests.push({ name: 'React Query Hooks', status: 'PASSED' });
    } else {
      results.failed++;
      results.tests.push({ name: 'React Query Hooks', status: 'FAILED' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'React Query Hooks', status: 'ERROR', error: error.message });
  }

  // Print Summary
  console.log('\n\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(20) + 'TEST SUMMARY' + ' '.repeat(26) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log('');

  results.tests.forEach((test, index) => {
    const icon = test.status === 'PASSED' ? '✅' : '❌';
    const statusColor = test.status === 'PASSED' ? test.status : test.status;
    console.log(`${index + 1}. ${icon} ${test.name} - ${statusColor}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });

  console.log('');
  console.log('─'.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('─'.repeat(60));

  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED ⚠️\n');
  }

  return results.failed === 0;
}

// Run all tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
