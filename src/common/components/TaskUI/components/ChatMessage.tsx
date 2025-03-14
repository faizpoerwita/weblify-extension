import React from 'react';
import {
  Box,
  HStack,
  Text,
  Avatar,
  VStack,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChatMessageProps } from '../constants/chatTypes';
import { ActionStatus, ACTION_STATUSES } from '../constants/actionConstants';
import { MessageContent } from './MessageContent';
import { StatusIndicator } from './StatusIndicator';

/**
 * Komponen untuk menampilkan sebuah pesan dalam chat, baik dari user atau asisten
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  isUser, 
  content, 
  status = ACTION_STATUSES.IDLE, 
  metadata 
}) => {
  const bgColor = useColorModeValue(
    isUser ? "gray.100" : "white", 
    isUser ? "gray.700" : "gray.800"
  );
  
  const borderColor = useColorModeValue(
    isUser ? "gray.200" : "gray.100",
    isUser ? "gray.600" : "gray.700"
  );
  
  return (
    <HStack
      spacing={3}
      alignItems="flex-start"
      maxW="100%"
      my={2}
      position="relative"
    >
      {/* Avatar */}
      <Avatar
        name={isUser ? "You" : "W"}
        size="sm"
        bg={isUser ? "gray.400" : "blue.500"}
        color="white"
      />
      
      {/* Message container */}
      <Box
        flex={1}
        p={3}
        borderRadius="lg"
        bg={bgColor}
        border="1px solid"
        borderColor={borderColor}
        position="relative"
        boxShadow="sm"
        maxW="calc(100% - 44px)" // Accounting for avatar + spacing
      >
        {/* Header with timestamp if available */}
        {metadata?.timestamp && (
          <Text fontSize="xs" color="gray.500" mb={1}>
            {metadata.timestamp}
          </Text>
        )}
        
        {/* Message content */}
        <Box>
          <MessageContent content={content} isUser={isUser} />
        </Box>
        
        {/* Status indicator */}
        {!isUser && status !== ACTION_STATUSES.IDLE && (
          <Flex justifyContent="flex-end" mt={2}>
            <StatusIndicator status={status} action={metadata?.action} />
          </Flex>
        )}
      </Box>
    </HStack>
  );
}; 