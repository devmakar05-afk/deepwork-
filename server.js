const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/ai', async (req, res) => {
  try {
    const { base64, prompt, maxTokens } = req.body;
    if (!base64 || !prompt) return res.status(400).json({ error: 'Missing base64 or prompt' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens || 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    res.json({ text: data.content?.[0]?.text || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('DeepWork AI Backend running'));

app.listen(process.env.PORT || 3000, () => console.log('Server started'));
