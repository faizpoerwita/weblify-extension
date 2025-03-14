import React from 'react';
import {
  Box, 
  Text, 
  HStack, 
  IconButton,
  Progress,
  useColorModeValue,
  Portal
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { ActionName } from '../constants/actionConstants';
import { TaskProgressBarProps } from '../constants/chatTypes';

/**
 * Komponen progress bar untuk menampilkan task yang sedang berjalan
 */
export const TaskProgressBar: React.FC<TaskProgressBarProps> = ({ 
  isRunning, 
  onStop, 
  currentTask,
  isScrollingDown = false,
  currentAction
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  
  // Fungsi untuk mendapatkan teks aksi yang sesuai
  const getActionText = () => {
    if (!currentAction) return "";
    
    switch(currentAction) {
      case 'navigate':
        return 'Navigating to a website';
      case 'click':
        return 'Clicking an element';
      case 'type':
        return 'Typing text';
      case 'scroll':
        return 'Scrolling the page';
      case 'wait':
        return 'Waiting';
      case 'extract':
        return 'Extracting information';
      case 'search':
        return 'Searching the page';
      case 'fill':
        return 'Filling a form';
      default:
        return 'Processing';
    }
  };

  if (!isRunning) return null;

  // Hide progress bar when scrolling down
  if (isScrollingDown) return null;

  return (
    <Portal>
      <Box
        position="fixed"
        left="50%"
        transform="translateX(-50%) scale(1.05)"
        top="16px"
        zIndex={100000}
        bg={bgColor}
        borderRadius="xl"
        boxShadow="0 4px 12px rgba(0, 100, 255, 0.15)"
        border={`1px solid ${borderColor}`}
        p={4}
        minW="280px"
        maxW="700px"
        width="90%"
        animation="task-notification-appear 0.3s ease-out forwards"
        backdropFilter="blur(10px)"
      >
        <HStack spacing={4} mb={2}>
          <Text fontWeight="medium" fontSize="sm" flex="1">
            {currentTask || 'Executing Task...'}
          </Text>
          <IconButton
            size="xs"
            icon={<CloseIcon />}
            aria-label="Stop Task"
            variant="ghost"
            colorScheme="red"
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
          />
        </HStack>
        
        <Progress 
          size="xs" 
          isIndeterminate 
          mb={2}
          borderRadius="full"
          colorScheme="blue"
        />
        
        {currentAction && (
          <Text fontSize="xs" color="gray.500">
            {getActionText()}
          </Text>
        )}
      </Box>
    </Portal>
  );
}; 