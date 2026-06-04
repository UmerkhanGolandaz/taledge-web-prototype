const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student123', role: 'Software Engineer', mode: 'technical', resumeSummary: 'A good dev' })
    });
    const data = await res.json();
    console.log("Start Response:", data);
    
    if (data.sessionId) {
      const voiceRes = await fetch('http://localhost:3001/api/interview/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: data.sessionId, text: 'I am proficient in React and Node.js' })
      });
      const voiceData = await voiceRes.json();
      console.log("Voice Response:", voiceData);
    }
  } catch(e) {
    console.error(e);
  }
}

test();
