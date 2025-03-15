import { getGeminiConfig, GEMINI_CONFIG } from "../helpers/gemini/config";
import { GoogleGenerativeAI, GenerationConfig, GenerativeModel } from "@google/generative-ai";
import { useAppState } from "../state/store";
import { AI_CONFIG } from "../config/ai";

// Konstanta untuk retry
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 detik

interface GeminiResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// Fungsi helper untuk eksponensial backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi untuk menangani retry dengan eksponensial backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Jika status 503 atau network error dan masih dalam batas retry
    if ((error.status === 503 || error.message?.includes('network')) && retryCount < MAX_RETRIES) {
      const delay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`API Gemini error: ${error.message}. Mencoba ulang (${retryCount + 1}/${MAX_RETRIES}) setelah ${delay}ms`);
      await sleep(delay);
      return withRetry(operation, retryCount + 1);
    }
    throw error;
  }
}

export async function generateTextWithGemini(
  prompt: string,
  systemMessage?: string,
  modelOverride?: string
): Promise<GeminiResponse> {
  // Ambil konfigurasi model dan pastikan kita memiliki string model
  const config = getGeminiConfig();
  // Default ke model tertentu jika textModel bukan string (untuk mengatasi tipe GenerativeModel)
  const defaultModelName = AI_CONFIG.gemini.models.default;
  // Gunakan model yang ditentukan, atau default
  const modelName: string = modelOverride || defaultModelName;
  
  const generationConfig: GenerationConfig = {
    temperature: AI_CONFIG.gemini.defaultConfig.temperature,
    topK: AI_CONFIG.gemini.defaultConfig.topK,
    topP: AI_CONFIG.gemini.defaultConfig.topP,
    maxOutputTokens: AI_CONFIG.gemini.maxOutputTokens.default,
  };

  async function attemptGeneration(model: string) {
    const { geminiKey } = useAppState.getState().settings;
    if (!geminiKey) {
      throw new Error("Gemini API key not found");
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const modelInstance = genAI.getGenerativeModel({ 
      model: model,
    });

    const chat = modelInstance.startChat({
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

  try {
    // Gunakan withRetry untuk mencoba dengan model utama
    return await withRetry(() => attemptGeneration(modelName));
  } catch (error: any) {
    // Jika model utama gagal dengan error 503, coba model fallback
    if (error.status === 503) {
      console.log("Model utama tidak tersedia, menggunakan model fallback");
      // Pilih model fallback (jika menggunakan pro, coba flash, jika flash, coba flash-lite)
      const fallbackModel = modelName === AI_CONFIG.gemini.models.pro 
        ? AI_CONFIG.gemini.models.default 
        : AI_CONFIG.gemini.models.lite;
      
      return await withRetry(() => attemptGeneration(fallbackModel));
    }
    throw error;
  }
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

  const generationConfig: GenerationConfig = {
    temperature: AI_CONFIG.gemini.visionConfig.temperature,
    topK: AI_CONFIG.gemini.visionConfig.topK,
    topP: AI_CONFIG.gemini.visionConfig.topP,
    maxOutputTokens: AI_CONFIG.gemini.maxOutputTokens.vision,
  };

  const processedImageData = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
  let fullPrompt = prompt;
  if (systemMessage) {
    fullPrompt = `${systemMessage}\n\n${prompt}`;
  }

  async function attemptVisionGeneration(modelName: string) {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: modelName,
    });

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
        totalTokens: 0, // Gemini doesn't provide token count
      },
    };
  }

  try {
    // Gunakan model pro untuk vision
    const visionModel = "gemini-2.0-pro";
    return await withRetry(() => attemptVisionGeneration(visionModel));
  } catch (error: any) {
    // Fallback ke model lain jika perlu
    if (error.status === 503) {
      console.log("Model pro tidak tersedia, mencoba model fallback untuk vision");
      const fallbackVisionModel = "gemini-2.0-flash";
      return await withRetry(() => attemptVisionGeneration(fallbackVisionModel));
    }
    throw error;
  }
} 