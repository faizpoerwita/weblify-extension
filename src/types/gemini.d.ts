declare module "@google/generative-ai" {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(config: { model: string }): GenerativeModel;
  }

  export class GenerativeModel {
    generateContent(
      prompt: string | Array<string | { inlineData: { data: string; mimeType: string } }>
    ): Promise<GenerationResponse>;
    startChat(config?: { generationConfig?: GenerationConfig }): ChatSession;
  }

  export interface GenerationConfig {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
  }

  export interface GenerationResponse {
    response: {
      text(): string;
      generationInfo?: {
        finishReason?: string;
        promptFeedback?: {
          safetyRatings: Array<{
            category: string;
            probability: string;
          }>;
        };
      };
    };
  }

  export interface ChatSession {
    sendMessage(message: string): Promise<GenerationResponse>;
    getHistory(): Array<{
      role: "user" | "model";
      parts: string[];
    }>;
  }
} 