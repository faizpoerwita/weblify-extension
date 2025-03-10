import { type Data } from "../helpers/knowledge/index";
import { MyStateCreator } from "./store";
import {
  SupportedModels,
  findBestMatchingModel,
  AgentMode,
} from "../helpers/aiSdkUtils";

export type SettingsSlice = {
  geminiKey: string | undefined;
  selectedModel: SupportedModels;
  agentMode: AgentMode;
  voiceMode: boolean;
  customKnowledgeBase: Data;
  actions: {
    update: (values: Partial<SettingsSlice>) => void;
  };
};

export const createSettingsSlice: MyStateCreator<SettingsSlice> = (set) => ({
  geminiKey: "AIzaSyCtGDhlUfVKCIFBY1scaXfDQD0aHH7PeJc",
  agentMode: AgentMode.VisionEnhanced,
  selectedModel: SupportedModels.Gemini20Flash,
  voiceMode: false,
  customKnowledgeBase: {},
  actions: {
    update: (values) => {
      set((state) => {
        const newSettings: SettingsSlice = { ...state.settings, ...values };
        newSettings.selectedModel = findBestMatchingModel(
          newSettings.selectedModel,
          newSettings.agentMode,
          undefined,
          undefined,
          newSettings.geminiKey,
        );
        state.settings = newSettings;
      });
    },
  },
});
