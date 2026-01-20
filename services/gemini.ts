
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateHealthAdvice(prompt: string) {
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
