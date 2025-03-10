import React from "react";
import { Select, SelectProps } from "@chakra-ui/react";
import { useAppState } from "../state/store";
import { SupportedModels, DisplayName } from "../helpers/aiSdkUtils";

export const ModelSelector: React.FC<Omit<SelectProps, 'value' | 'onChange'>> = (props) => {
  const { selectedModel, updateSettings } = useAppState((state) => ({
    selectedModel: state.settings.selectedModel,
    updateSettings: state.settings.actions.update,
  }));

  return (
    <Select
      value={selectedModel}
      onChange={(e) => updateSettings({ selectedModel: e.target.value as SupportedModels })}
      {...props}
    >
      <option value={SupportedModels.Gemini20Flash}>
        {DisplayName[SupportedModels.Gemini20Flash]}
      </option>
      <option value={SupportedModels.Gemini20FlashLite}>
        {DisplayName[SupportedModels.Gemini20FlashLite]}
      </option>
      <option value={SupportedModels.Gemini20Pro}>
        {DisplayName[SupportedModels.Gemini20Pro]}
      </option>
      <option value={SupportedModels.Gemini15Pro}>
        {DisplayName[SupportedModels.Gemini15Pro]}
      </option>
    </Select>
  );
}; 