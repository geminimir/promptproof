const express = require('express');
const OpenAI = require('openai');
const { withPromptProof } = require('../../packages/sdk-wrappers/node-openai');

// Initialize OpenAI with PromptProof wrapper
const openai = withPromptProof(
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-test'
  }),
  {
    suite: 'support-replies',
    source: 'support-bot',
    redact: true
  }
);

const app = express();
app.use(express.json());

// Support ticket handler
app.post('/api/support', async (req, res) => {
  const { message, category } = req.body;

  try {
    const systemPrompt = `You are a helpful customer support assistant. 
    Always be polite and professional. Never share personal contact information.
    For legal or medical questions, always include a disclaimer.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Category: ${category}\n\nMessage: ${message}` }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const reply = response.choices[0].message.content;

    res.json({
      status: 'success',
      reply: reply,
      category: category,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process support request'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Support bot running on port ${PORT}`);
});
