/**
 * Test Script for FastAPI Integration
 * 
 * This script tests the FastAPI client to ensure it can communicate with the backend.
 * Run with: npm run test-integration
 */

import { getFastApiClient } from './src/services/fastApiClient';
import dotenv from 'dotenv';

dotenv.config();

async function testFastApiIntegration() {
  console.log('🧪 Testing FastAPI Integration...\n');

  const client = getFastApiClient();

  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  try {
    const isHealthy = await client.healthCheck();
    if (isHealthy) {
      console.log('✅ Health check passed - FastAPI backend is healthy\n');
    } else {
      console.log('❌ Health check failed - FastAPI backend is unhealthy\n');
      return;
    }
  } catch (error) {
    console.error('❌ Health check error:', error);
    return;
  }

  // Test 2: Get API Info
  console.log('2️⃣ Testing API Info...');
  try {
    const info = await client.getApiInfo();
    if (info) {
      console.log('✅ API Info retrieved successfully:');
      console.log('   App:', info.app);
      console.log('   Version:', info.version);
      console.log('   Status:', info.status);
      console.log('   Endpoints:', JSON.stringify(info.endpoints, null, 2));
      console.log('');
    } else {
      console.log('❌ Failed to get API info\n');
    }
  } catch (error) {
    console.error('❌ API info error:', error);
  }

  // Test 3: Check Configuration
  console.log('3️⃣ Checking Configuration...');
  console.log('   FASTAPI_BASE_URL:', process.env.FASTAPI_BASE_URL || 'Not set (using default)');
  console.log('   FASTAPI_API_KEY:', process.env.FASTAPI_API_KEY ? '***' + process.env.FASTAPI_API_KEY.slice(-8) : 'Not set (using default)');
  console.log('');

  console.log('✅ All tests completed!\n');
  console.log('📝 Next steps:');
  console.log('   1. Start the backend: npm run dev');
  console.log('   2. Test audio-to-image: POST /api/convert/audio-to-image');
  console.log('   3. Test image-to-audio: POST /api/convert/image-to-audio');
}

testFastApiIntegration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
