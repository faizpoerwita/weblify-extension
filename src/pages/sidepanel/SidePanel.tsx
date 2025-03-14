import React, { useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  useColorMode,
  Divider,
  useColorModeValue,
  HStack,
  Icon,
  Button,
} from '@chakra-ui/react';
import { useAppState } from '../../state/store';
import { AgentMode } from '../../helpers/aiSdkUtils';
import { ModelSelector } from '../../components/ModelSelector';
import SetAPIKey from '../../common/settings/SetAPIKey';
import { FaRobot, FaBrain, FaGlobe, FaMagic } from 'react-icons/fa';
import { Global, css } from '@emotion/react';

const SidePanel: React.FC = () => {
  const { geminiKey, agentMode, updateSettings } = useAppState((state) => ({
    geminiKey: state.settings.geminiKey,
    agentMode: state.settings.agentMode,
    updateSettings: state.settings.actions.update
  }));

  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  // Jika geminiKey belum diatur untuk alasan apapun, atur secara otomatis
  useEffect(() => {
    if (!geminiKey) {
      updateSettings({
        geminiKey: "AIzaSyCtGDhlUfVKCIFBY1scaXfDQD0aHH7PeJc"
      });
    }
  }, [geminiKey, updateSettings]);

  // Variabel warna dan gradient bergantung pada mode - diperbarui untuk lebih sleek dan elegant
  const gradientBg = useColorModeValue(
    "linear-gradient(165deg, rgba(230,245,255,1) 0%, rgba(179,229,252,1) 30%, rgba(120,190,240,1) 65%, rgba(80,160,230,1) 100%)",
    "linear-gradient(165deg, rgba(15,25,40,0.95) 0%, rgba(25,35,60,0.95) 40%, rgba(35,45,80,0.95) 70%, rgba(45,55,100,0.95) 100%)"
  );
  
  const cardBg = useColorModeValue(
    "rgba(255, 255, 255, 0.8)",
    "rgba(26, 32, 44, 0.8)"
  );
  
  const textColor = useColorModeValue("blue.800", "blue.100");
  const accentColor = useColorModeValue("blue.500", "blue.300");
  const subtleColor = useColorModeValue("blue.600", "blue.300");
  const borderColor = useColorModeValue("rgba(255, 255, 255, 0.6)", "rgba(255, 255, 255, 0.2)");
  const dividerColor = useColorModeValue("blue.100", "blue.700");
  const iconBoxBg = useColorModeValue("blue.50", "rgba(49, 130, 206, 0.15)");
  const iconBoxBorder = useColorModeValue("blue.100", "rgba(49, 130, 206, 0.3)");

  // Bahkan jika geminiKey belum diatur, tetap tampilkan antarmuka utama
  return (
    <Box 
      minH="100vh"
      position="relative"
      overflow="hidden"
    >
      {/* Global styles untuk animasi */}
      <Global 
        styles={css`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
            100% { opacity: 0.5; transform: scale(1); }
          }
          
          @keyframes float {
            0% { transform: translate(0, 0); }
            50% { transform: translate(5px, 10px); }
            100% { transform: translate(0, 0); }
          }
          
          @keyframes gradient-flow {
            0% { background-position: 0% 25%; }
            25% { background-position: 50% 50%; }
            50% { background-position: 100% 75%; }
            75% { background-position: 50% 50%; }
            100% { background-position: 0% 25%; }
          }
          
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      />

      {/* Background gradient dan animasi */}
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg={gradientBg}
        backgroundSize="300% 300%"
        animation="gradient-flow 18s ease-in-out infinite"
        zIndex="-1"
        overflow="hidden"
      >
        {/* Animated background effects */}
        <Box
          position="absolute"
          top="-10%"
          left="-10%"
          width="120%"
          height="120%"
          opacity="0.7"
          animation="rotate 60s linear infinite"
          sx={{
            background: `radial-gradient(ellipse at center, ${isDark ? "rgba(99,179,237,0.1)" : "rgba(99,179,237,0.15)"} 0%, transparent 70%)`
          }}
        />
        
        {/* Subtle animated blue blobs - ditingkatkan */}
        <Box
          position="absolute"
          top="10%"
          left="5%"
          width="40%"
          height="30%"
          opacity={isDark ? "0.5" : "0.6"}
          animation="float 18s infinite ease-in-out"
          sx={{
            background: `radial-gradient(circle, ${isDark ? "rgba(99,179,237,0.1)" : "rgba(99,179,237,0.15)"} 0%, transparent 70%)`,
            borderRadius: "50%"
          }}
        />
        
        <Box
          position="absolute"
          bottom="20%"
          right="10%"
          width="35%"
          height="25%"
          opacity={isDark ? "0.5" : "0.6"}
          animation="float 15s infinite ease-in-out reverse"
          sx={{
            background: `radial-gradient(circle, ${isDark ? "rgba(66,153,225,0.1)" : "rgba(66,153,225,0.15)"} 0%, transparent 70%)`,
            borderRadius: "50%"
          }}
        />
        
        {/* Tambahkan efek cahaya yang bergerak */}
        <Box
          position="absolute"
          top="30%"
          left="25%"
          width="50%"
          height="40%"
          opacity="0.5"
          animation="pulse 8s infinite ease-in-out"
          sx={{
            background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
      </Box>
      
      {/* Main Content with glassmorphism */}
      <Box 
        p={6} 
        position="relative"
        zIndex="1"
      >
        <VStack 
          spacing={6} 
          align="stretch"
          animation="fadeIn 0.6s ease-out"
        >
          <HStack spacing={3} align="center">
            <Box
              w="32px"
              h="32px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              borderRadius="xl"
              bg={iconBoxBg}
              border="1px solid"
              borderColor={iconBoxBorder}
              boxShadow="0 2px 6px rgba(0,100,255,0.1)"
            >
              <Icon as={FaGlobe} color={accentColor} boxSize="1.2em" />
            </Box>
            <Heading 
              size="md" 
              bgGradient={isDark 
                ? "linear(to-r, blue.300, cyan.200)" 
                : "linear(to-r, blue.600, blue.400)"
              }
              bgClip="text"
              fontWeight="bold"
              letterSpacing="-0.02em"
              animation="pulse 4s infinite ease-in-out"
            >
              weblify.id Assistant
            </Heading>
          </HStack>
          
          <Box
            p={5}
            borderRadius="xl"
            bg={cardBg}
            backdropFilter="blur(15px)"
            border="1px solid"
            borderColor={borderColor}
            boxShadow="0 10px 30px rgba(0, 100, 255, 0.1)"
            transition="all 0.3s ease"
            _hover={{ transform: "translateY(-2px)", boxShadow: "0 15px 35px rgba(0, 100, 255, 0.15)" }}
            animation="fadeIn 0.8s ease-out"
            position="relative"
            overflow="hidden"
          >
            {/* Dekoratif background untuk card */}
            <Box 
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              opacity="0.1"
              pointerEvents="none"
              background={`radial-gradient(circle at 15% 85%, ${isDark ? "rgba(99,179,237,0.8)" : "rgba(99,179,237,0.4)"} 0%, transparent 60%)`}
            />
            
            <HStack spacing={3} mb={3} position="relative">
              <Box
                w="28px"
                h="28px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="lg"
                bg={iconBoxBg}
                border="1px solid"
                borderColor={iconBoxBorder}
              >
                <Icon as={FaBrain} color={accentColor} boxSize="0.9em" />
              </Box>
              <Text fontWeight="semibold" color={textColor}>Model Settings</Text>
            </HStack>
            
            <ModelSelector />
            
            <Text fontSize="sm" color={subtleColor} mt={2} ml={1}>
              Model cepat untuk tugas umum (Default)
            </Text>
          </Box>

          <Divider borderColor={dividerColor} opacity={0.6} />

          <Box
            p={5}
            borderRadius="xl"
            bg={cardBg}
            backdropFilter="blur(15px)"
            border="1px solid"
            borderColor={borderColor}
            boxShadow="0 10px 30px rgba(0, 100, 255, 0.1)"
            transition="all 0.3s ease"
            _hover={{ transform: "translateY(-2px)", boxShadow: "0 15px 35px rgba(0, 100, 255, 0.15)" }}
            animation="fadeIn 1s ease-out"
            position="relative"
            overflow="hidden"
          >
            {/* Dekoratif background untuk card */}
            <Box 
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              opacity="0.1"
              pointerEvents="none"
              background={`radial-gradient(circle at 85% 15%, ${isDark ? "rgba(66,153,225,0.8)" : "rgba(66,153,225,0.4)"} 0%, transparent 60%)`}
            />
            
            <HStack spacing={3} mb={3} position="relative">
              <Box
                w="28px"
                h="28px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="lg"
                bg={iconBoxBg}
                border="1px solid"
                borderColor={iconBoxBorder}
              >
                <Icon as={FaRobot} color={accentColor} boxSize="0.9em" />
              </Box>
              <Text fontWeight="semibold" color={textColor}>Mode Assistant</Text>
            </HStack>
            
            <HStack spacing={2} mb={2}>
              <Box
                py={2}
                px={3}
                borderRadius="lg"
                bg={agentMode === AgentMode.VisionEnhanced 
                  ? useColorModeValue("blue.50", "rgba(49, 130, 206, 0.15)") 
                  : useColorModeValue("gray.50", "rgba(160, 174, 192, 0.1)")
                }
                borderWidth="1px"
                borderColor={agentMode === AgentMode.VisionEnhanced 
                  ? useColorModeValue("blue.100", "rgba(49, 130, 206, 0.3)") 
                  : useColorModeValue("gray.200", "rgba(160, 174, 192, 0.2)")
                }
                transition="all 0.3s ease"
              >
                <HStack spacing={2}>
                  <Icon as={FaMagic} color={agentMode === AgentMode.VisionEnhanced ? accentColor : subtleColor} boxSize="0.8em" />
                  <Text fontSize="sm" fontWeight={agentMode === AgentMode.VisionEnhanced ? "medium" : "normal"} color={agentMode === AgentMode.VisionEnhanced ? textColor : subtleColor}>
                    {agentMode === AgentMode.VisionEnhanced ? 'Vision Enhanced' : 'Text Only'}
                  </Text>
                </HStack>
              </Box>
            </HStack>
            
            <Text color={subtleColor} fontSize="sm">
              Ready to assist with your browsing tasks
            </Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
};

export default SidePanel; 