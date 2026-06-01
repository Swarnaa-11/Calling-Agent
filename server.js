const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== YOUR UPDATED TWILIO CREDENTIALS ==========
const TWILIO_ACCOUNT_SID = 'AC4e0345264a61d0b30bd58abc2b21644f';
const TWILIO_AUTH_TOKEN = '9ed4352af6d291f5fd9e3fc2494bdb70';
const TWILIO_PHONE_NUMBER = '+19015896492';  // YOUR NEW NUMBER
const PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || 'https://calling-agent-jrfj.onrender.com';

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
        const voiceUrl = `${PUBLIC_URL}/voice-response?name=${encodeURIComponent(name)}&purpose=${encodeURIComponent(purpose)}&lang=${language || 'hi-in'}`;
        
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
        
        res.json({ success: true, message: `✅ Call initiated to ${name}`, callSid: call.sid });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.json({ success: false, error: error.message });
    }
});

// Voice response
app.get('/voice-response', (req, res) => {
    const { name } = req.query;
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

// Handle response
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

// Call status
app.post('/call-status', (req, res) => {
    console.log(`📞 Call status: ${req.body.CallStatus}`);
    res.sendStatus(200);
});

// Statistics
app.get('/stats', (req, res) => {
    res.json({
        totalCalls: totalCalls,
        leadsCount: leadsCount,
        conversionRate: totalCalls > 0 ? ((leadsCount / totalCalls) * 100).toFixed(1) : 0,
        recentCalls: callHistory.slice(0, 10)
    });
});

// Dashboard HTML
app.get('/', (req, res) => {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Harsahaimal Shiamlal - AI Call Center</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { color: #b8860b; text-align: center; margin-bottom: 5px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
        .status-badge {
            background: #4caf50;
            color: white;
            padding: 8px;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
        input, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 16px;
        }
        button {
            width: 100%;
            padding: 15px;
            background: #b8860b;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
        }
        button:hover:not(:disabled) { background: #9a720a; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 30px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-number { font-size: 32px; font-weight: bold; color: #b8860b; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
        .call-log {
            margin-top: 30px;
            border-top: 1px solid #eee;
            padding-top: 20px;
            max-height: 300px;
            overflow-y: auto;
        }
        .log-entry {
            background: #f8f9fa;
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 8px;
            font-size: 13px;
            border-left: 3px solid #b8860b;
        }
        .status-success { color: #2e7d32; font-weight: bold; }
        .loading { display: none; text-align: center; margin-top: 15px; color: #b8860b; }
        .info {
            background: #e3f2fd;
            padding: 12px;
            border-radius: 8px;
            margin: 15px 0;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💎 Harsahaimal Shiamlal Jewellers</h1>
        <div class="subtitle">AI Voice Caller - Live</div>
        <div class="status-badge">✅ Connected to Twilio: ${TWILIO_PHONE_NUMBER}</div>
        <div class="stats">
            <div class="stat-card"><div class="stat-number" id="totalCalls">0</div><div class="stat-label">Total Calls</div></div>
            <div class="stat-card"><div class="stat-number" id="leads">0</div><div class="stat-label">Interested</div></div>
            <div class="stat-card"><div class="stat-number" id="conversion">0%</div><div class="stat-label">Conversion</div></div>
        </div>
        <div class="form-group"><label>👤 Customer Name</label><input type="text" id="customerName" placeholder="e.g., Rajesh Sharma"></div>
        <div class="form-group"><label>📱 Phone Number (with +91)</label><input type="tel" id="phoneNumber" placeholder="+91 98765 43210"></div>
        <div class="form-group"><label>🎯 Call Purpose</label>
            <select id="purpose">
                <option value="Gold Rate Enquiry">💰 Gold Rate Enquiry</option>
                <option value="Jewellery Sales">💍 Jewellery Sales</option>
                <option value="Wedding Collection">💒 Wedding Collection</option>
            </select>
        </div>
        <div class="form-group"><label>🗣️ Language</label>
            <select id="language"><option value="hi-in">🇮🇳 Hindi</option><option value="en-in">🇬🇧 English</option></select>
        </div>
        <button onclick="makeCall()" id="callBtn">📞 Make AI Call Now</button>
        <div id="loading" class="loading">⏳ Initiating call...</div>
        <div class="info">💡 Press 1 if interested in jewellery | Using Twilio Number: ${TWILIO_PHONE_NUMBER}</div>
        <div class="call-log"><h3>📋 Recent Call Log</h3><div id="callLogs"><div class="log-entry">Ready to make calls!</div></div></div>
    </div>
    <script>
        async function loadStats() {
            try {
                const response = await fetch('/stats');
                const data = await response.json();
                document.getElementById('totalCalls').innerText = data.totalCalls;
                document.getElementById('leads').innerText = data.leadsCount;
                document.getElementById('conversion').innerText = data.conversionRate + '%';
                const logDiv = document.getElementById('callLogs');
                if (data.recentCalls && data.recentCalls.length > 0) {
                    logDiv.innerHTML = data.recentCalls.map(call => \`<div class="log-entry"><strong>\${call.name}</strong> - \${call.phone}<br>\${call.purpose}<br><small>\${call.time}</small> <span class="status-success">✓ \${call.status}</span></div>\`).join('');
                }
            } catch(e) { console.log('Loading stats...'); }
        }
        async function makeCall() {
            const name = document.getElementById('customerName').value;
            const phone = document.getElementById('phoneNumber').value;
            const purpose = document.getElementById('purpose').value;
            const language = document.getElementById('language').value;
            if (!name || !phone) { alert('Please enter name and phone number'); return; }
            const btn = document.getElementById('callBtn'); const loading = document.getElementById('loading');
            btn.disabled = true; loading.style.display = 'block';
            try {
                const response = await fetch('/make-call', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, purpose, language })
                });
                const result = await response.json();
                if (result.success) { alert(\`✅ Call initiated to \${name}! The phone will ring shortly.\`); loadStats(); }
                else { alert(\`❌ Failed: \${result.error}\`); }
            } catch(error) { alert('❌ Server error. Please try again.'); }
            finally { btn.disabled = false; loading.style.display = 'none'; }
        }
        loadStats(); setInterval(loadStats, 5000);
    </script>
</body>
</html>`;
    res.send(html);
});

// Save stats
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

const PORT = process.env.PORT || 3000;
loadStats();
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`✅ AI CALLER IS RUNNING!`);
    console.log(`========================================`);
    console.log(`📞 Twilio Number: ${TWILIO_PHONE_NUMBER}`);
    console.log(`🌐 Open your Render URL to start!`);
    console.log(`========================================\n`);
});
