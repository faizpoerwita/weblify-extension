import React from 'react';
import { Box, Text, Icon, VStack, HStack, Code, useColorModeValue } from '@chakra-ui/react';
import { ActionType, ACTION_NAMES } from '../utils/actionUtils';
import { FaGlobe, FaMousePointer, FaKeyboard, FaArrowsAlt, FaClock, FaCheckCircle, FaSearch, FaFileExport, FaPen, FaCircle } from "react-icons/fa";
import JsonViewerForInvalidJson from '../JsonViewerForInvalidJson';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

/**
 * Komponen untuk menampilkan konten pesan
 */
const MessageContent: React.FC<MessageContentProps> = ({ content, isUser }) => {
  // Fungsi untuk memformat icon tindakan
  const formatActionIcon = (action: any) => {
    if (!action || !action.name) return null;
    
    switch (action.name) {
      case 'navigate':
        return <Icon as={FaGlobe} color="blue.500" boxSize="18px" />;
      case 'click':
        return <Icon as={FaMousePointer} color="orange.500" boxSize="18px" />;
      case 'type':
        return <Icon as={FaKeyboard} color="green.500" boxSize="18px" />;
      case 'scroll':
        return <Icon as={FaArrowsAlt} color="purple.500" boxSize="18px" />;
      case 'wait':
        return <Icon as={FaClock} color="cyan.500" boxSize="18px" />;
      case 'finish':
        return <Icon as={FaCheckCircle} color="green.500" boxSize="18px" />;
      case 'search':
        return <Icon as={FaSearch} color="blue.500" boxSize="18px" />;
      case 'extract':
        return <Icon as={FaFileExport} color="teal.500" boxSize="18px" />;
      case 'fill':
        return <Icon as={FaPen} color="pink.500" boxSize="18px" />;
      default:
        return <Icon as={FaCircle} color="gray.500" boxSize="18px" />;
    }
  };

  // Fungsi untuk memformat judul tindakan
  const formatActionTitle = (action: any) => {
    if (!action || !action.name) return 'Tindakan';
    
    const actionTitles: Record<string, string> = {
      'navigate': 'Navigasi ke Website',
      'click': 'Klik Elemen',
      'type': 'Ketik Teks',
      'scroll': 'Scroll Halaman',
      'wait': 'Tunggu',
      'finish': 'Selesai',
      'search': 'Pencarian',
      'extract': 'Ekstrak Data',
      'fill': 'Isi Form'
    };
    
    return actionTitles[action.name] || action.name;
  };

  // Fungsi untuk memformat deskripsi tindakan
  const formatActionDescription = (action: any) => {
    if (!action || !action.name) return '';
    
    switch (action.name) {
      case 'navigate':
        return action.args?.url 
          ? `Membuka ${action.args.url.substring(0, 50)}${action.args.url.length > 50 ? '...' : ''}` 
          : 'Membuka website';
      case 'click':
        return action.args?.selector 
          ? `Mengklik elemen ${action.args.selector.substring(0, 30)}${action.args.selector.length > 30 ? '...' : ''}` 
          : 'Mengklik elemen';
      case 'type':
        return action.args?.text 
          ? `Mengetik "${action.args.text.substring(0, 30)}${action.args.text.length > 30 ? '...' : ''}"` 
          : 'Mengetik teks';
      case 'scroll':
        return action.args?.direction 
          ? `Menggulir ${action.args.direction === 'down' ? 'ke bawah' : 'ke atas'}` 
          : 'Menggulir halaman';
      case 'wait':
        return action.args?.duration 
          ? `Menunggu selama ${action.args.duration} detik` 
          : 'Menunggu';
      case 'finish':
        return 'Menyelesaikan tugas';
      case 'search':
        return action.args?.text 
          ? `Mencari "${action.args.text.substring(0, 30)}${action.args.text.length > 30 ? '...' : ''}"` 
          : 'Melakukan pencarian';
      case 'extract':
        return action.args?.selector 
          ? `Mengekstrak data dari ${action.args.selector.substring(0, 30)}${action.args.selector.length > 30 ? '...' : ''}` 
          : 'Mengekstrak data';
      case 'fill':
        return (action.args?.selector && action.args?.text) 
          ? `Mengisi ${action.args.selector} dengan "${action.args.text.substring(0, 20)}${action.args.text.length > 20 ? '...' : ''}"` 
          : 'Mengisi form';
      default:
        return 'Melakukan tindakan';
    }
  };

  // Coba parse JSON dari konten
  let jsonContent = null;
  try {
    jsonContent = JSON.parse(content);
  } catch (e) {
    // Bukan JSON valid, tampilkan sebagai teks biasa
  }

  // Jika konten adalah JSON dan memiliki properti action
  if (jsonContent && jsonContent.action) {
    const action = jsonContent.action;
    
    return (
      <Box 
        p={3} 
        borderRadius="md" 
        bg={useColorModeValue("white", "gray.700")}
        boxShadow="sm"
        width="100%"
      >
        <VStack align="stretch" spacing={2}>
          <HStack>
            {formatActionIcon(action)}
            <Text fontWeight="bold" fontSize="md">
              {formatActionTitle(action)}
            </Text>
          </HStack>
          
          <Text fontSize="sm" color={useColorModeValue("gray.600", "gray.300")}>
            {formatActionDescription(action)}
          </Text>
          
          {action.args && Object.keys(action.args).length > 0 && (
            <Box 
              mt={2} 
              p={2} 
              borderRadius="sm" 
              bg={useColorModeValue("gray.50", "gray.800")}
              fontSize="xs"
              fontFamily="monospace"
            >
              <JsonViewerForInvalidJson data={action.args} level={0} isExpanded={true} />
            </Box>
          )}
        </VStack>
      </Box>
    );
  }

  // Tampilkan konten biasa
  return (
    <Box>
      {content.split('\n').map((line, i) => (
        <Text key={i} whiteSpace="pre-wrap" fontSize="sm">
          {line}
        </Text>
      ))}
    </Box>
  );
};

export default MessageContent; 