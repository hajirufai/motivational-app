/**
 * Run Postman Collection Tests using Newman
 * 
 * This script runs the Postman collection tests using Newman,
 * which is Postman's command-line collection runner.
 */

const newman = require('newman');
const path = require('path');
const colors = require('colors/safe');

// Path to the Postman collection and environment
const collectionPath = path.join(__dirname, '../../postman/motivational-quotes-api.json');
const environmentPath = path.join(__dirname, '../../postman/environment.json');

console.log(colors.yellow('=== RUNNING POSTMAN COLLECTION TESTS ==='));
console.log(colors.gray(`Collection: ${collectionPath}`));
console.log(colors.gray(`Environment: ${environmentPath}`));

// Run the collection
newman.run({
  collection: require(collectionPath),
  environment: require(environmentPath),
  reporters: ['cli'],
  reporter: {
    cli: {
      noSummary: false,
      noAssertions: false
    }
  },
  insecure: true, // Allow insecure connections for testing
  timeout: 30000  // 30 second timeout
}, function (err, summary) {
  if (err) {
    console.error(colors.red('Error running Postman collection:'), err);
    process.exit(1);
  }
  
  // Log results
  const failedTests = summary.run.failures.length;
  const totalTests = summary.run.stats.assertions.total;
  const passedTests = totalTests - failedTests;
  
  console.log(colors.yellow('\n=== TEST SUMMARY ==='));
  console.log(colors.green(`Passed: ${passedTests}`));
  console.log(colors.red(`Failed: ${failedTests}`));
  console.log(colors.yellow(`Total: ${totalTests}`));
  
  if (failedTests === 0) {
    console.log(colors.green('\n✓ All tests passed!'));
    process.exit(0);
  } else {
    console.log(colors.red(`\n✗ ${failedTests} test(s) failed!`));
    process.exit(1);
  }
});