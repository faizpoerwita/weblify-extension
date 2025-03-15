import { type LabelData } from "@pages/content/drawLabels";
import OpenAI from "openai";
import { useAppState } from "../../state/store";
import { allToolsDescriptions } from "./tools";
import { type Knowledge } from "../knowledge";
import errorChecker from "../errorChecker";
import { fetchResponseFromModel } from "../aiSdkUtils";
import { type Action, parseResponse } from "./parseResponse";
import { QueryResult } from "./determineNextAction";

const enhancedSystemMessage = (voiceMode: boolean) => `
You are a browser automation assistant with enhanced DOM understanding.

You can use the following tools:

${allToolsDescriptions}

You will be given a task to perform, and two types of information about the current page:
1. The DOM structure with interactive elements marked
2. A visual representation in an image that contains two parts: 
   - On the left is a clean screenshot of the current page
   - On the right is the same screenshot with interactive elements annotated with corresponding uid

Always prioritize the DOM structure when identifying elements and understanding page structure.
Use the visual information as a secondary source to confirm your understanding of the DOM.

You will also be given previous actions that you have taken. If something does not work, 
try find an alternative solution.

Your response must always be in JSON format and must include string "thought"${
  voiceMode ? ', string "speak",' : ""
} and object "action", which contains the string "name" of tool of choice, and necessary arguments ("args") if required by the tool.
When finish, use the "finish" action and include a brief summary of the task in "thought"; if user is seeking an answer, also include the answer in "thought".
`;

export async function determineNextActionEnhanced(
  taskInstructions: string,
  url: URL,
  knowledge: Knowledge,
  previousActions: Action[],
  screenshotData: string,
  labelData: LabelData[],
  viewportPercentage: number,
  domStructure: string,
  maxAttempts = 3,
  notifyError?: (error: string) => void,
): Promise<QueryResult> {
  const model = useAppState.getState().settings.selectedModel;
  const voiceMode = useAppState.getState().settings.voiceMode;
  const prompt = formatEnhancedPrompt(
    taskInstructions,
    previousActions,
    url,
    knowledge,
    labelData,
    viewportPercentage,
    domStructure,
  );

  for (let i = 0; i < maxAttempts; i++) {
    try {
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
        console.error("Unexpected determineNextActionEnhanced error:");
        console.error(error);
      }
    }
  }
  const errMsg = `Failed to complete query after ${maxAttempts} attempts. Please try again later.`;
  if (notifyError) {
    notifyError(errMsg);
  }
  throw new Error(errMsg);
}

export function formatEnhancedPrompt(
  taskInstructions: string,
  previousActions: Action[],
  url: URL,
  knowledge: Knowledge,
  labelData: LabelData[],
  viewportPercentage: number,
  domStructure: string,
) {
  // 1. task instructions
  let result = `The user requests the following task:

  ${taskInstructions}`;

  // 2. previous actions
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

  // 3. current time + current URL + current page scrolling position
  let urlString = url.href;
  // do not include search if it's too long
  if (url.search.length > 100) {
    urlString = url.origin + url.pathname;
  }
  result += `
Current time: ${new Date().toLocaleString()}
Current URL: ${urlString}
Current page scrolling position: ${viewportPercentage.toFixed(1)}%
`;

  // 4. DOM structure (prioritized information)
  result += `
==== DOM STRUCTURE (PRIMARY REFERENCE) ====
This is the primary information to use for understanding the page structure:

${domStructure}
`;

  // 5. knowledge
  if (knowledge.notes != null && knowledge.notes?.length > 0) {
    result += `
Notes regarding the current website:
${knowledge.notes.map((k) => `  - ${k}`).join("\n")}`;
  }

  // 6. label data from HTML (supplementary information)
  result += `
==== INTERACTIVE ELEMENTS DETAILS (SECONDARY REFERENCE) ====
Use the following data as a secondary reference of the annotated elements (using \`===\` as a delimiter between each annotation):

${labelData.map((item) => tomlLikeStringifyObject(item)).join("\n===\n")}
`;
  // 7. active element
  const currentActiveItem = labelData.find((item) => item.active);
  if (currentActiveItem != null) {
    result += `
This ${currentActiveItem.tagName.toLocaleLowerCase()} currently has focus:
${tomlLikeStringifyObject(currentActiveItem)}
`;
  }
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