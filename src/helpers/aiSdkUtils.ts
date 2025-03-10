import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI, type Part, GenerationConfig } from "@google/generative-ai";
import OpenAI from "openai";
import { useAppState } from "../state/store";
import { enumValues } from "./utils";

export enum AgentMode {
  // Vision = "vision",
  VisionEnhanced = "vision-enhanced",
  Text = "text",
}

export enum SupportedModels {
  Gemini20Flash = "gemini-2.0-flash",
  Gemini20FlashLite = "gemini-2.0-flash-lite",
  Gemini20Pro = "gemini-2.0-pro",
  Gemini15Pro = "gemini-1.5-pro"
}

function isSupportedModel(value: string): value is SupportedModels {
  return enumValues(SupportedModels).includes(value as SupportedModels);
}

export const DEFAULT_MODEL = SupportedModels.Gemini20Flash;

export const DisplayName = {
  [SupportedModels.Gemini20Flash]: "Gemini 2.0 Flash",
  [SupportedModels.Gemini20FlashLite]: "Gemini 2.0 Flash Lite",
  [SupportedModels.Gemini20Pro]: "Gemini 2.0 Pro",
  [SupportedModels.Gemini15Pro]: "Gemini 1.5 Pro"
};

export function hasVisionSupport(model: SupportedModels) {
  return true; // Semua model Gemini 2.0 mendukung vision
}

export type SDKChoice = "Google";

function chooseSDK(): SDKChoice {
  return "Google";
}

export function isGoogleModel() {
  return true;
}

export function isOpenAIModel() {
  return false;
}

export function isAnthropicModel() {
  return false;
}

export function isValidModelSettings(
  selectedModel: string,
  agentMode: AgentMode,
  openAIKey: string | undefined,
  anthropicKey: string | undefined,
  geminiKey: string | undefined,
): boolean {
  if (!isSupportedModel(selectedModel)) {
    return false;
  }
  if (
    agentMode === AgentMode.VisionEnhanced &&
    !hasVisionSupport(selectedModel)
  ) {
    return false;
  }
  if (isOpenAIModel() && !openAIKey) {
    return false;
  }
  if (isAnthropicModel() && !anthropicKey) {
    return false;
  }
  if (isGoogleModel() && !geminiKey) {
    return false;
  }
  return true;
}

export function findBestMatchingModel(
  selectedModel: string,
  agentMode: AgentMode,
  _openAIKey: string | undefined,
  _anthropicKey: string | undefined,
  geminiKey: string | undefined,
): SupportedModels {
  if (
    isValidModelSettings(
      selectedModel,
      agentMode,
      _openAIKey,
      _anthropicKey,
      geminiKey,
    )
  ) {
    return selectedModel as SupportedModels;
  }
  if (geminiKey) {
    return SupportedModels.Gemini20Flash;
  }
  return DEFAULT_MODEL;
}

export type CommonMessageCreateParams = {
  prompt: string;
  imageData?: string;
  systemMessage?: string;
  jsonMode?: boolean;
};

export type Response = {
  usage: OpenAI.CompletionUsage | undefined;
  rawResponse: string;
};

export async function fetchResponseFromModelOpenAI(
  model: SupportedModels,
  params: CommonMessageCreateParams,
): Promise<Response> {
  const key = useAppState.getState().settings.openAIKey;
  if (!key) {
    throw new Error("No OpenAI key found");
  }
  const baseURL = useAppState.getState().settings.openAIBaseUrl;
  const openai = new OpenAI({
    apiKey: key,
    baseURL: baseURL ? baseURL : undefined, // explicitly set to undefined because empty string would cause an error
    dangerouslyAllowBrowser: true, // user provides the key
  });
  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (params.systemMessage != null) {
    // O1 does not support system message
    if (
      model === SupportedModels.Gemini20Flash ||
      model === SupportedModels.Gemini20FlashLite ||
      model === SupportedModels.Gemini20Pro
    ) {
      messages.push({
        role: "user",
        content: params.systemMessage,
      });
    } else {
      messages.push({
        role: "system",
        content: params.systemMessage,
      });
    }
  }
  const content: OpenAI.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: params.prompt,
    },
  ];
  if (params.imageData != null) {
    content.push({
      type: "image_url",
      image_url: {
        url: params.imageData,
      },
    });
  }
  messages.push({
    role: "user",
    content,
  });
  if (params.jsonMode) {
    messages.push({
      role: "assistant",
      content: "{",
    });
  }
  const completion = await openai.chat.completions.create({
    model: model,
    messages,
    // max_completion_tokens: 1000,
    // temperature: 0,
  });
  let rawResponse = completion.choices[0].message?.content?.trim() ?? "";
  if (params.jsonMode && !rawResponse.startsWith("{")) {
    rawResponse = "{" + rawResponse;
  }
  return {
    usage: completion.usage,
    rawResponse,
  };
}

export async function fetchResponseFromModelAnthropic(
  model: SupportedModels,
  params: CommonMessageCreateParams,
): Promise<Response> {
  const key = useAppState.getState().settings.anthropicKey;
  if (!key) {
    throw new Error("No Anthropic key found");
  }
  const baseURL = useAppState.getState().settings.anthropicBaseUrl;
  const anthropic = new Anthropic({
    apiKey: key,
    baseURL: baseURL ? baseURL : undefined, // explicitly set to undefined because empty string would cause an error
  });
  const content: Anthropic.MessageParam["content"] = [
    {
      type: "text",
      text: params.prompt,
    },
  ];
  if (params.imageData != null) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/webp",
        // need to remove the prefix
        data: params.imageData.split("base64,")[1],
      },
    });
  }
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content,
    },
  ];
  if (params.jsonMode) {
    messages.push({
      role: "assistant",
      content: [
        {
          type: "text",
          text: "{",
        },
      ],
    });
  }
  const completion = await anthropic.messages.create(
    {
      model,
      system: params.systemMessage,
      messages,
      max_tokens: 1000,
      temperature: 0,
    },
    {
      headers: {
        "anthropic-dangerous-direct-browser-access": "true",
      },
    },
  );
  let rawResponse = completion.content[0].text.trim();
  if (params.jsonMode && !rawResponse.startsWith("{")) {
    rawResponse = "{" + rawResponse;
  }
  return {
    usage: {
      completion_tokens: completion.usage.output_tokens,
      prompt_tokens: completion.usage.input_tokens,
      total_tokens:
        completion.usage.output_tokens + completion.usage.input_tokens,
    },
    rawResponse,
  };
}

export async function fetchResponseFromModelGoogle(
  model: SupportedModels,
  params: CommonMessageCreateParams,
): Promise<Response> {
  const key = useAppState.getState().settings.geminiKey;
  if (!key) {
    throw new Error("No Google Gemini key found");
  }
  const genAI = new GoogleGenerativeAI(key);
  const client = genAI.getGenerativeModel({
    model: model,
    systemInstruction: params.systemMessage,
  });
  const requestInput: Array<string | Part> = [];
  requestInput.push(params.prompt);
  if (params.imageData != null) {
    requestInput.push({
      inlineData: {
        data: params.imageData.split("base64,")[1],
        mimeType: "image/webp",
      },
    });
  }
  const result = await client.generateContent(requestInput);
  return {
    usage: {
      completion_tokens:
        result.response.usageMetadata?.candidatesTokenCount ?? 0,
      prompt_tokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      total_tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
    },
    rawResponse: result.response.text(),
  };
}

export async function fetchResponseFromModel(
  model: SupportedModels,
  params: CommonMessageCreateParams,
): Promise<Response> {
  const sdk = chooseSDK();
  if (sdk === "OpenAI") {
    return await fetchResponseFromModelOpenAI(model, params);
  } else if (sdk === "Anthropic") {
    return await fetchResponseFromModelAnthropic(model, params);
  } else if (sdk === "Google") {
    return await fetchResponseFromModelGoogle(model, params);
  } else {
    throw new Error("Unsupported model");
  }
}
