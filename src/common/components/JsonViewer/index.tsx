import React, { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";

interface JsonViewerProps {
  data: unknown;
  level?: number;
  isExpanded?: boolean;
}

/**
 * Komponen untuk melihat dan menavigasi data JSON secara interaktif
 */
const JsonViewer: React.FC<JsonViewerProps> = ({ data, level = 0, isExpanded = true }) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const typeColor = useColorModeValue("blue.600", "blue.300");
  const keyColor = useColorModeValue("purple.600", "purple.300");
  const stringColor = useColorModeValue("green.600", "green.300");
  const numberColor = useColorModeValue("orange.600", "orange.300");
  const boolColor = useColorModeValue("red.600", "red.300");
  const nullColor = useColorModeValue("gray.600", "gray.400");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  
  if (data === null) {
    return <Text as="span" color={nullColor}>null</Text>;
  }
  
  if (data === undefined) {
    return <Text as="span" color={nullColor}>undefined</Text>;
  }
  
  if (typeof data === 'boolean') {
    return <Text as="span" color={boolColor}>{data ? 'true' : 'false'}</Text>;
  }
  
  if (typeof data === 'number') {
    return <Text as="span" color={numberColor}>{data}</Text>;
  }
  
  if (typeof data === 'string') {
    // Cek jika string ini adalah URL
    const isUrl = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(data);
    
    if (isUrl) {
      return (
        <Text 
          as="span" 
          color="blue.500" 
          textDecoration="underline" 
          cursor="pointer"
          onClick={() => window.open(data, '_blank')}
        >
          {`"${data}"`}
        </Text>
      );
    }
    
    return <Text as="span" color={stringColor}>{`"${data}"`}</Text>;
  }
  
  // Handling untuk array dan object
  const isArray = Array.isArray(data);
  const isEmptyObject = !isArray && typeof data === 'object' && data !== null && Object.keys(data).length === 0;
  const isEmptyArray = isArray && data.length === 0;
  
  if (isEmptyObject) {
    return <Text as="span">{"{}"}</Text>;
  }
  
  if (isEmptyArray) {
    return <Text as="span">{"[]"}</Text>;
  }
  
  const toggle = () => setExpanded(!expanded);
  
  return (
    <Box>
      <Flex align="center">
        <IconButton
          size="xs"
          icon={expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          variant="ghost"
          onClick={toggle}
          aria-label={expanded ? "Collapse" : "Expand"}
        />
        
        <Text as="span" fontWeight="bold" color={typeColor}>
          {isArray ? 'Array' : 'Object'}
        </Text>
        
        <Text ml={1}>
          {isArray ? `[${data.length}]` : `{${Object.keys(data as object).length}}`}
        </Text>
      </Flex>
      
      {expanded && (
        <Box 
          ml={4} 
          mt={1} 
          pl={2} 
          borderLeftWidth="1px" 
          borderColor={borderColor}
        >
          {isArray && data.map((item: unknown, index: number) => (
            <Box key={index} mb={2}>
              <HStack alignItems="flex-start" spacing={1}>
                <Text color={numberColor} width={8} textAlign="right">{index}:</Text>
                <JsonViewer data={item} level={level + 1} />
              </HStack>
            </Box>
          ))}
          
          {!isArray && Object.entries(data as object).map(([key, value]) => (
            <Box key={key} mb={2}>
              <HStack alignItems="flex-start" spacing={1}>
                <Text color={keyColor} fontWeight="medium">
                  {key}:
                </Text>
                <JsonViewer data={value} level={level + 1} />
              </HStack>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default JsonViewer; 