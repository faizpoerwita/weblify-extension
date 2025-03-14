import { merge } from "lodash";
import { create, StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { createCurrentTaskSlice, CurrentTaskSlice } from "./currentTask";
import { createUiSlice, UiSlice } from "./ui";
import { createSettingsSlice, SettingsSlice } from "./settings";
import { findBestMatchingModel } from "../helpers/aiSdkUtils";

export type StoreType = {
  currentTask: CurrentTaskSlice;
  ui: UiSlice;
  settings: SettingsSlice;
};

export type MyStateCreator<T> = StateCreator<
  StoreType,
  [["zustand/immer", never]],
  [],
  T
>;

export const useAppState = create<StoreType>()(
  persist(
    immer(
      devtools((...a) => ({
        currentTask: createCurrentTaskSlice(...a),
        ui: createUiSlice(...a),
        settings: createSettingsSlice(...a),
      })),
    ),
    {
      name: "app-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Stuff we want to persist
        ui: {
          instructions: state.ui.instructions,
        },
        settings: {
          geminiKey: state.settings.geminiKey,
          agentMode: state.settings.agentMode,
          selectedModel: state.settings.selectedModel,
          voiceMode: state.settings.voiceMode,
          customKnowledgeBase: state.settings.customKnowledgeBase,
        },
      }),
      merge: (persistedState, currentState) => {
        const result = merge(currentState, persistedState);
        if (result.settings) {
          result.settings.selectedModel = findBestMatchingModel(
            result.settings.selectedModel,
            result.settings.agentMode,
            undefined,
            undefined,
            result.settings.geminiKey,
          );
        }
        return result;
      },
    },
  ),
);

// @ts-expect-error used for debugging
window.getState = useAppState.getState;
