const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/ai', (req, res) => {
  const { base64, prompt, maxTokens } = req.body;
  if (!base64 || !prompt) return res.status(400).json({ error: 'Missing base64 or prompt' });

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens || 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: prompt }
      ]
    }]
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) return res.status(500).json({ error: parsed.error.message });
        res.json({ text: parsed.content?.[0]?.text || '' });
      } catch(e) {
        res.status(500).json({ error: 'Parse error' });
      }
    });
  });

  request.on('error', (e) => res.status(500).json({ error: e.message }));
  request.write(body);
  request.end();
});

app.get('/', (req, res) => res.send('DeepWork AI Backend running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
