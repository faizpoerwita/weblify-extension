import React from 'react';
import { Box, Text, Flex, Image, VStack, HStack, useBreakpointValue, Tooltip } from '@chakra-ui/react';
import { ActionStatus, ActionType, ACTION_NAMES, getStatusDisplay } from '../utils/actionUtils';
import { UrlData, processUrlData } from '../utils/urlUtils';
import { getStatusColorValue, isVerticalRatio, getTextDisplayFormat } from '../utils/uiUtils';
import { formatUrl } from '../utils/urlUtils';

interface StatusIndicatorProps {
  status: ActionStatus;
  action?: ActionType;
}

/**
 * Komponen StatusIndicator yang menampilkan status dari tindakan
 */
const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, action }) => {
  // Mendapatkan data URL jika tindakan adalah navigasi
  const getUrlData = (): UrlData | null => {
    if (action?.name === ACTION_NAMES.NAVIGATE && action?.args?.url) {
      try {
        return processUrlData(action.args.url);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Mendapatkan nilai warna status
  const getStatusColorValue = (stat: ActionStatus, act?: ActionType): string => {
    // Warna untuk action navigate
    if (act?.name === ACTION_NAMES.NAVIGATE) {
      switch (stat) {
        case 'running':
          return '#63B3ED'; // blue.400
        case 'success':
          return '#48BB78'; // green.400
        case 'error':
          return '#E53E3E'; // red.500
        case 'warning':
          return '#ED8936'; // orange.400
        default:
          return '#A0AEC0'; // gray.400
      }
    }

    // Warna untuk action lainnya
    switch (stat) {
      case 'running':
        return '#63B3ED'; // blue.400
      case 'success':
        return '#48BB78'; // green.400
      case 'error':
        return '#E53E3E'; // red.500
      case 'warning':
        return '#ED8936'; // orange.400
      case 'finish':
        return '#B794F4'; // purple.400
      default:
        return '#A0AEC0'; // gray.400
    }
  };

  // Mendapatkan ikon status
  const getStatusIcon = () => {
    // Jika statusnya navigasi, tampilkan ikon khusus navigasi
    if (action?.name === ACTION_NAMES.NAVIGATE && status !== 'error') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="10 8 16 12 10 16 10 8"></polygon>
        </svg>
      );
    }

    // Ikon status umum
    switch (status) {
      case 'success':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01M12 3l9 16H3L12 3z"/>
          </svg>
        );
      case 'running':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
        );
    }
  };

  // Deteksi jika layar dalam rasio vertikal
  const vertical = isVerticalRatio();
  
  // Data URL untuk action navigate
  const urlData = getUrlData();
  
  // Warna yang akan digunakan
  const boxShadowColor = getStatusColorValue(status, action);
  
  // Tentukan format tampilan URL berdasarkan lebar layar
  const urlDisplayFormat = useBreakpointValue({ 
    base: 'short',
    sm: 'medium',
    md: 'full'
  });

  // Jika action adalah navigasi dan ada URL data
  if (action?.name === ACTION_NAMES.NAVIGATE && urlData) {
    return (
      <Box
        padding="2px"
        borderRadius="md"
        width="100%"
        boxShadow={`0 0 0 1px ${boxShadowColor}`}
        bg={`${boxShadowColor}10`}
        overflow="hidden"
      >
        <Flex 
          direction={vertical ? "column" : "row"} 
          align="center" 
          p={2}
          bg={`${boxShadowColor}05`}
        >
          {/* Favicon Website */}
          <Box 
            minWidth={vertical ? "24px" : "32px"}
            height={vertical ? "24px" : "32px"}
            mr={vertical ? 0 : 2}
            mb={vertical ? 1 : 0}
          >
            <Image 
              src={urlData.favicon} 
              fallbackSrc="https://via.placeholder.com/32?text=W"
              alt={urlData.title}
              borderRadius="md"
              boxSize={vertical ? "24px" : "32px"}
              objectFit="cover"
            />
          </Box>
          
          {/* Informasi Website */}
          <VStack 
            align={vertical ? "center" : "flex-start"} 
            spacing={0} 
            flex="1"
            width={vertical ? "100%" : undefined}
          >
            {/* Judul Website */}
            <Tooltip label={action.args?.title || urlData.title}>
              <Text 
                fontWeight="medium" 
                fontSize={vertical ? "sm" : "md"}
                noOfLines={1}
                width="100%"
                textAlign={vertical ? "center" : "left"}
              >
                {getTextDisplayFormat(action.args?.title || urlData.title, 30, vertical)}
              </Text>
            </Tooltip>
            
            {/* URL Website */}
            <Tooltip label={urlData.fullUrl}>
              <Text 
                fontSize={vertical ? "xs" : "sm"} 
                color="gray.600"
                noOfLines={1}
                width="100%"
                textAlign={vertical ? "center" : "left"}
              >
                {formatUrl(urlData.fullUrl, vertical ? 'short' : urlDisplayFormat as any)}
              </Text>
            </Tooltip>
          </VStack>
          
          {/* Status Indikator */}
          <HStack 
            spacing={1} 
            ml={vertical ? 0 : 2}
            mt={vertical ? 1 : 0}
            px={2}
            py={1}
            borderRadius="md"
            bg={`${boxShadowColor}15`}
            color={boxShadowColor}
          >
            <Box>{getStatusIcon()}</Box>
            <Text 
              fontSize="xs" 
              fontWeight="bold"
              color={boxShadowColor}
            >
              {getStatusDisplay(status, action)}
            </Text>
          </HStack>
        </Flex>
      </Box>
    );
  }
  
  // Default status indicator untuk action non-navigasi
  return (
    <HStack 
      spacing={1}
      px={2}
      py={1}
      borderRadius="md"
      bg={`${boxShadowColor}15`}
      color={boxShadowColor}
      display="inline-flex"
      verticalAlign="middle"
    >
      <Box>{getStatusIcon()}</Box>
      <Text 
        fontSize="xs" 
        fontWeight="bold"
        color={boxShadowColor}
      >
        {getStatusDisplay(status, action)}
      </Text>
    </HStack>
  );
};

export default StatusIndicator; 