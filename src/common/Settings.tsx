import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  AlertDescription,
  IconButton,
  HStack,
  FormControl,
  FormLabel,
  FormHelperText,
  Button,
  VStack,
  Box,
  StackDivider,
  Flex,
  Spacer,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@chakra-ui/react";
import { ArrowBackIcon, EditIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useAppState } from "../state/store";
import ModelDropdown from "./settings/ModelDropdown";
import AgentModeDropdown from "./settings/AgentModeDropdown";
import CustomKnowledgeBase from "./CustomKnowledgeBase";
import SetAPIKey from "./settings/SetAPIKey";
import { isValidModelSettings } from "../helpers/aiSdkUtils";

type SettingsProps = {
  setInSettingsView: React.Dispatch<React.SetStateAction<boolean>>;
};

const Settings = ({ setInSettingsView }: SettingsProps) => {
  const [view, setView] = useState<"settings" | "knowledge" | "api">("settings");
  const state = useAppState((state) => ({
    updateSettings: state.settings.actions.update,
    selectedModel: state.settings.selectedModel,
    agentMode: state.settings.agentMode,
    geminiKey: state.settings.geminiKey,
  }));

  if (!state.geminiKey) return null;

  const closeSetting = () => setInSettingsView(false);
  const openCKB = () => setView("knowledge");
  const backToSettings = () => setView("settings");

  return (
    <>
      <HStack mb={4} alignItems="center">
        <IconButton
          variant="outline"
          icon={<ArrowBackIcon />}
          onClick={() =>
            view === "settings" ? closeSetting() : backToSettings()
          }
          aria-label="go back"
        />
        <Breadcrumb separator={<ChevronRightIcon color="gray.500" />}>
          <BreadcrumbItem>
            <BreadcrumbLink href="#" onClick={backToSettings}>
              Settings
            </BreadcrumbLink>
          </BreadcrumbItem>
          {view === "knowledge" && (
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#">Instructions</BreadcrumbLink>
            </BreadcrumbItem>
          )}
          {view === "api" && (
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#">API</BreadcrumbLink>
            </BreadcrumbItem>
          )}
        </Breadcrumb>
      </HStack>
      {view === "knowledge" && <CustomKnowledgeBase />}
      {view === "api" && (
        <SetAPIKey
          asInitializerView={false}
          initialGeminiKey={state.geminiKey}
          onClose={backToSettings}
        />
      )}
      {view === "settings" && (
        <FormControl
          as={VStack}
          divider={<StackDivider borderColor="gray.200" />}
          spacing={4}
          align="stretch"
        >
          <Flex alignItems="center">
            <Box>
              <FormLabel mb="0">API Settings</FormLabel>
              <FormHelperText>
                API key disimpan secara lokal di perangkat Anda
              </FormHelperText>
            </Box>
            <Spacer />
            <Button onClick={() => setView("api")} rightIcon={<EditIcon />}>
              Edit
            </Button>
          </Flex>

          <Flex alignItems="center">
            <FormLabel mb="0">Mode Agent</FormLabel>
            <Spacer />
            <Box w="50%">
              <AgentModeDropdown />
            </Box>
          </Flex>
          <Flex alignItems="center">
            <FormLabel mb="0">Pilih Model</FormLabel>
            <Spacer />
            <Box w="50%">
              <ModelDropdown />
            </Box>
          </Flex>

          {!isValidModelSettings(
            state.selectedModel,
            state.agentMode,
            undefined,
            undefined,
            state.geminiKey,
          ) ? (
            <Alert status="error">
              <AlertIcon />
              <AlertDescription>
                Pengaturan model saat ini tidak valid. <br />
                Silakan verifikasi API key Anda, dan perhatikan bahwa beberapa model
                mungkin tidak kompatibel dengan mode agent tertentu.
              </AlertDescription>
            </Alert>
          ) : null}

          <Flex alignItems="center">
            <FormLabel mb="0">Custom Instructions</FormLabel>
            <Spacer />
            <Button rightIcon={<EditIcon />} onClick={openCKB}>
              Edit
            </Button>
          </Flex>
        </FormControl>
      )}
    </>
  );
};

export default Settings;
