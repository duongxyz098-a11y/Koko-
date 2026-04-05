import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.post("/api/generate-content", async (req, res) => {
    const { prompt, systemInstruction, apiKey, model, endpoint } = req.body;
    
    console.log("Received request for content generation. Model:", model, "Endpoint:", endpoint);
    console.log("API Key present:", !!apiKey);
    
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    
    if (!finalApiKey) {
      return res.status(400).json({ error: "API key is required." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: finalApiKey });
      const stream = await ai.models.generateContentStream({
        model: model || "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          maxOutputTokens: req.body.maxTokens || 30000,
        },
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("Error generating content:", error);
      const errorMessage = error.message || "Failed to generate content";
      res.status(500).json({ error: errorMessage });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
