import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Progress,
  Text,
  Tooltip,
  useColorModeValue
} from "@chakra-ui/react";
import { FaStop } from "react-icons/fa";
import { ActionName } from "../../utils/actionUtils";

interface TaskProgressBarProps {
  isRunning: boolean;
  onStop: () => void;
  currentTask?: string;
  isScrollingDown?: boolean;
  currentAction?: ActionName;
}

/**
 * Komponen yang menampilkan progress bar saat task sedang berjalan
 */
const TaskProgressBar: React.FC<TaskProgressBarProps> = ({ 
  isRunning, 
  onStop, 
  currentTask,
  isScrollingDown = false,
  currentAction
}) => {
  const [progress, setProgress] = useState(0);
  const bg = useColorModeValue("blue.50", "blue.900");
  const progressColor = useColorModeValue("blue.500", "blue.300");
  
  // Reset progress saat isRunning berubah
  useEffect(() => {
    if (isRunning) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 3;
          const newValue = prev + increment;
          return newValue > 95 ? 95 : newValue;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setProgress(100); // Set to complete when not running
    }
  }, [isRunning]);
  
  const getActionText = () => {
    if (!currentAction) return "Memproses...";
    
    switch (currentAction) {
      case 'navigate':
        return "Navigasi ke halaman...";
      case 'click':
        return "Melakukan klik...";
      case 'type':
        return "Mengetik...";
      case 'scroll':
        return isScrollingDown ? "Scroll ke bawah..." : "Scroll ke atas...";
      case 'wait':
        return "Menunggu...";
      case 'finish':
        return "Menyelesaikan tugas...";
      case 'search':
        return "Mencari...";
      case 'extract':
        return "Mengekstrak data...";
      case 'fill':
        return "Mengisi form...";
      default:
        return "Memproses...";
    }
  };
  
  if (!isRunning) return null;
  
  return (
    <Box 
      position="fixed" 
      bottom="0" 
      left="0" 
      right="0" 
      p="3"
      bg={bg}
      zIndex="banner"
      borderTop="1px"
      borderColor="blue.100"
      boxShadow="0 -2px 10px rgba(0, 0, 150, 0.05)"
    >
      <Flex justifyContent="space-between" alignItems="center" mb="2">
        <Text fontWeight="medium" fontSize="sm">
          {getActionText()}
        </Text>
        <HStack>
          <Tooltip label="Berhenti">
            <Button 
              size="sm" 
              colorScheme="red" 
              variant="outline"
              leftIcon={<Icon as={FaStop} />}
              onClick={onStop}
            >
              Berhenti
            </Button>
          </Tooltip>
        </HStack>
      </Flex>
      
      <Progress 
        value={progress} 
        size="sm" 
        colorScheme="blue" 
        borderRadius="full"
        isAnimated
        hasStripe
        sx={{
          '& > div:first-of-type': {
            transitionProperty: 'width',
            transitionDuration: '0.5s',
            background: progressColor
          }
        }}
      />
      
      {currentTask && (
        <Text fontSize="xs" color="gray.500" mt="1">
          {currentTask}
        </Text>
      )}
    </Box>
  );
};

export default TaskProgressBar; 