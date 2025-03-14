import { Button, VStack, Text, Box, HStack, Icon, useColorModeValue } from "@chakra-ui/react";
import { useAppState } from "../state/store";
import { FaTwitter, FaAmazon } from "react-icons/fa";

const tasks = [
  'Post on twitter.com with content "An automated post from Fuji-Web by @NormalComputing! :)" If I\'m not logged in, fail the task and wait for me to log in.',
  "Find a book about AI and add a physical copy to cart on Amazon.com. Pick the cheaper one from paperback and hardcover.",
];

const RecommendedTasks = ({
  runTask,
}: {
  runTask: (instructions: string) => void;
}) => {
  const state = useAppState((state) => ({
    instructions: state.ui.instructions,
  }));
  if (state.instructions) {
    return null;
  }

  const onButtonClick = (idx: number) => {
    runTask(tasks[idx]);
  };

  // Warna dan gradient yang bervariasi sesuai mode (light/dark)
  const gradientText = useColorModeValue(
    "linear(to-r, blue.600, blue.400)",
    "linear(to-r, blue.300, cyan.200)"
  );
  
  const cardBg = useColorModeValue(
    "rgba(255, 255, 255, 0.7)",
    "rgba(26, 32, 44, 0.7)"
  );
  
  const cardBorder = useColorModeValue(
    "rgba(203, 213, 224, 0.6)",
    "rgba(74, 85, 104, 0.3)"
  );
  
  const cardHighlight = useColorModeValue(
    "0 10px 30px -10px rgba(66, 153, 225, 0.25)",
    "0 10px 30px -10px rgba(99, 179, 237, 0.25)"
  );

  const textColor = useColorModeValue("blue.800", "blue.100");
  const textSecondary = useColorModeValue("gray.600", "gray.400");

  return (
    <VStack 
      spacing={4} 
      align="stretch"
      position="relative"
      animation="fadeIn 0.6s ease-out forwards"
      sx={{
        "@keyframes fadeIn": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        }
      }}
    >
      <Text 
        fontSize="md" 
        fontWeight="semibold" 
        mt={1}
        bgGradient={gradientText}
        bgClip="text"
        letterSpacing="tight"
        position="relative"
        display="inline-block"
        pl={1}
        _after={{
          content: '""',
          position: "absolute",
          bottom: "-2px",
          left: "0",
          width: "50px",
          height: "2px",
          bgGradient: gradientText,
          borderRadius: "full"
        }}
      >
        Contoh:
      </Text>
      
      <Button
        textAlign="left"
        display="block"
        variant="unstyled"
        height="auto"
        py={3.5}
        px={5}
        onClick={() => onButtonClick(0)}
        position="relative"
        borderRadius="xl"
        border="1px solid"
        borderColor={cardBorder}
        bg={cardBg}
        overflow="hidden"
        backdropFilter="blur(10px) saturate(180%)"
        boxShadow="0 5px 15px rgba(0, 0, 0, 0.05)"
        transition="all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        _hover={{
          transform: "translateY(-3px) scale(1.01)",
          boxShadow: cardHighlight,
          borderColor: "blue.200",
          bg: useColorModeValue(
            "rgba(255, 255, 255, 0.85)",
            "rgba(26, 32, 44, 0.85)"
          )
        }}
        _active={{
          transform: "translateY(0)",
          boxShadow: "0 2px 10px rgba(66, 153, 225, 0.15)"
        }}
      >
        {/* Decorative backgrounds */}
        <Box
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          opacity="0.1"
          background="radial-gradient(circle at 20% 20%, rgba(66,153,225,0.8) 0%, transparent 60%)"
          pointerEvents="none"
          transition="all 0.3s ease"
          _groupHover={{
            opacity: "0.15",
            transform: "scale(1.1)"
          }}
        />
        
        <Box
          position="absolute"
          bottom="-20px"
          right="-20px"
          width="100px"
          height="100px"
          opacity="0.05"
          background="radial-gradient(circle, rgba(66,153,225,0.9) 0%, transparent 70%)"
          pointerEvents="none"
          transition="all 0.3s ease"
          animation="float 10s infinite ease-in-out"
          sx={{
            "@keyframes float": {
              "0%, 100%": { transform: "translate(0, 0)" },
              "50%": { transform: "translate(-5px, 5px)" }
            }
          }}
        />
        
        {/* Button content */}
        <HStack spacing={4} align="flex-start">
          <Box
            p={2.5}
            borderRadius="lg"
            bg="rgba(66, 153, 225, 0.15)"
            color="blue.500"
            boxShadow="0 3px 8px rgba(66, 153, 225, 0.12)"
            transition="all 0.3s ease"
            _groupHover={{
              bg: "rgba(66, 153, 225, 0.25)",
              boxShadow: "0 5px 12px rgba(66, 153, 225, 0.2)",
              transform: "translateY(-2px)"
            }}
          >
            <Icon as={FaTwitter} boxSize={5} />
          </Box>
          <Box>
            <Text 
              fontWeight={700} 
              noOfLines={1} 
              color={textColor} 
              fontSize="md"
              pb={0.5}
              transition="all 0.3s ease"
              _groupHover={{
                bgGradient: gradientText,
                bgClip: "text",
              }}
            >
              Post on twitter.com
            </Text>
            <Text fontWeight={400} noOfLines={1} color={textSecondary} fontSize="sm">
              with content &quot;An automated post from weblify.id by
              @NormalComputing!&quot;
            </Text>
          </Box>
        </HStack>
      </Button>
      
      <Button
        textAlign="left"
        display="block"
        variant="unstyled"
        height="auto"
        py={3.5}
        px={5}
        onClick={() => onButtonClick(1)}
        position="relative"
        borderRadius="xl"
        border="1px solid"
        borderColor={cardBorder}
        bg={cardBg}
        overflow="hidden"
        backdropFilter="blur(10px) saturate(180%)"
        boxShadow="0 5px 15px rgba(0, 0, 0, 0.05)"
        transition="all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        _hover={{
          transform: "translateY(-3px) scale(1.01)",
          boxShadow: cardHighlight,
          borderColor: "orange.200",
          bg: useColorModeValue(
            "rgba(255, 255, 255, 0.85)",
            "rgba(26, 32, 44, 0.85)"
          )
        }}
        _active={{
          transform: "translateY(0)",
          boxShadow: "0 2px 10px rgba(245, 158, 11, 0.15)"
        }}
      >
        {/* Decorative backgrounds */}
        <Box
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          opacity="0.1"
          background="radial-gradient(circle at 20% 20%, rgba(245,158,11,0.8) 0%, transparent 60%)"
          pointerEvents="none"
          transition="all 0.3s ease"
          _groupHover={{
            opacity: "0.15",
            transform: "scale(1.1)"
          }}
        />
        
        <Box
          position="absolute"
          bottom="-20px"
          right="-20px"
          width="100px"
          height="100px"
          opacity="0.05"
          background="radial-gradient(circle, rgba(245,158,11,0.9) 0%, transparent 70%)"
          pointerEvents="none"
          transition="all 0.3s ease"
          animation="float 12s infinite ease-in-out reverse"
        />
        
        {/* Button content */}
        <HStack spacing={4} align="flex-start">
          <Box
            p={2.5}
            borderRadius="lg"
            bg="rgba(245, 158, 11, 0.15)"
            color="orange.500"
            boxShadow="0 3px 8px rgba(245, 158, 11, 0.12)"
            transition="all 0.3s ease"
            _groupHover={{
              bg: "rgba(245, 158, 11, 0.25)",
              boxShadow: "0 5px 12px rgba(245, 158, 11, 0.2)",
              transform: "translateY(-2px)"
            }}
          >
            <Icon as={FaAmazon} boxSize={5} />
          </Box>
          <Box>
            <Text 
              fontWeight={700} 
              noOfLines={1} 
              color={textColor} 
              fontSize="md"
              pb={0.5}
              transition="all 0.3s ease"
              _groupHover={{
                bgGradient: "linear(to-r, orange.500, yellow.500)",
                bgClip: "text",
              }}
            >
              Find a book about AI
            </Text>
            <Text fontWeight={400} noOfLines={1} color={textSecondary} fontSize="sm">
              and add a physical copy to cart on Amazon.com
            </Text>
          </Box>
        </HStack>
      </Button>
    </VStack>
  );
};

export default RecommendedTasks;
