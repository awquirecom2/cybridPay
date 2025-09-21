// Test script to check Cybrid OAuth token scopes
import { CybridService } from './server/cybrid-service.js';

console.log('Testing Cybrid OAuth token...');

try {
  // Try to create a manual KYC verification for the HeyHey merchant
  const customerGuid = 'f9c537ae0a72c7c27c9eda823a67c1f7';
  console.log(`Testing manual KYC creation for customer: ${customerGuid}`);
  
  const verification = await CybridService.createManualKycVerification(customerGuid);
  console.log('✅ Manual KYC verification created successfully:', verification);
  
} catch (error) {
  console.error('❌ Failed to create manual KYC verification:', error.message);
  
  // If it's a scope error, let's test just getting the access token
  if (error.message.includes('Invalid scopes')) {
    console.log('\n🔍 Testing OAuth token generation...');
    try {
      const token = await CybridService.getAccessToken();
      console.log('✅ OAuth token generated successfully');
      console.log('Token length:', token.length);
    } catch (tokenError) {
      console.error('❌ Failed to generate OAuth token:', tokenError.message);
    }
  }
}