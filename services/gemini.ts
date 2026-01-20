
import { GoogleGenAI, Type } from "@google/genai";

// Get API key from environment variable (set in vite.config.ts from .env.local)
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';

// Initialize AI client only if API key is available
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateHealthAdvice(prompt: string) {
  if (!ai) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env.local file.');
  }
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: `You are Koncite AI, a world-class construction management assistant. 
      You provide expert advice on construction projects, document management, labour management, daily progress reports, and site operations. 
      Keep answers concise, practical, and professional. 
      Focus on helping construction teams manage their projects more efficiently.`
    }
  });
  return response.text;
}

export async function generateWorkoutPlan(goals: string) {
  if (!ai) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env.local file.');
  }
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a detailed workout plan for: ${goals}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          workoutName: { type: Type.STRING },
          duration: { type: Type.INTEGER },
          intensity: { type: Type.STRING },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                sets: { type: Type.INTEGER },
                reps: { type: Type.STRING },
                rest: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text);
}
