/**
 * API Testing Script for Motivational Quotes Application
 * 
 * This script tests the main API endpoints of the application
 * to verify they are working correctly.
 */

const axios = require('axios');
const colors = require('colors/safe');

// Base URL for API requests
const BASE_URL = 'http://localhost:5001';

// Add delay between requests to avoid rate limiting
const DELAY_MS = 1000;

/**
 * Helper function to add delay between requests
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test results tracking
let passedTests = 0;
let failedTests = 0;

/**
 * Run a test and log the result
 */
async function runTest(name, testFn) {
  try {
    console.log(colors.cyan(`\nRunning test: ${name}...`));
    await testFn();
    console.log(colors.green(`✓ PASSED: ${name}`));
    passedTests++;
  } catch (error) {
    console.log(colors.red(`✗ FAILED: ${name}`));
    console.log(colors.red(`  Error: ${error.message}`));
    if (error.response) {
      console.log(colors.yellow(`  Status: ${error.response.status}`));
      console.log(colors.yellow(`  Data: ${JSON.stringify(error.response.data, null, 2)}`));
    }
    failedTests++;
  }
}

/**
 * Test getting a random quote
 */
async function testGetRandomQuote() {
  const response = await axios.get(`${BASE_URL}/api/quotes/random`);
  
  if (!response.data || !response.data.quote) {
    throw new Error('No quote returned');
  }
  
  if (!response.data.quote.text || !response.data.quote.author) {
    throw new Error('Quote missing required fields');
  }
  
  console.log(colors.gray(`  Retrieved quote: "${response.data.quote.text}" - ${response.data.quote.author}`));
}

/**
 * Test getting all quotes
 */
async function testGetAllQuotes() {
  const response = await axios.get(`${BASE_URL}/api/quotes`);
  
  if (!response.data || !response.data.quotes || !Array.isArray(response.data.quotes)) {
    throw new Error('No quotes array returned');
  }
  
  console.log(colors.gray(`  Retrieved ${response.data.quotes.length} quotes`));
  
  if (response.data.quotes.length === 0) {
    throw new Error('No quotes found');
  }
}

/**
 * Test getting quotes by tag
 */
async function testGetQuotesByTag() {
  // First get all quotes to find a tag
  const allQuotesResponse = await axios.get(`${BASE_URL}/api/quotes`);
  
  if (!allQuotesResponse.data.quotes || allQuotesResponse.data.quotes.length === 0) {
    throw new Error('No quotes available to test tags');
  }
  
  // Find a quote with tags
  const quoteWithTags = allQuotesResponse.data.quotes.find(q => q.tags && q.tags.length > 0);
  
  if (!quoteWithTags) {
    throw new Error('No quotes with tags found');
  }
  
  const tag = quoteWithTags.tags[0];
  console.log(colors.gray(`  Testing with tag: ${tag}`));
  
  const response = await axios.get(`${BASE_URL}/api/quotes/tag/${tag}`);
  
  if (!response.data || !response.data.quotes || !Array.isArray(response.data.quotes)) {
    throw new Error('No quotes array returned for tag');
  }
  
  console.log(colors.gray(`  Retrieved ${response.data.quotes.length} quotes with tag "${tag}"`));
  
  if (response.data.quotes.length === 0) {
    throw new Error(`No quotes found with tag "${tag}"`);
  }
}

/**
 * Test getting a specific quote by ID
 */
async function testGetQuoteById() {
  // First get all quotes to get an ID
  const allQuotesResponse = await axios.get(`${BASE_URL}/api/quotes`);
  
  if (!allQuotesResponse.data.quotes || allQuotesResponse.data.quotes.length === 0) {
    throw new Error('No quotes available to test getting by ID');
  }
  
  const quoteId = allQuotesResponse.data.quotes[0]._id;
  console.log(colors.gray(`  Testing with quote ID: ${quoteId}`));
  
  const response = await axios.get(`${BASE_URL}/api/quotes/${quoteId}`);
  
  if (!response.data || !response.data.quote) {
    throw new Error('No quote returned');
  }
  
  console.log(colors.gray(`  Retrieved quote: "${response.data.quote.text}" - ${response.data.quote.author}`));
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  const response = await axios.get(`${BASE_URL}/health`);
  
  if (!response.data || response.data.status !== 'ok') {
    throw new Error('Health check failed');
  }
  
  console.log(colors.gray(`  Health status: ${response.data.status}`));
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(colors.yellow('=== MOTIVATIONAL QUOTES API TESTS ==='));
  console.log(colors.gray(`Testing API at ${BASE_URL}`));
  console.log(colors.gray(`Adding ${DELAY_MS}ms delay between requests to avoid rate limiting`));
  
  await runTest('Health Check', testHealthCheck);
  await delay(DELAY_MS);
  
  await runTest('Get Random Quote', testGetRandomQuote);
  await delay(DELAY_MS);
  
  await runTest('Get All Quotes', testGetAllQuotes);
  await delay(DELAY_MS);
  
  await runTest('Get Quote By ID', testGetQuoteById);
  await delay(DELAY_MS);
  
  await runTest('Get Quotes By Tag', testGetQuotesByTag);
  
  // Print summary
  console.log(colors.yellow('\n=== TEST SUMMARY ==='));
  console.log(colors.green(`Passed: ${passedTests}`));
  console.log(colors.red(`Failed: ${failedTests}`));
  console.log(colors.yellow(`Total: ${passedTests + failedTests}`));
  
  if (failedTests === 0) {
    console.log(colors.green('\n✓ All tests passed!'));
  } else {
    console.log(colors.red(`\n✗ ${failedTests} test(s) failed!`));
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error(colors.red('Error running tests:'), error);
  process.exit(1);
});