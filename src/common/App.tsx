import {
  Link,
  Box,
  ChakraProvider,
  Heading,
  HStack,
  IconButton,
  Icon,
  extendTheme,
  useColorModeValue,
  Button,
  Flex,
  keyframes,
} from "@chakra-ui/react";
import { SettingsIcon } from "@chakra-ui/icons";
import { FaDiscord, FaGithub } from "react-icons/fa6";
import { useState, useEffect } from "react";
import { useAppState } from "../state/store";
import SetAPIKey from "./settings/SetAPIKey";
import TaskUI from "./TaskUI";
import Settings from "./Settings";
import { Global, css } from "@emotion/react";

// Keyframes untuk animasi
const rotateKeyframes = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulseKeyframes = keyframes`
  0% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
  100% { opacity: 0.4; transform: scale(1); }
`;

const floatKeyframes = keyframes`
  0% { transform: translate(0, 0); }
  50% { transform: translate(5px, 10px); }
  100% { transform: translate(0, 0); }
`;

// Buat variabel CSS custom untuk gradient yang konsisten
const gradientColors = {
  light: {
    primary: "linear-gradient(165deg, rgba(224,249,255,1) 0%, rgba(179,229,252,1) 40%, rgba(144,216,249,1) 60%, rgba(99,205,247,1) 100%)",
    secondary: "linear-gradient(135deg, rgba(214,242,255,1) 0%, rgba(191,232,253,1) 50%, rgba(166,223,251,1) 100%)",
    accent: "radial-gradient(circle, rgba(99,179,237,0.2) 0%, transparent 70%)",
    accentAlt: "radial-gradient(circle, rgba(66,153,225,0.2) 0%, transparent 70%)"
  }
};

// Tema yang dioptimalkan untuk tampilan frosted glass dan gradient
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: gradientColors.light.primary,
        backgroundAttachment: "fixed",
      },
      // Tambahkan global animation keyframes
      "@keyframes float": {
        "0%": { transform: "translate(0, 0)" },
        "50%": { transform: "translate(5px, 10px)" },
        "100%": { transform: "translate(0, 0)" }
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "full",
        fontWeight: "medium",
        _hover: {
          transform: "translateY(-2px)",
          boxShadow: "md",
        },
        _active: {
          transform: "translateY(0)",
        },
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      variants: {
        glassmorphic: {
          bg: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(10px)",
          color: "blue.700",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          _hover: {
            bg: "rgba(255, 255, 255, 0.25)",
          },
        },
      },
    },
    IconButton: {
      variants: {
        glassmorphic: {
          bg: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(10px)",
          color: "blue.700",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          _hover: {
            bg: "rgba(255, 255, 255, 0.25)",
            transform: "translateY(-2px)",
            boxShadow: "md",
          },
          _active: {
            transform: "translateY(0)",
          },
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
  },
});

const App = () => {
  const hasAPIKey = useAppState((state) => state.settings.geminiKey);
  const [inSettingsView, setInSettingsView] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Animasi fade-in untuk konten utama
  useEffect(() => {
    setMounted(true);
  }, []);

  const glassBackground = useColorModeValue(
    "rgba(255, 255, 255, 0.7)",
    "rgba(10, 15, 30, 0.7)"
  );

  return (
    <ChakraProvider theme={theme}>
      {/* Global styles untuk animasi */}
      <Global 
        styles={css`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.05); }
            100% { opacity: 0.4; transform: scale(1); }
          }
          
          @keyframes gradient-flow {
            0% { background-position: 0% 25%; }
            25% { background-position: 50% 50%; }
            50% { background-position: 100% 75%; }
            75% { background-position: 50% 50%; }
            100% { background-position: 0% 25%; }
          }
          
          @keyframes task-notification-appear {
            0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(1.05); }
            100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.05); }
          }
        `}
      />

      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg={gradientColors.light.primary}
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
          opacity="0.6"
          animation="rotate 60s linear infinite"
          sx={{
            background: "radial-gradient(ellipse at center, rgba(99,179,237,0.15) 0%, rgba(99,179,237,0) 70%)"
          }}
        />
        
        {/* Subtle animated blue blobs */}
        <Box
          position="absolute"
          top="10%"
          left="5%"
          width="30%"
          height="40%"
          opacity="0.6"
          animation="float 18s infinite ease-in-out"
          sx={{
            background: "radial-gradient(circle, rgba(99,179,237,0.12) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
        
        <Box
          position="absolute"
          bottom="20%"
          right="10%"
          width="25%"
          height="30%"
          opacity="0.6"
          animation="float 15s infinite ease-in-out reverse"
          sx={{
            background: "radial-gradient(circle, rgba(66,153,225,0.12) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
        
        {/* Additional subtle blue blobs */}
        <Box
          position="absolute"
          top="60%"
          left="25%"
          width="20%"
          height="25%"
          opacity="0.5"
          animation="float 20s infinite ease-in-out 2s"
          sx={{
            background: "radial-gradient(circle, rgba(144,205,244,0.1) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
        
        <Box
          position="absolute"
          top="30%"
          right="15%"
          width="35%"
          height="20%"
          opacity="0.5" 
          animation="float 25s infinite ease-in-out 1s"
          sx={{
            background: "radial-gradient(circle, rgba(129,198,246,0.1) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
      </Box>

      <Box
        p="8"
        pb="24"
        fontSize="lg"
        w="full"
        backgroundImage="none"
        position="relative"
        opacity={mounted ? 1 : 0}
        transform={mounted ? "translateY(0)" : "translateY(10px)"}
        transition="all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg={glassBackground}
          backdropFilter="blur(10px)"
          borderRadius="lg"
          zIndex="-1"
          boxShadow="0 8px 32px rgba(0, 0, 0, 0.1)"
        />

        <Flex 
          mb={6} 
          alignItems="center" 
          justifyContent="space-between"
          position="relative"
        >
          <Heading 
            as="h1" 
            size="lg" 
            bgGradient="linear(to-r, blue.600, blue.400)"
            bgClip="text"
            fontWeight="bold"
            letterSpacing="tight"
            display="flex"
            alignItems="center"
            transform="scale(1)"
            transition="transform 0.3s ease"
            _hover={{ transform: "scale(1.02)" }}
          >
            <Box as="span" mr={2} fontSize="xl">
              🌐
            </Box>
            weblify.id
          </Heading>
          
          {hasAPIKey && (
            <IconButton
              icon={<SettingsIcon />}
              onClick={() => setInSettingsView(true)}
              aria-label="open settings"
              variant="glassmorphic"
              size="md"
            />
          )}
        </Flex>

        <Box
          borderRadius="xl"
          overflow="hidden"
          position="relative"
          bg="rgba(255, 255, 255, 0.1)"
          backdropFilter="blur(7px)"
          boxShadow="0 4px 20px rgba(0, 0, 0, 0.05)"
          border="1px solid rgba(255, 255, 255, 0.2)"
          transition="all 0.3s ease"
          _hover={{ boxShadow: "0 6px 25px rgba(0, 0, 0, 0.08)" }}
        >
          {hasAPIKey ? (
            inSettingsView ? (
              <Settings setInSettingsView={setInSettingsView} />
            ) : (
              <TaskUI />
            )
          ) : (
            <SetAPIKey asInitializerView />
          )}
        </Box>
      </Box>

      <Box
        px="8"
        pos="fixed"
        w="100%"
        bottom={0}
        py={4}
        borderTop="1px"
        borderColor="rgba(255, 255, 255, 0.3)"
        bg="rgba(255, 255, 255, 0.8)"
        backdropFilter="blur(10px)"
        transition="all 0.3s ease"
        boxShadow="0 -4px 20px rgba(0, 0, 0, 0.03)"
        zIndex={10}
      >
        <HStack justify="center" spacing={6}>
          <Link
            href="https://github.com/normal-computing/fuji-web"
            isExternal
            display="flex"
            alignItems="center"
            color="blue.600"
            fontWeight="medium"
            transition="all 0.2s ease"
            _hover={{ 
              color: "blue.500",
              transform: "translateY(-1px)"
            }}
          >
            <Icon as={FaGithub} mr={2} />
            GitHub
          </Link>
          <Link
            href="https://discord.gg/NxCe2CXXGU"
            isExternal
            display="flex"
            alignItems="center"
            color="blue.600"
            fontWeight="medium"
            transition="all 0.2s ease"
            _hover={{ 
              color: "blue.500",
              transform: "translateY(-1px)"
            }}
          >
            <Icon as={FaDiscord} mr={2} />
            Join Our Discord
          </Link>
        </HStack>
      </Box>
    </ChakraProvider>
  );
};

export default App;
