import React from 'react';
import {
  Box,
  Text,
  useColorModeValue,
  Flex,
  HStack,
  Tooltip,
  VStack,
  Image,
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon, InfoIcon, CloseIcon } from '@chakra-ui/icons';
import { ActionStatus, ActionType, ACTION_STATUSES } from '../constants/actionConstants';
import { UrlData } from '../constants/chatTypes';
import { getStatusColor } from '../utils/statusHelpers';
import { processUrlData } from '../utils/urlHelpers';

interface StatusIndicatorProps {
  status: ActionStatus;
  action?: ActionType;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, action }) => {
  // Fungsi untuk mendapatkan ikon berdasarkan status
  const getStatusIcon = () => {
    switch (status) {
      case ACTION_STATUSES.SUCCESS:
        return <CheckIcon color="green.500" />;
      case ACTION_STATUSES.ERROR:
        return <CloseIcon color="red.500" />;
      case ACTION_STATUSES.WARNING:
        return <WarningIcon color="orange.500" />;
      case ACTION_STATUSES.RUNNING:
      case ACTION_STATUSES.WAITING:
        return <InfoIcon color="blue.500" />;
      default:
        return <InfoIcon color="gray.500" />;
    }
  };

  // Fungsi untuk mendapatkan data URL jika action adalah navigate
  const getUrlData = (): UrlData | null => {
    if (action?.name === 'navigate' && action.args?.url) {
      return processUrlData(action.args.url);
    }
    return null;
  };

  // Dapatkan data URL jika ada
  const urlData = getUrlData();

  // Warna untuk komponen berdasarkan status
  const boxShadowColor = getStatusColor(status, action);
  const backgroundColor = useColorModeValue('white', 'gray.800');
  const statusText = getStatusDisplay(status, action);
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Deteksi rasio layar vertikal
  const isVerticalRatio = window.innerWidth / window.innerHeight <= 0.6;

  // Special case untuk action navigate dengan data URL
  if (urlData && action?.name === 'navigate') {
    return (
      <Box
        borderRadius="md"
        boxShadow={`0 0 0 1px ${boxShadowColor}, 0 1px 3px rgba(0, 0, 0, 0.1)`}
        bg={backgroundColor}
        p={3}
        mb={2}
        maxW="100%"
        position="relative"
      >
        <Flex direction={isVerticalRatio ? "column" : "row"} align={isVerticalRatio ? "flex-start" : "center"}>
          {/* Favicon */}
          <Box 
            mr={isVerticalRatio ? 0 : 3} 
            mb={isVerticalRatio ? 2 : 0}
            minWidth={isVerticalRatio ? "24px" : "16px"}
            height={isVerticalRatio ? "24px" : "16px"}
          >
            <Image 
              src={urlData.favicon} 
              fallbackSrc="https://www.google.com/s2/favicons?domain=example.com&sz=64" 
              alt="Website" 
              boxSize={isVerticalRatio ? "24px" : "16px"}
              borderRadius="sm"
            />
          </Box>
          
          {/* Website info */}
          <VStack 
            align="flex-start" 
            spacing={isVerticalRatio ? 1 : 0.5} 
            flex="1"
            width={isVerticalRatio ? "100%" : "auto"}
          >
            {/* Title with ellipsis */}
            <Tooltip label={urlData.title} placement="top" hasArrow>
              <Text 
                fontWeight="medium" 
                fontSize={isVerticalRatio ? "sm" : "xs"}
                noOfLines={1}
                title={urlData.title}
                width="100%"
              >
                {urlData.title || "Website"}
              </Text>
            </Tooltip>
            
            {/* URL with ellipsis */}
            <Tooltip label={urlData.fullUrl} placement="top" hasArrow>
              <Text 
                fontSize={isVerticalRatio ? "xs" : "2xs"} 
                color="blue.500" 
                noOfLines={1}
                width="100%"
              >
                {isVerticalRatio 
                  ? urlData.domain
                  : (window.innerWidth < 400 
                    ? urlData.domain 
                    : urlData.fullUrl)
                }
              </Text>
            </Tooltip>
          </VStack>
          
          {/* Status indicator */}
          <HStack 
            spacing={1.5} 
            fontSize="2xs" 
            bg={`${boxShadowColor}22`} 
            color={boxShadowColor}
            px={2} 
            py={1} 
            borderRadius="full"
            mt={isVerticalRatio ? 1 : 0}
            ml={isVerticalRatio ? 0 : 2}
            alignSelf={isVerticalRatio ? "flex-start" : "center"}
          >
            <Box>{getStatusIcon()}</Box>
            <Text>{statusText}</Text>
          </HStack>
        </Flex>
      </Box>
    );
  }

  // Default status indicator
  return (
    <HStack spacing={1.5} fontSize="xs" bg={`${boxShadowColor}22`} color={boxShadowColor} px={2} py={1} borderRadius="full">
      <Box>{getStatusIcon()}</Box>
      <Text>{statusText}</Text>
    </HStack>
  );
};

// Fungsi untuk mendapatkan tampilan status
const getStatusDisplay = (status: ActionStatus, action?: ActionType): string => {
  if (!action) {
    switch (status) {
      case ACTION_STATUSES.RUNNING:
        return "PROCESSING";
      case ACTION_STATUSES.SUCCESS:
        return "COMPLETED";
      case ACTION_STATUSES.ERROR:
        return "FAILED";
      case ACTION_STATUSES.WARNING:
        return "WARNING";
      case ACTION_STATUSES.WAITING:
        return "WAITING";
      case ACTION_STATUSES.DEBUG:
        return "DEBUGGING";
      default:
        return "IDLE";
    }
  }

  if (action.name === "navigate") {
    switch (status) {
      case ACTION_STATUSES.RUNNING:
        return "NAVIGASI";
      case ACTION_STATUSES.SUCCESS:
        return "SELESAI";
      case ACTION_STATUSES.ERROR:
        return "GAGAL";
      case ACTION_STATUSES.WARNING:
        return "PERINGATAN";
      case ACTION_STATUSES.WAITING:
        return "MENUNGGU";
      default:
        return "IDLE";
    }
  }

  if (action.name === "click") {
    switch (status) {
      case ACTION_STATUSES.RUNNING:
        return "MENGKLIK";
      case ACTION_STATUSES.SUCCESS:
        return "DIKLIK";
      case ACTION_STATUSES.ERROR:
        return "GAGAL";
      case ACTION_STATUSES.WARNING:
        return "PERINGATAN";
      case ACTION_STATUSES.WAITING:
        return "MENUNGGU";
      default:
        return "IDLE";
    }
  }

  // Default untuk semua tindakan lainnya
  switch (status) {
    case ACTION_STATUSES.RUNNING:
      return "RUNNING";
    case ACTION_STATUSES.SUCCESS:
      return "SUCCESS";
    case ACTION_STATUSES.ERROR:
      return "ERROR";
    case ACTION_STATUSES.WARNING:
      return "WARNING";
    case ACTION_STATUSES.WAITING:
      return "WAITING";
    default:
      return "IDLE";
  }
}; 