import React, { useState, useEffect } from 'react';
import { Box, Tooltip, Text, Badge, Flex, useColorModeValue } from '@chakra-ui/react';
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { useAppState } from '../../state/store';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ApiStatusIndicatorProps {
  compact?: boolean;
}

export const ApiStatusIndicator: React.FC<ApiStatusIndicatorProps> = ({ compact = false }) => {
  const [status, setStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const { geminiKey } = useAppState((state) => ({
    geminiKey: state.settings.geminiKey
  }));

  // Latar belakang dan warna berdasarkan mode gelap/terang
  const bgColor = useColorModeValue(
    {
      connected: 'green.50',
      error: 'red.50',
      checking: 'blue.50'
    },
    {
      connected: 'green.900',
      error: 'red.900',
      checking: 'blue.900'
    }
  );

  const textColor = useColorModeValue(
    {
      connected: 'green.700',
      error: 'red.700',
      checking: 'blue.700'
    },
    {
      connected: 'green.200',
      error: 'red.200',
      checking: 'blue.200'
    }
  );

  const borderColor = useColorModeValue(
    {
      connected: 'green.200',
      error: 'red.200',
      checking: 'blue.200'
    },
    {
      connected: 'green.700',
      error: 'red.700',
      checking: 'blue.700'
    }
  );

  // Cek status koneksi API saat komponen dimuat dan saat geminiKey berubah
  useEffect(() => {
    const checkApiConnection = async () => {
      if (!geminiKey) {
        setStatus('error');
        return;
      }

      setStatus('checking');
      
      try {
        // Panggilan test ke API Gemini
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        // Gunakan prompt sederhana untuk menguji koneksi
        const result = await model.generateContent("hello");
        if (result) {
          setStatus('connected');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Error checking API connection:', error);
        setStatus('error');
      }
    };

    checkApiConnection();
  }, [geminiKey]);

  // Status belum diketahui, tampilkan indikator loading
  if (status === 'checking') {
    return (
      <Tooltip label="Memeriksa koneksi ke API Gemini...">
        <Badge 
          borderRadius="full" 
          px={compact ? 1 : 2} 
          py={1}
          bg={bgColor.checking}
          color={textColor.checking}
          borderWidth="1px"
          borderColor={borderColor.checking}
          display="flex" 
          alignItems="center"
          fontSize={compact ? "xs" : "sm"}
          fontWeight="medium"
          boxShadow="sm"
        >
          <Box as={FaInfoCircle} mr={1} />
          {!compact && "Checking API"}
        </Badge>
      </Tooltip>
    );
  }

  // API terhubung
  if (status === 'connected') {
    return (
      <Tooltip label="API Gemini terhubung dan berfungsi dengan baik">
        <Badge 
          borderRadius="full" 
          px={compact ? 1 : 2} 
          py={1}
          bg={bgColor.connected}
          color={textColor.connected}
          borderWidth="1px"
          borderColor={borderColor.connected}
          display="flex" 
          alignItems="center"
          fontSize={compact ? "xs" : "sm"}
          fontWeight="medium"
          boxShadow="sm"
        >
          <Box as={FaCheckCircle} mr={1} />
          {!compact && "API Connected"}
        </Badge>
      </Tooltip>
    );
  }
  
  // API error
  return (
    <Tooltip label="Masalah koneksi ke API Gemini. Coba setel ulang API key atau cek koneksi internet.">
      <Badge 
        borderRadius="full" 
        px={compact ? 1 : 2} 
        py={1}
        bg={bgColor.error}
        color={textColor.error}
        borderWidth="1px"
        borderColor={borderColor.error}
        display="flex" 
        alignItems="center"
        fontSize={compact ? "xs" : "sm"}
        fontWeight="medium"
        boxShadow="sm"
      >
        <Box as={FaExclamationTriangle} mr={1} />
        {!compact && "API Error"}
      </Badge>
    </Tooltip>
  );
};

export default ApiStatusIndicator; 