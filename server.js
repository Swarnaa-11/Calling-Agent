const express = require('express');
const twilio = require('twilio');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// YOUR TWILIO CREDENTIALS
const TWILIO_ACCOUNT_SID = 'AC8bb657b1826ad3af3f93e9a881f07554';
const TWILIO_AUTH_TOKEN = '0d7d109df385b1ab77b24beb974f1822';
const TWILIO_PHONE_NUMBER = '+17855725693';

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Store call records
let callHistory = [];
let totalCalls = 0;
let leadsCount = 0;

// Make a real phone call
app.post('/make-call', async (req, res) => {
    const { name, phone, purpose, language } = req.body;
    
    console.log(`\n📞 Calling ${name} at ${phone}`);
    
    try {
        // IMPORTANT: You need a public URL. Use a free service like:
        // Option A: Upload this file to Render.com (free)
        // Option B: Use Vercel (free)
        // Option C: For now, let's test with your computer's IP
        
        // Get your local IP address
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        let localIp = 'localhost';
        
        for (const interface of Object.values(networkInterfaces)) {
            for (const config of interface) {
                if (!config.internal && config.family === 'IPv4') {
                    localIp = config.address;
                    break;
                }
            }
        }
        
        const voiceUrl = `http://${localIp}:3000/voice-response?name=${encodeURIComponent(name)}&purpose=${encodeURIComponent(purpose)}&lang=${language || 'hi-in'}`;
        
        console.log(`📞 Voice URL: ${voiceUrl}`);
        
        const call = await client.calls.create({
            url: voiceUrl,
            to: phone,
            from: TWILIO_PHONE_NUMBER,
            statusCallback: '/call-status',
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
        
        res.json({ 
            success: true, 
            message: `✅ Call initiated to ${name}`,
            callSid: call.sid
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.json({ 
            success: false, 
            error: error.message + ' - You need a public URL. Try using a free hosting service like Render.com' 
        });
    }
});

// Voice response
app.get('/voice-response', (req, res) => {
    const { name, purpose, lang } = req.query;
    const goldRate = 70100;
    
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

app.post('/handle-response', (req, res) => {
    const digit = req.body.Digits;
    const name = req.query.name;
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (digit === '1') {
        leadsCount++;
        saveStats();
        twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 
            `Bahut badhiya ${name} ji! Main aapka appointment book kar deta hoon. Dhanyawad!`);
    } else {
        twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 
            `Koi baat nahi ${name} ji. Shukriya!`);
    }
    
    res.set('Content-Type', 'text/xml');
    res.send(twiml.toString());
});

app.post('/call-status', (req, res) => {
    console.log(`📞 Call status: ${req.body.CallStatus}`);
    res.sendStatus(200);
});

app.get('/stats', (req, res) => {
    res.json({
        totalCalls: totalCalls,
        leadsCount: leadsCount,
        conversionRate: totalCalls > 0 ? ((leadsCount / totalCalls) * 100).toFixed(1) : 0,
        recentCalls: callHistory.slice(0, 10)
    });
});

function saveStats() {
    const fs = require('fs');
    fs.writeFileSync('stats.json', JSON.stringify({ totalCalls, leadsCount, callHistory }, null, 2));
}

function loadStats() {
    const fs = require('fs');
    if (fs.existsSync('stats.json')) {
        const stats = JSON.parse(fs.readFileSync('stats.json'));
        totalCalls = stats.totalCalls || 0;
        leadsCount = stats.leadsCount || 0;
        callHistory = stats.callHistory || [];
    }
}

const PORT = 3000;
loadStats();
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('✅ SERVER RUNNING!');
    console.log('========================================');
    console.log(`🌐 Dashboard: http://localhost:3000`);
    console.log('========================================\n');
    console.log('⚠️  IMPORTANT: This will NOT work for calls yet!');
    console.log('You need a PUBLIC URL. Use one of these FREE services:\n');
    console.log('1. Render.com (free) - Upload this folder');
    console.log('2. Vercel (free) - Deploy with one click');
    console.log('3. Cyclic.sh (free) - Easy Node.js hosting');
    console.log('\nOr use a different solution - tell me which you prefer!\n');
});