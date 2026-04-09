/**
 * Test script to check Laravel API endpoints
 * Run with: node scripts/test-api-endpoints.js
 */

const axios = require('axios');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging.koncite.com/api';

const endpointsToTest = [
  '/register',
  '/auth/register',
  '/user/register',
  '/signup',
  '/auth/signup',
];

const testData = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '1234567890',
  password: 'password123',
  password_confirmation: 'password123',
  company_name: 'Test Company',
  country: 'United States',
};

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🔍 Testing: ${API_BASE_URL}${endpoint}`);
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, testData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status
    });
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return { success: true, endpoint, status: response.status };
    } else if (response.status === 422) {
      console.log(`⚠️  Endpoint exists but validation failed (expected)`);
      console.log(`   Status: ${response.status}`);
      console.log(`   This means the endpoint exists! Use: ${endpoint}`);
      return { success: true, endpoint, status: response.status, validationError: true };
    } else if (response.status === 404) {
      console.log(`❌ Not Found (404)`);
      return { success: false, endpoint, status: 404 };
    } else {
      console.log(`⚠️  Status: ${response.status}`);
      return { success: false, endpoint, status: response.status };
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 404) {
        console.log(`❌ Not Found (404)`);
      } else {
        console.log(`❌ Error: ${error.response.status} - ${error.response.statusText}`);
      }
      return { success: false, endpoint, status: error.response.status };
    } else if (error.request) {
      console.log(`❌ Network Error: Could not reach server`);
      console.log(`   Make sure Laravel is running on ${API_BASE_URL.replace('/api', '')}`);
      return { success: false, endpoint, error: 'Network Error' };
    } else {
      console.log(`❌ Error: ${error.message}`);
      return { success: false, endpoint, error: error.message };
    }
  }
}

async function main() {
  console.log('🚀 Testing Laravel API Endpoints\n');
  console.log(`Base URL: ${API_BASE_URL}\n`);
  console.log('Testing common registration endpoints...\n');
  
  const results = [];
  
  for (const endpoint of endpointsToTest) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const successfulEndpoints = results.filter(r => r.success);
  
  if (successfulEndpoints.length > 0) {
    console.log('\n✅ Found working endpoint(s):');
    successfulEndpoints.forEach(r => {
      console.log(`   → ${r.endpoint} (Status: ${r.status})`);
      if (r.validationError) {
        console.log(`     ⚠️  Validation error is expected - endpoint exists!`);
      }
    });
    console.log('\n💡 Add this to your .env.local:');
    const bestEndpoint = successfulEndpoints[0].endpoint;
    console.log(`   NEXT_PUBLIC_SIGNUP_ENDPOINT=${bestEndpoint}`);
  } else {
    console.log('\n❌ No working endpoints found.');
    console.log('\n💡 Next steps:');
    console.log('   1. Check if Laravel server is running:');
    console.log(`      php artisan serve (should run on ${API_BASE_URL.replace('/api', '')})`);
    console.log('   2. Check your Laravel routes:');
    console.log('      php artisan route:list --path=api');
    console.log('   3. Create the endpoint if it doesn\'t exist (see API_SETUP_INSTRUCTIONS.md)');
  }
  
  console.log('\n');
}

main().catch(console.error);
