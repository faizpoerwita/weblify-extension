import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
} from "@google/generative-ai";

interface GenerationResponse {
  response: {
    text: () => string;
  };
}

export class GeminiAPI {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt) as GenerationResponse;
      return result.response.text();
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  }

  async generateContentWithImage(prompt: string, imageData: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro-vision" });
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: imageData, mimeType: "image/jpeg" } },
      ]) as GenerationResponse;
      return result.response.text();
    } catch (error) {
      console.error("Error generating content with image:", error);
      throw error;
    }
  }

  async chat(config?: Partial<GenerationConfig>) {
    const chat = this.model.startChat({
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        ...config,
      },
    });
    return chat;
  }
} 