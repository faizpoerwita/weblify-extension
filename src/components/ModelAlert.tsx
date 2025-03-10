import React from "react";
import {
  Alert,
  AlertIcon,
  AlertDescription,
  Box,
} from "@chakra-ui/react";
import { useAppState } from "../state/store";
import { isValidModelSettings, AgentMode } from "../helpers/aiSdkUtils";

export const ModelAlert: React.FC = () => {
  const { selectedModel, agentMode, geminiKey } = useAppState((state) => ({
    selectedModel: state.settings.selectedModel,
    agentMode: state.settings.agentMode,
    geminiKey: state.settings.geminiKey,
  }));

  const isValidSettings = isValidModelSettings(
    selectedModel,
    agentMode,
    undefined, // openAIKey
    undefined, // anthropicKey
    geminiKey,
  );

  if (!isValidSettings) {
    return (
      <Alert status="error" mb={4}>
        <AlertIcon />
        <Box>
          <AlertDescription fontSize="sm">
            Sebagian besar kemampuan weblify.id berbasis pada mode Vision.
            Model non-vision tersedia untuk tujuan penelitian.
          </AlertDescription>
          <AlertDescription fontSize="sm" mt={2}>
            Pengaturan model saat ini tidak valid. <br />
            Harap verifikasi API key Anda, dan perhatikan bahwa beberapa model tidak
            mendukung mode vision.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  if (agentMode !== AgentMode.VisionEnhanced) {
    return (
      <Alert status="warning" mb={4}>
        <AlertIcon />
        <AlertDescription fontSize="sm">
          Mode non-vision memiliki kemampuan terbatas. Untuk pengalaman terbaik,
          gunakan mode Vision dengan model yang mendukung.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}; 