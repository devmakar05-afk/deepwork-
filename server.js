const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.options('*', cors());
app.use(express.json({ limit: '100mb' }));

app.get('/', (req, res) => res.send('DeepWork AI Backend running ✅'));

app.post('/ai', (req, res) => {
  try {
    const { base64, mediaType, prompt, maxTokens } = req.body;
    if (!base64 || !prompt) return res.status(400).json({ error: 'Missing base64 or prompt' });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

    // Determine content type — PDF or image
    const type = mediaType || 'application/pdf';
    const isImage = type.startsWith('image/');

    const contentBlock = isImage
      ? { type: 'image', source: { type: 'base64', media_type: type, data: base64 } }
      : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };

    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens || 2000,
      messages: [{
        role: 'user',
        content: [ contentBlock, { type: 'text', text: prompt } ]
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

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return res.status(500).json({ error: parsed.error.message });
          res.json({ text: parsed.content?.[0]?.text || '' });
        } catch(e) { res.status(500).json({ error: 'Parse error: ' + e.message }); }
      });
    });

    apiReq.on('error', e => res.status(500).json({ error: e.message }));
    apiReq.write(body);
    apiReq.end();
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
