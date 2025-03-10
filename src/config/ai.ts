export const AI_CONFIG = {
  // ... existing config
  gemini: {
    models: {
      default: "gemini-2.0-flash",
      lite: "gemini-2.0-flash-lite",
      pro: "gemini-2.0-pro",
      pro15: "gemini-1.5-pro"
    },
    maxOutputTokens: {
      default: 2048,
      vision: 4096
    },
    defaultConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      candidateCount: 1,
    },
    visionConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 0.8,
      candidateCount: 1,
    },
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
  }
}; 