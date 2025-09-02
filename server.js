require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// JSON body parser middleware
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '')));

// Simple API endpoint for testing
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

const { VertexAI } = require('@google-cloud/vertexai');

// Initialize Vertex AI
const vertex_ai = new VertexAI({project: process.env.GCLOUD_PROJECT, location: process.env.GCLOUD_LOCATION});
const model = 'gemini-1.0-pro-001';

const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: model,
    generationConfig: {
      'maxOutputTokens': 2048,
      'temperature': 0.2,
      'topP': 1,
    },
  });

app.post('/api/ask-ai', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const request = {
            contents: [{role: 'user', parts: [{text: message}]}],
        };
        const result = await generativeModel.generateContent(request);
        const response = result.response;
        const text = response.candidates[0].content.parts[0].text;
        res.json({ message: text });
    } catch (error) {
        console.error('Error calling LLM API:', error);
        res.status(500).json({ error: 'Failed to get response from AI' });
    }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
