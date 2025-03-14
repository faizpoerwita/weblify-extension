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
import { FaDiscord, FaGlobe } from "react-icons/fa6";
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
  0% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
  100% { opacity: 0.5; transform: scale(1); }
`;

const floatKeyframes = keyframes`
  0% { transform: translate(0, 0); }
  50% { transform: translate(5px, 10px); }
  100% { transform: translate(0, 0); }
`;

// Buat variabel CSS custom untuk gradient yang lebih sleek dan elegant
const gradientColors = {
  light: {
    primary: "linear-gradient(165deg, rgba(240,249,255,1) 0%, rgba(195,235,254,1) 30%, rgba(130,198,245,1) 65%, rgba(85,168,235,1) 100%)", 
    secondary: "linear-gradient(135deg, rgba(230,245,255,1) 0%, rgba(190,230,252,1) 50%, rgba(150,210,245,1) 100%)",
    accent: "radial-gradient(circle, rgba(90,170,235,0.35) 0%, transparent 70%)",
    accentAlt: "radial-gradient(circle, rgba(70,150,225,0.35) 0%, transparent 70%)",
    card: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(245,252,255,0.9) 100%)"
  }
};

// Tema yang dioptimalkan untuk tampilan frosted glass dan gradient
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: gradientColors.light.primary,
        backgroundAttachment: "fixed",
        color: "blue.800",
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
          boxShadow: "0 8px 15px rgba(0,118,255,0.2)",
        },
        _active: {
          transform: "translateY(0)",
        },
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      variants: {
        glassmorphic: {
          bg: "rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(15px)",
          color: "blue.700",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow: "0 5px 15px rgba(0,100,255,0.15)",
          _hover: {
            bg: "rgba(255, 255, 255, 0.4)",
            boxShadow: "0 8px 20px rgba(0,100,255,0.2)",
            transform: "translateY(-2px)",
          },
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
    IconButton: {
      variants: {
        glassmorphic: {
          bg: "rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(15px)",
          color: "blue.700",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow: "0 5px 15px rgba(0,100,255,0.15)",
          _hover: {
            bg: "rgba(255, 255, 255, 0.4)",
            transform: "translateY(-2px)",
            boxShadow: "0 8px 20px rgba(0,100,255,0.2)",
          },
          _active: {
            transform: "translateY(0)",
          },
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      },
    },
    Heading: {
      baseStyle: {
        color: "blue.800",
        letterSpacing: "-0.02em",
      }
    },
    Text: {
      baseStyle: {
        color: "blue.800",
      }
    },
    Box: {
      variants: {
        glass: {
          bg: "rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(15px)",
          borderRadius: "xl",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow: "0 10px 30px rgba(0,100,255,0.15)",
          transition: "all 0.3s ease",
        }
      }
    }
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
    "rgba(255, 255, 255, 0.85)",
    "rgba(10, 15, 30, 0.75)"
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
            0% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
            100% { opacity: 0.5; transform: scale(1); }
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
          
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          body {
            overflow-x: hidden;
          }
        `}
      />

      {/* Background dengan gradient animasi */}
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
          opacity="0.7"
          animation="rotate 60s linear infinite"
          sx={{
            background: "radial-gradient(ellipse at center, rgba(90,170,235,0.18) 0%, rgba(90,170,235,0) 70%)"
          }}
        />
        
        {/* Subtle animated blue blobs - lebih terlihat */}
        <Box
          position="absolute"
          top="10%"
          left="5%"
          width="35%"
          height="45%"
          opacity="0.7"
          animation="float 18s infinite ease-in-out"
          sx={{
            background: "radial-gradient(circle, rgba(90,170,235,0.15) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
        
        <Box
          position="absolute"
          bottom="10%"
          right="5%"
          width="40%"
          height="40%"
          opacity="0.6"
          animation="float 22s infinite ease-in-out reverse"
          sx={{
            background: "radial-gradient(circle, rgba(110,190,250,0.15) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
        
        <Box
          position="absolute"
          top="40%"
          right="15%"
          width="25%"
          height="25%"
          opacity="0.8"
          animation="float 15s infinite ease-in-out"
          sx={{
            background: "radial-gradient(circle, rgba(70,150,225,0.15) 0%, transparent 70%)",
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
            background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
      </Box>

      {/* Main content */}
      <Box
        opacity={mounted ? 1 : 0}
        transform={mounted ? "translateY(0)" : "translateY(10px)"}
        transition="all 0.5s ease-out"
        height="100%"
        position="relative"
        p={{ base: 4, md: 6 }}
        animation="fadeIn 0.6s ease-out"
      >
        {inSettingsView ? (
          <Settings setInSettingsView={setInSettingsView} />
        ) : !hasAPIKey ? (
          <SetAPIKey />
        ) : (
          <>
            <Flex
              as="header"
              align="center"
              justify="space-between"
              wrap="wrap"
              mb={5}
            >
              <HStack spacing={4}>
                <Heading 
                  size="md" 
                  bgGradient="linear(to-r, blue.500, blue.600)"
                  bgClip="text"
                  fontWeight="bold"
                  letterSpacing="-0.02em"
                  animation="pulse 4s infinite ease-in-out"
                >
                  weblify.id
                </Heading>
              </HStack>
              <HStack spacing={3}>
                <IconButton
                  variant="glassmorphic"
                  rounded="full"
                  aria-label="Website"
                  icon={<Icon as={FaGlobe} />}
                  size="sm"
                  as={Link}
                  href="https://weblify.id"
                  isExternal
                />
                <IconButton
                  variant="glassmorphic"
                  rounded="full"
                  aria-label="Settings"
                  icon={<SettingsIcon />}
                  size="sm"
                  onClick={() => setInSettingsView(true)}
                />
              </HStack>
            </Flex>
            
            <Box
              bg={glassBackground}
              backdropFilter="blur(15px) saturate(150%)"
              borderRadius="xl"
              p={{ base: 4, md: 6 }}
              boxShadow="0 12px 36px rgba(0,100,255,0.15)"
              border="1px solid rgba(255, 255, 255, 0.6)"
              height="calc(100% - 60px)"
              overflow="hidden"
              transition="all 0.3s ease"
              _hover={{
                boxShadow: "0 15px 40px rgba(0,100,255,0.18)",
              }}
              transform="translateZ(0)"
            >
              <TaskUI />
            </Box>
          </>
        )}
      </Box>
    </ChakraProvider>
  );
};

export default App;
