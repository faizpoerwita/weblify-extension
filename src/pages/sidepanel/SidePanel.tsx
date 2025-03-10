import React, { useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  useColorMode,
  Divider,
} from '@chakra-ui/react';
import { useAppState } from '../../state/store';
import { AgentMode } from '../../helpers/aiSdkUtils';
import { ModelSelector } from '../../components/ModelSelector';
import SetAPIKey from '../../common/settings/SetAPIKey';

const SidePanel: React.FC = () => {
  const { geminiKey, agentMode, updateSettings } = useAppState((state) => ({
    geminiKey: state.settings.geminiKey,
    agentMode: state.settings.agentMode,
    updateSettings: state.settings.actions.update
  }));

  const { colorMode } = useColorMode();

  // Jika geminiKey belum diatur untuk alasan apapun, atur secara otomatis
  useEffect(() => {
    if (!geminiKey) {
      updateSettings({
        geminiKey: "AIzaSyCtGDhlUfVKCIFBY1scaXfDQD0aHH7PeJc"
      });
    }
  }, [geminiKey, updateSettings]);

  // Bahkan jika geminiKey belum diatur, tetap tampilkan antarmuka utama
  return (
    <Box p={4} bg={colorMode === 'dark' ? 'gray.800' : 'white'} minH="100vh">
      <VStack spacing={6} align="stretch">
        <Heading size="md">weblify.id Assistant</Heading>
        
        <Box>
          <Text fontWeight="medium" mb={2}>Model Settings</Text>
          <ModelSelector />
          <Text fontSize="sm" color="gray.500" mt={1}>
            Model cepat untuk tugas umum (Default)
          </Text>
        </Box>

        <Divider />

        <Box>
          <Text color="gray.500">
            Mode: {agentMode === AgentMode.VisionEnhanced ? 'Vision Enhanced' : 'Text Only'}
          </Text>
          <Text color="gray.500" mt={2}>
            Ready to assist with your browsing tasks
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};

export default SidePanel; 