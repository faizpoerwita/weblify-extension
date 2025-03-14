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
  // Mengkonversi data menjadi format yang bisa ditampilkan
  const stringifyData = (data: any): string => {
    if (typeof data === 'string') {
      return data;
    }
    
    try {
      // Gunakan format yang mempertahankan struktur tapi mudah dibaca
      let formattedData = '';
      
      if (Array.isArray(data)) {
        formattedData = '[\n';
        data.forEach((item, index) => {
          formattedData += `  ${typeof item === 'object' && item !== null ? stringifyData(item) : String(item)}`;
          if (index < data.length - 1) formattedData += ',\n';
        });
        formattedData += '\n]';
      } else if (typeof data === 'object' && data !== null) {
        formattedData = '{\n';
        const keys = Object.keys(data);
        keys.forEach((key, index) => {
          formattedData += `  ${key}: ${typeof data[key] === 'object' && data[key] !== null ? stringifyData(data[key]) : String(data[key])}`;
          if (index < keys.length - 1) formattedData += ',\n';
        });
        formattedData += '\n}';
      } else {
        formattedData = String(data);
      }
      
      return formattedData;
    } catch (e) {
      console.error("Error formatting JSON data:", e);
      return typeof data === 'string' ? data : String(data);
    }
  };
  
  const content = stringifyData(data);
  
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