import React from "react";
import {
  Box,
  Text,
  HStack,
  useColorModeValue,
} from "@chakra-ui/react";

interface JsonViewerForInvalidJsonProps {
  data: any;
  level?: number;
  isExpanded?: boolean;
}

/**
 * Komponen untuk menampilkan JSON yang tidak valid dengan format yang lebih visual
 * dan konsisten dengan JsonViewer
 */
const JsonViewerForInvalidJson: React.FC<JsonViewerForInvalidJsonProps> = ({ data, level = 0, isExpanded = true }) => {
  // Convert data to string if it's not already a string
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  
  return (
    <Box>
      {content.split('\n').map((line, lineIdx) => (
        <Box key={lineIdx} mb={1}>
          {/* Format baris yang terlihat seperti pasangan key-value */}
          {line.includes(':') ? (
            <HStack spacing={2} align="flex-start">
              <Text 
                color="blue.600" 
                fontWeight="medium"
                fontSize="sm"
                fontFamily="inherit"
              >
                {line.split(':')[0].trim()}
              </Text>
              <Text 
                color="gray.700" 
                fontSize="sm"
                fontFamily="inherit"
              >
                {line.split(':').slice(1).join(':').trim()}
              </Text>
            </HStack>
          ) : (
            // Format baris lainnya seperti kurung kurawal, kurung siku, dll
            <Text 
              color={
                line.trim() === '{' || line.trim() === '}' || 
                line.trim() === '[' || line.trim() === ']' ? 
                "gray.500" : "gray.700"
              }
              fontWeight={
                line.trim() === '{' || line.trim() === '}' || 
                line.trim() === '[' || line.trim() === ']' ? 
                "bold" : "normal"
              }
              fontSize="sm"
              fontFamily="inherit"
            >
              {line}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default JsonViewerForInvalidJson; 