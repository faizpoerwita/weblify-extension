import { type LabelData } from "@pages/content/drawLabels";
import OpenAI from "openai";
import { useAppState } from "../../state/store";
import { allToolsDescriptions } from "./tools";
import { type Knowledge } from "../knowledge";
import errorChecker from "../errorChecker";
import { fetchResponseFromModel } from "../aiSdkUtils";
import { type Action, parseResponse } from "./parseResponse";
import { logError, ERROR_TYPES } from "../errorChecker";

export type QueryResult = {
  usage: OpenAI.CompletionUsage | undefined;
  prompt: string;
  rawResponse: string;
  action: Action;
} | null;

/**
 * Enhanced System Message yang menggabungkan kemampuan Vision dan Text
 * untuk memberikan konteks yang lebih kaya pada model
 */
const enhancedSystemMessage = (voiceMode: boolean) => `
You are a browser automation assistant with enhanced capabilities.

You can use the following tools:

${allToolsDescriptions}

You will be given a task to perform, and TWO sources of information:
1. An image showing both a clean screenshot of the current page and the same screenshot with interactive elements annotated.
2. A structured representation of the webpage content including text, interactive elements, and their metadata.

You should use BOTH visual information from the screenshot AND the structured DOM data to make the best decision.
- Use the visual information to understand the layout, design, and visual context of the page.
- Use the structured DOM to understand text content, form fields, links, buttons and other interactive elements.

You will also be given previous actions that you have taken. If something does not work, try to find an alternative solution.

This is one example of expected response from you:

{
  "thought": "Based on both the visual information and the DOM structure, I'm clicking the search button after analyzing the form field.",${
    voiceMode
      ? `
  "speak": "I'm now searching for the requested information by clicking the search button.",`
      : ""
  }
  "action": {
    "name": "click",
    "args": {
      "uid": "123"
    }
  }
}

If the given task asks for information about the current website content, include a comprehensive analysis using BOTH visual and textual data in your ${
  voiceMode ? "speak" : "thought"
} response.

Your response must always be in JSON format and must include string "thought"${
  voiceMode ? ', string "speak",' : ""
} and object "action", which contains the string "name" of tool of choice, and necessary arguments ("args") if required by the tool.
When finish, use the "finish" action and include a brief summary of the task in "thought"; if user is seeking an answer, also include the answer in "thought".
`;

/**
 * Fungsi utama yang menggabungkan kemampuan Vision Enhanced dan Text
 * untuk menentukan tindakan berikutnya
 */
export async function determineNextActionEnhanced(
  taskInstructions: string,
  url: URL,
  knowledge: Knowledge,
  previousActions: Action[],
  screenshotData: string,
  labelData: LabelData[],
  viewportPercentage: number,
  domContent: string, // Konten DOM dari mode Text
  maxAttempts = 3,
  notifyError?: (error: string) => void,
): Promise<QueryResult> {
  const model = useAppState.getState().settings.selectedModel;
  const voiceMode = useAppState.getState().settings.voiceMode;
  
  // Format prompt dengan kedua jenis konteks
  const prompt = formatEnhancedPrompt(
    taskInstructions,
    previousActions,
    url,
    knowledge,
    labelData,
    viewportPercentage,
    domContent
  );

  for (let i = 0; i < maxAttempts; i++) {
    try {
      logError(ERROR_TYPES.GENERAL, `Attempting enhanced vision+text query (attempt ${i+1}/${maxAttempts})`, {
        modelUsed: model,
      });
      
      const completion = await fetchResponseFromModel(model, {
        systemMessage: enhancedSystemMessage(voiceMode),
        prompt,
        imageData: screenshotData,
        jsonMode: true,
      });

      const rawResponse = completion.rawResponse;
      let action = null;
      try {
        action = parseResponse(rawResponse);
      } catch (e) {
        console.error(e);
        throw new Error(`Incorrect response format: ${e}`);
      }

      return {
        usage: completion.usage,
        prompt,
        rawResponse,
        action,
      };
    } catch (error: any) {
      if (error instanceof Error) {
        const recoverable = errorChecker(error, notifyError);
        if (!recoverable) {
          throw error;
        }
      } else {
        console.error("Unexpected determineNextAction error:");
        console.error(error);
      }
    }
  }
  
  const errMsg = `Failed to complete enhanced vision+text query after ${maxAttempts} attempts.`;
  if (notifyError) {
    notifyError(errMsg);
  }
  throw new Error(errMsg);
}

/**
 * Format prompt dengan menggabungkan data dari kedua mode
 */
export function formatEnhancedPrompt(
  taskInstructions: string,
  previousActions: Action[],
  url: URL,
  knowledge: Knowledge,
  labelData: LabelData[],
  viewportPercentage: number,
  domContent: string
) {
  // 1. Task instructions
  let result = `The user requests the following task:

${taskInstructions}`;

  // 2. Previous actions
  let previousActionsString = "";
  if (previousActions.length > 0) {
    const serializedActions = previousActions
      .map(
        (action) =>
          `Thought: ${action.thought}\nAction:${JSON.stringify(
            action.operation,
          )}`,
      )
      .join("\n\n");
    previousActionsString = `You have already taken the following actions: \n${serializedActions}\n\n`;
  }
  result += `\n${previousActionsString}\n`;

  // 3. Current time + current URL + current page scrolling position
  let urlString = url.href;
  // Do not include search if it's too long
  if (url.search.length > 100) {
    urlString = url.origin + url.pathname;
  }
  result += `
Current time: ${new Date().toLocaleString()}
Current URL: ${urlString}
Current page scrolling position: ${viewportPercentage.toFixed(1)}%
`;

  // 4. Knowledge
  if (knowledge.notes != null && knowledge.notes?.length > 0) {
    result += `
Notes regarding the current website:
${knowledge.notes.map((k) => `  - ${k}`).join("\n")}`;
  }

  // 5. Label data from HTML
  result += `

VISUAL INTERFACE DATA - Annotated elements visible in the screenshots (using \`===\` as a delimiter between each annotation):

${labelData.map((item) => tomlLikeStringifyObject(item)).join("\n===\n")}
`;

  // 6. Active element
  const currentActiveItem = labelData.find((item) => item.active);
  if (currentActiveItem != null) {
    result += `
This ${currentActiveItem.tagName.toLocaleLowerCase()} currently has focus:
${tomlLikeStringifyObject(currentActiveItem)}
`;
  }

  // 7. DOM content from Text mode
  result += `

STRUCTURED DOM DATA - Textual content and interactive elements on the page:

${domContent.length > 20000 ? domContent.substring(0, 20000) + "... (truncated for brevity)" : domContent}
`;

  return result;
}

function tomlLikeStringifyObject(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([key, value]) =>
      // only include string values
      typeof value === "string" ? `${key} = ${value}` : null,
    )
    .filter((v) => v != null)
    .join("\n");
} 