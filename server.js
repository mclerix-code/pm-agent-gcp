require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Gemini Client
// This will automatically pick up Application Default Credentials (ADC) in Google Cloud Run
let ai;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("Initialized Gemini Client with API Key");
  } else {
    // Fallback or ADC usage via Vertex
    ai = new GoogleGenAI({
      // If deploying to Vertex AI, un-comment strings below to configure
      /* vertexai: { 
           project: process.env.GCP_PROJECT_ID, 
           location: process.env.GCP_REGION || 'us-central1'
         }
      */
    });
    console.log("Initialized Gemini Client with Application Default Credentials");
  }
} catch (e) {
  console.error("Failed to initialize Gemini client:", e);
}


app.post('/api/chat', async (req, res) => {
  try {
    const { systemInstruction, contents } = req.body;

    if (!ai) {
      return res.status(500).json({ error: "Gemini client not initialized properly on the server." });
    }

    // Format contents for the new SDK
    // Request body contains Google API formatted conversation history like:
    // [{ role: 'user', parts: [{ text: '...' }] }]

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction.parts.text
      }
    });

    // Map it back to the format the frontend currently expects
    if (response.text) {
      res.json({
        candidates: [{
          content: {
            parts: [{
              text: response.text
            }]
          }
        }]
      });
    } else {
      throw new Error("No response text");
    }

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Create public directory if handling static files
// This assumes frontend files are moved into /public

app.listen(port, () => {
  console.log(`PM Agent Server listening on port ${port}`);
});
