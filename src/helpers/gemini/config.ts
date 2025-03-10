import { GoogleGenerativeAI } from "@google/generative-ai";
import { useAppState } from "../../state/store";
import { SupportedModels } from "../aiSdkUtils";

export const getGeminiConfig = () => {
  const { geminiKey } = useAppState.getState().settings;
  if (!geminiKey) {
    throw new Error("Gemini API key not found");
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  return {
    textModel: genAI.getGenerativeModel({ 
      model: SupportedModels.Gemini20Flash,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    }),
    visionModel: genAI.getGenerativeModel({ 
      model: SupportedModels.Gemini20Flash,
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 4096,
      }
    }),
  };
};

export const GEMINI_CONFIG = {
  maxOutputTokens: 2048,
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
}; 