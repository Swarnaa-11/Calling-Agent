const axios = require('axios');

const EXOTEL_SID = 'harsahaimalshiamlaljewellers1';
const EXOTEL_API_KEY = 'c866495305b4895a40240243d4272f3ff261f352d7e25f36';
const EXOTEL_API_TOKEN = '0830ed00691e1f307950ec15e60896a7960a5b085c8b3e27';

async function testExotel() {
    console.log('🔍 Testing Exotel API connection...');
    
    try {
        const auth = Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString('base64');
        
        // Try to get account details (this tests if credentials work)
        const response = await axios.get(
            `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            }
        );
        
        console.log('✅ SUCCESS! Your Exotel credentials are correct!');
        console.log('Account:', response.data);
        
    } catch (error) {
        console.log('❌ FAILED! Credentials not working');
        console.log('Error:', error.response?.status, error.response?.data);
        console.log('\nPossible issues:');
        console.log('1. API Key or Token is wrong');
        console.log('2. Account SID is wrong');
        console.log('3. Account needs to be activated');
        console.log('4. Region might be different (try api.in.exotel.com)');
    }
}

testExotel();