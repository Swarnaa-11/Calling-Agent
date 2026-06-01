const express = require('express');
const twilio = require('twilio');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== YOUR CREDENTIALS (ALL FILLED) ==========
const TWILIO_ACCOUNT_SID = 'AC8bb657b1826ad3af3f93e9a881f07554';
const TWILIO_AUTH_TOKEN = '0d7d109df385b1ab77b24beb974f1822';
const TWILIO_PHONE_NUMBER = '+17855725693';
const PUBLIC_URL = 'https://calling-agent-jrfj.onrender.com';  // YOUR LIVE URL

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Store call records
let callHistory = [];
let totalCalls = 0;
let leadsCount = 0;

// Make a real phone call using Twilio
app.post('/make-call', async (req, res) => {
    const { name, phone, purpose, language } = req.body;
    
    console.log(`\n📞 Calling ${name} at ${phone}`);
    
    try {
        const voiceUrl = `${PUBLIC_URL}/voice-response?name=${encodeURIComponent(name)}&purpose=${encodeURIComponent(purpose)}&lang=${language || 'hi-in'}`;
        
        console.log(`📞 Voice URL: ${voiceUrl}`);
        
        const call = await client.calls.create({
            url: voiceUrl,
            to: phone,
            from: TWILIO_PHONE_NUMBER,
            statusCallback: `${PUBLIC_URL}/call-status`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
        });
        
        totalCalls++;
        callHistory.unshift({
            name: name,
            phone: phone,
            purpose: purpose,
            status: '✅ Call Initiated',
            time: new Date().toLocaleString(),
            callSid: call.sid
        });
        
        saveStats();
        
        console.log(`✅ Call initiated! SID: ${call.sid}`);
        
        res.json({ 
            success: true, 
            message: `✅ Call initiated to ${name}`,
            callSid: call.sid
        });
        
    } catch (error) {
        console.error('❌ Twilio Error:', error.message);
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Voice response when customer answers
app.get('/voice-response', (req, res) => {
    const { name, purpose, lang } = req.query;
    const goldRate = 70100;
    
    console.log(`\n📞 Customer ${name} answered!`);
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    const message = `Namaskar ${name} ji! Main Harsahaimal Shiamlal Jewellers se bol raha hoon. Aaj 22 karat sona ₹${goldRate} rupaye prati 10 gram hai. Kya aap jewellery mein interested hain? Interested hai to 1 dabayein, nahi to 2 dabayein.`;
    
    twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, message);
    
    const gather = twiml.gather({
        numDigits: 1,
        action: `/handle-response?name=${encodeURIComponent(name)}`,
        method: 'POST',
        timeout: 5
    });
    gather.say('Interested ho toh 1, nahi toh 2 dabayein');
    
    twiml.say('Dhanyawad!');
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml.toString());
});

// Handle customer response
app.post('/handle-response', (req, res) => {
    const digit = req.body.Digits;
    const name = req.query.name;
    
    console.log(`\n📞 ${name} pressed: ${digit === '1' ? 'INTERESTED ✅' : 'NOT INTERESTED ❌'}`);
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (digit === '1') {
        leadsCount++;
        saveStats();
        twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 
            `Bahut badhiya ${name} ji! Main aapka appointment book kar deta hoon. Hamari team aapse call karegi. Dhanyawad!`);
    } else {
        twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 
            `Koi baat nahi ${name} ji. Shukriya!`);
    }
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml.toString());
});

// Call status webhook
app.post('/call-status', (req, res) => {
    const { CallSid, CallStatus, CallDuration } = req.body;
    console.log(`\n📞 Call ${CallSid}: ${CallStatus}`);
    res.sendStatus(200);
});

// Get statistics
app.get('/stats', (req, res) => {
    res.json({
        totalCalls: totalCalls,
        leadsCount: leadsCount,
        conversionRate: totalCalls > 0 ? ((leadsCount / totalCalls) * 100).toFixed(1) : 0,
        recentCalls: callHistory.slice(0, 10)
    });
});

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/dashboard.html');
});

// Save stats
const fs = require('fs');
function saveStats() {
    fs.writeFileSync('stats.json', JSON.stringify({ totalCalls, leadsCount, callHistory }, null, 2));
}

function loadStats() {
    if (fs.existsSync('stats.json')) {
        const stats = JSON.parse(fs.readFileSync('stats.json'));
        totalCalls = stats.totalCalls || 0;
        leadsCount = stats.leadsCount || 0;
        callHistory = stats.callHistory || [];
    }
}

// Start server
const PORT = process.env.PORT || 3000;
loadStats();
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('✅ AI CALLER IS LIVE!');
    console.log('========================================');
    console.log(`🌐 Your URL: ${PUBLIC_URL}`);
    console.log(`📞 Twilio Number: ${TWILIO_PHONE_NUMBER}`);
    console.log('========================================\n');
});
