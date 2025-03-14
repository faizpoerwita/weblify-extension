import React from "react";
import {
  Avatar,
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  Text,
  useColorModeValue
} from "@chakra-ui/react";
import { FaRobot, FaUser } from "react-icons/fa";
import { ActionStatus, ActionType, ACTION_STATUSES } from "../../utils/actionUtils";
import StatusIndicator from "../StatusIndicator";
import MessageContent from "../MessageContent";

interface ChatMessageProps {
  isUser: boolean;
  content: string;
  status?: ActionStatus;
  metadata?: {
    timestamp?: string;
    action?: ActionType;
    details?: string[];
  };
}

/**
 * Komponen yang menampilkan pesan chat, baik dari user maupun asisten
 */
const ChatMessage: React.FC<ChatMessageProps> = ({ 
  isUser, 
  content, 
  status = ACTION_STATUSES.IDLE, 
  metadata 
}) => {
  const userBg = useColorModeValue("blue.50", "blue.800");
  const aiBg = useColorModeValue("gray.50", "gray.800");
  const userBorderColor = useColorModeValue("blue.200", "blue.700");
  const aiBorderColor = useColorModeValue("gray.200", "gray.700");
  const timeBg = useColorModeValue("gray.100", "gray.700");

  return (
    <Flex 
      direction={isUser ? "row" : "row"} 
      mb={4}
      position="relative"
    >
      <Avatar 
        icon={<Icon as={isUser ? FaUser : FaRobot} fontSize="1.2rem" />}
        bg={isUser ? "blue.500" : "gray.500"}
        color="white"
        size="sm"
        mr={2}
      />
      
      <Box 
        flex="1"
        bg={isUser ? userBg : aiBg}
        borderWidth="1px"
        borderColor={isUser ? userBorderColor : aiBorderColor}
        borderRadius="md"
        p={3}
        pr={4}
        position="relative"
        boxShadow="sm"
      >
        {/* Header dengan username dan timestamp */}
        <HStack mb={1} spacing={2}>
          <Text 
            fontWeight="bold" 
            fontSize="sm"
            color={isUser ? "blue.600" : "gray.600"}
          >
            {isUser ? "Anda" : "weblify.id"}
          </Text>
          
          {metadata?.timestamp && (
            <Badge 
              size="sm" 
              bg={timeBg} 
              color="gray.500"
              fontWeight="normal"
              fontSize="xs"
              borderRadius="full"
              px={2}
            >
              {metadata.timestamp}
            </Badge>
          )}
          
          {status && status !== ACTION_STATUSES.IDLE && (
            <StatusIndicator status={status} action={metadata?.action} />
          )}
        </HStack>
        
        {/* Content */}
        <MessageContent content={content} isUser={isUser} />
      </Box>
    </Flex>
  );
};

export default ChatMessage; 