import { getGeminiConfig, GEMINI_CONFIG } from "../helpers/gemini/config";
import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";
import { useAppState } from "../state/store";
import { AI_CONFIG } from "../config/ai";

interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export async function generateTextWithGemini(
  prompt: string,
  systemMessage?: string,
  modelOverride?: string
): Promise<GeminiResponse> {
  const { textModel } = getGeminiConfig();
  const model = modelOverride ? textModel : getGeminiConfig().textModel;
  
  const generationConfig: GenerationConfig = {
    temperature: AI_CONFIG.gemini.defaultConfig.temperature,
    topK: AI_CONFIG.gemini.defaultConfig.topK,
    topP: AI_CONFIG.gemini.defaultConfig.topP,
    maxOutputTokens: AI_CONFIG.gemini.maxOutputTokens.default,
  };

  const chat = model.startChat({
    generationConfig,
  });

  if (systemMessage) {
    await chat.sendMessage(systemMessage);
  }

  const result = await chat.sendMessage(prompt);
  const response = await result.response;
  
  return {
    text: response.text(),
    usage: {
      totalTokens: 0, // Gemini currently doesn't provide token count
    },
  };
}

export async function generateVisionResponse(
  prompt: string,
  imageData: string,
  systemMessage?: string
): Promise<GeminiResponse> {
  const { geminiKey } = useAppState.getState().settings;
  if (!geminiKey) {
    throw new Error("Gemini API key not found");
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  const generationConfig: GenerationConfig = {
    temperature: AI_CONFIG.gemini.visionConfig.temperature,
    topK: AI_CONFIG.gemini.visionConfig.topK,
    topP: AI_CONFIG.gemini.visionConfig.topP,
    maxOutputTokens: AI_CONFIG.gemini.maxOutputTokens.vision,
  };

  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-pro",
  });

  const processedImageData = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

  let fullPrompt = prompt;
  if (systemMessage) {
    fullPrompt = `${systemMessage}\n\n${prompt}`;
  }

  const result = await model.generateContent([
    fullPrompt,
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: processedImageData
      }
    }
  ]);
  
  const response = await result.response;
  
  return {
    text: response.text(),
    usage: {
      totalTokens: 0, // Gemini currently doesn't provide token count
    },
  };
} 