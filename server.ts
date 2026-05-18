import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Initialize Firebase Admin
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore();

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

app.use(express.json());

function obfuscateLua(code: string) {
  const prefix = "-- [ PenX Obfuscator v1.0 ]\n-- This script is protected and optimized.\n";
  const comment = `-- Hash: ${Math.random().toString(36).substring(7)}\n`;
  const escaped = code.split('').map(c => `\\${c.charCodeAt(0)}`).join('');
  return `${prefix}${comment}loadstring("${escaped}")()`;
}

async function startServer() {
  // Script Retrieval Logic
  app.get("/s/:codeId", async (req, res) => {
    try {
      const codeId = req.params.codeId;
      const scriptsRef = db.collection("scripts");
      const snapshot = await scriptsRef.where("codeId", "==", codeId).limit(1).get();

      if (snapshot.empty) {
        return res.status(404).send("-- PenX Error: Script not found.");
      }

      const scriptDoc = snapshot.docs[0];
      const scriptData = scriptDoc.data();

      // Detection
      const userAgent = req.headers["user-agent"] || "";
      const isRoblox = userAgent.includes("Roblox") || req.query.mode === "raw" || userAgent.includes("curl");

      // Increment views via Admin SDK (bypasses rules)
      await scriptDoc.ref.update({
        views: FieldValue.increment(1)
      });

      if (isRoblox) {
        res.setHeader("Content-Type", "text/plain");
        res.send(scriptData.luaCode);
      } else {
        res.redirect(`/?script=${codeId}`);
      }
    } catch (error) {
      res.status(500).send("-- PenX Error: Internal Server Error");
    }
  });

  app.post("/api/obfuscate", (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "No code provided" });
    const obfuscated = obfuscateLua(code);
    res.json({ obfuscated });
  });

  app.post("/api/generate", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Roblox Lua developer. Generate high-quality, efficient, and clean Roblox Lua script based on the user's prompt. ONLY output the code, no markdown or explanations.",
        },
      });
      res.json({ code: response.text });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate script" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
