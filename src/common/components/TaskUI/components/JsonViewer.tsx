import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  useColorModeValue,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon, CopyIcon } from '@chakra-ui/icons';
import { JsonViewerProps } from '../constants/chatTypes';

/**
 * Komponen untuk menampilkan data JSON dengan format yang menarik dan dapat di-expand/collapse
 */
export const JsonViewer: React.FC<JsonViewerProps> = ({ data, level = 0, isExpanded = true }) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const isNested = typeof data === 'object' && data !== null;
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const keyColor = useColorModeValue('purple.600', 'purple.300');
  const valueColor = useColorModeValue('blue.600', 'blue.300');
  const stringColor = useColorModeValue('green.600', 'green.300');
  const numberColor = useColorModeValue('orange.600', 'orange.300');
  const booleanColor = useColorModeValue('red.600', 'red.300');
  
  const formatValue = (value: any) => {
    if (value === null) return <Text as="span" color={booleanColor}>null</Text>;
    if (value === undefined) return <Text as="span" color={booleanColor}>undefined</Text>;
    
    switch (typeof value) {
      case 'boolean':
        return <Text as="span" color={booleanColor}>{value.toString()}</Text>;
      case 'number':
        return <Text as="span" color={numberColor}>{value}</Text>;
      case 'string':
        return <Text as="span" color={stringColor}>"{value}"</Text>;
      default:
        return <Text as="span">Kompleks</Text>;
    }
  };
  
  // Handle untuk menyalin data ke clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };
  
  if (!isNested) {
    return formatValue(data);
  }
  
  const isArray = Array.isArray(data);
  const isEmpty = isArray ? data.length === 0 : Object.keys(data).length === 0;
  
  // Jika kosong, tampilkan sebagai array atau objek kosong
  if (isEmpty) {
    return (
      <Text as="span" color={keyColor}>
        {isArray ? '[]' : '{}'}
      </Text>
    );
  }
  
  return (
    <Box>
      <HStack spacing={1}>
        <IconButton
          aria-label={expanded ? 'Collapse' : 'Expand'}
          icon={expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          size="xs"
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
        />
        
        <Text fontWeight="medium">
          {isArray ? 'Array' : 'Object'}
          <Text as="span" fontWeight="normal" pl={1}>
            {isArray ? `[${data.length}]` : `{${Object.keys(data).length}}`}
          </Text>
        </Text>
        
        <IconButton
          aria-label="Copy"
          icon={<CopyIcon />}
          size="xs"
          variant="ghost"
          onClick={handleCopy}
        />
      </HStack>
      
      {expanded && (
        <Box 
          pl={4} 
          borderLeft="1px solid" 
          borderColor={borderColor} 
          ml={1}
          mt={1}
        >
          {isArray ? (
            // Render array
            data.map((item: any, index: number) => (
              <Box key={index} mb={1}>
                <Flex alignItems="flex-start">
                  <Text color={keyColor} mr={1}>{index}:</Text>
                  <Box>
                    <JsonViewer data={item} level={level + 1} />
                  </Box>
                </Flex>
              </Box>
            ))
          ) : (
            // Render object
            Object.entries(data).map(([key, value], index) => (
              <Box key={key} mb={1}>
                <Flex alignItems="flex-start">
                  <Text color={keyColor} mr={1}>"{key}":</Text>
                  <Box>
                    <JsonViewer data={value} level={level + 1} />
                  </Box>
                </Flex>
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}; 