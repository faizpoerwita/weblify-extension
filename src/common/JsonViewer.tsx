import React from "react";
import {
  Box,
  Text,
  HStack,
  VStack,
  useColorModeValue,
  useColorMode,
} from "@chakra-ui/react";

interface JsonViewerProps {
  data: any;
  level?: number;
  isExpanded?: boolean;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data, level = 0, isExpanded = true }) => {
  const [expanded, setExpanded] = React.useState(isExpanded);
  const indent = React.useMemo(() => level * 20, [level]);
  const colorMode = useColorMode().colorMode;
  const isDark = colorMode === "dark";

  // Warna berbasis mode tema
  const colors = {
    string: useColorModeValue("green.600", "green.300"),
    number: useColorModeValue("blue.600", "blue.300"),
    boolean: useColorModeValue("purple.600", "purple.300"),
    null: useColorModeValue("red.500", "red.300"),
    key: useColorModeValue("blue.600", "blue.300"),
    bracket: useColorModeValue("gray.700", "gray.300"),
    background: useColorModeValue("gray.50", "gray.700"),
    hoverBg: useColorModeValue("gray.100", "gray.600"),
  };

  if (typeof data !== 'object' || data === null) {
    // Visualisasi nilai primitif
    return (
      <Text 
        as="span" 
        color={
          typeof data === 'string' ? colors.string :
          typeof data === 'number' ? colors.number :
          typeof data === 'boolean' ? colors.boolean :
          data === null ? colors.null : 'gray.600'
        }
        fontFamily="inherit"
        fontSize="sm"
        borderRadius="sm"
        px={typeof data === 'string' ? 1 : 0}
        bg={typeof data === 'string' ? 'whiteAlpha.300' : 'transparent'}
      >
        {data === null ? 'null' : 
         typeof data === 'string' ? data : 
         String(data)}
      </Text>
    );
  }

  const isArray = Array.isArray(data);
  const isEmpty = Object.keys(data).length === 0;

  if (isEmpty) {
    return (
      <Text as="span" color={colors.bracket} fontFamily="inherit" fontSize="sm">
        {isArray ? '[ ]' : '{ }'}
      </Text>
    );
  }

  const itemCount = Object.keys(data).length;

  return (
    <Box pl={indent}>
      <HStack 
        spacing={1} 
        onClick={() => setExpanded(!expanded)} 
        cursor="pointer" 
        mb={1}
        borderRadius="md"
        p={1}
        _hover={{ bg: colors.hoverBg }}
        transition="background 0.2s"
      >
        <Box 
          transform={expanded ? 'rotate(90deg)' : 'rotate(0deg)'}
          transition="transform 0.2s"
          color={useColorModeValue("gray.600", "gray.400")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </Box>
        <Text fontFamily="inherit" color={colors.bracket} fontSize="sm">
          {isArray ? '[' : '{'}
        </Text>
        {!expanded && (
          <Text fontFamily="inherit" color="gray.500" fontSize="xs" ml={1} fontStyle="italic">
            {isArray ? `Array(${itemCount})` : `${itemCount} properti`}
          </Text>
        )}
      </HStack>
      
      {expanded && (
        <VStack align="stretch" spacing={1} 
          animation="fadeIn 0.2s ease-out"
          sx={{
            "@keyframes fadeIn": {
              "0%": { opacity: 0, transform: "translateY(-5px)" },
              "100%": { opacity: 1, transform: "translateY(0)" }
            }
          }}
        >
          {Object.entries(data).map(([key, value], index) => (
            <Box key={key} 
              borderLeft="1px solid" 
              borderColor="gray.200"
              pl={2}
              _hover={{ borderColor: "blue.200" }}
              transition="all 0.2s"
            >
              <HStack spacing={2} wrap="nowrap">
                <Text color={colors.key} fontFamily="inherit" fontSize="sm" fontWeight="medium">
                  {isArray ? 
                    <Box as="span" px={1} fontSize="xs" bg={useColorModeValue("gray.100", "gray.600")} borderRadius="sm" mr={1}>
                      {key}
                    </Box> : 
                    key
                  }
                </Text>
                <JsonViewer data={value} level={level + 1} />
                {index < Object.entries(data).length - 1 && !isArray && (
                  <Text color="gray.400" fontSize="sm">,</Text>
                )}
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
      
      <Text fontFamily="inherit" color={colors.bracket} fontSize="sm" pl={expanded ? indent : 0}>
        {isArray ? ']' : '}'}
      </Text>
    </Box>
  );
};

export default JsonViewer; 