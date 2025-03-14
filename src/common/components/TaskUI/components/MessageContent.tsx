import React from 'react';
import {
  Box,
  Text,
  Code,
  chakra,
  Flex,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { 
  FaGlobe, 
  FaMousePointer, 
  FaKeyboard, 
  FaScroll, 
  FaClock, 
  FaCheckCircle, 
  FaSearch, 
  FaTable, 
  FaWpforms 
} from 'react-icons/fa';
import { ActionType } from '../constants/actionConstants';
import { JsonViewer } from './JsonViewer';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

// Interface untuk komponen RenderActionComponent
interface RenderActionComponentProps {
  jsonData: any;
}

/**
 * Komponen untuk menampilkan konten pesan dengan format khusus
 */
export const MessageContent: React.FC<MessageContentProps> = ({ content, isUser }) => {
  // Jika pesan dari pengguna, tampilkan langsung
  if (isUser) {
    return <Text whiteSpace="pre-wrap">{content}</Text>;
  }

  // Format konten pesan AI dengan markdown sederhana dan deteksi JSON
  // Proses json blok yang ada dalam markdown atau plain json
  const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
  const codeBlockRegex = /```(?:json)?\s*({(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})\s*```/g;
  
  const matchCodeBlocks = Array.from(content.matchAll(codeBlockRegex));
  
  // Jika ada json dalam code block, ekstrak dan tampilkan
  if (matchCodeBlocks.length > 0) {
    const parts = content.split(codeBlockRegex);
    
    return (
      <Box>
        {parts.map((part, index) => {
          // Jika index ganjil, ini adalah json
          if (index % 2 === 1) {
            try {
              const jsonData = JSON.parse(part);
              return (
                <Box key={index} my={2}>
                  <RenderActionComponent jsonData={jsonData} />
                </Box>
              );
            } catch (e) {
              return (
                <Code key={index} p={2} borderRadius="md" display="block" whiteSpace="pre-wrap" my={2}>
                  {part}
                </Code>
              );
            }
          }
          
          return part ? <Text key={index} whiteSpace="pre-wrap">{part}</Text> : null;
        })}
      </Box>
    );
  }
  
  // Jika tidak ada code block, cari JSON dalam plain text
  const matchJson = content.match(jsonRegex);
  if (matchJson) {
    for (const potentialJson of matchJson) {
      try {
        const jsonData = JSON.parse(potentialJson);
        
        // Jika ini adalah JSON yang berisi thought atau action, gunakan rendering khusus
        if (
          (typeof jsonData === 'object' && jsonData !== null) && 
          ('thought' in jsonData || 'action' in jsonData)
        ) {
          const parts = content.split(potentialJson);
          
          return (
            <Box>
              {parts[0] && <Text whiteSpace="pre-wrap">{parts[0]}</Text>}
              <RenderActionComponent jsonData={jsonData} />
              {parts[1] && <Text whiteSpace="pre-wrap">{parts[1]}</Text>}
            </Box>
          );
        }
      } catch (e) {
        // Bukan JSON valid, lewati
      }
    }
  }
  
  // Jika tidak ada JSON khusus, tampilkan sebagai teks biasa
  return <Text whiteSpace="pre-wrap">{content}</Text>;
};

/**
 * Komponen untuk render aksi dari JSON
 */
const RenderActionComponent: React.FC<RenderActionComponentProps> = ({ jsonData }) => {
  const bgThought = useColorModeValue("gray.50", "gray.700");
  const bgAction = useColorModeValue("blue.50", "blue.900");
  const borderThought = useColorModeValue("gray.200", "gray.600");
  const borderAction = useColorModeValue("blue.200", "blue.700");
  
  return (
    <Box>
      {jsonData.thought && (
        <Box 
          p={3} 
          bg={bgThought} 
          border="1px solid"
          borderColor={borderThought}
          borderRadius="md"
          mb={2}
        >
          <Text fontWeight="medium" fontSize="sm" mb={1}>Pemikiran AI:</Text>
          <Text fontSize="sm">{jsonData.thought}</Text>
        </Box>
      )}
      
      {jsonData.action && (
        <Box 
          p={3} 
          bg={bgAction} 
          border="1px solid"
          borderColor={borderAction}
          borderRadius="md"
        >
          <Text fontWeight="medium" fontSize="sm" mb={1}>Tindakan:</Text>
          <HStack spacing={2} mb={1}>
            <Box>
              {formatActionIcon(jsonData.action)}
            </Box>
            <Text fontWeight="medium" fontSize="sm">
              {formatActionTitle(jsonData.action)}
            </Text>
          </HStack>
          
          <Text fontSize="sm">
            {formatActionDescription(jsonData.action)}
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Format icon untuk aksi
 */
const formatActionIcon = (action: any) => {
  if (!action || !action.name) return null;
  
  switch (action.name.toLowerCase()) {
    case 'navigate':
      return <FaGlobe />;
    case 'click':
      return <FaMousePointer />;
    case 'type':
      return <FaKeyboard />;
    case 'scroll':
      return <FaScroll />;
    case 'wait':
      return <FaClock />;
    case 'finish':
      return <FaCheckCircle />;
    case 'search':
      return <FaSearch />;
    case 'extract':
      return <FaTable />;
    case 'fill':
      return <FaWpforms />;
    default:
      return null;
  }
};

/**
 * Format judul untuk aksi
 */
const formatActionTitle = (action: any) => {
  if (!action || !action.name) return "Tindakan Tidak Diketahui";
  
  switch (action.name.toLowerCase()) {
    case 'navigate':
      return "Navigasi ke Website";
    case 'click':
      return "Klik Elemen";
    case 'type':
      return "Ketik Teks";
    case 'scroll':
      return "Scroll Halaman";
    case 'wait':
      return "Tunggu";
    case 'finish':
      return "Selesai";
    case 'search':
      return "Cari di Halaman";
    case 'extract':
      return "Ekstrak Informasi";
    case 'fill':
      return "Isi Formulir";
    default:
      return action.name;
  }
};

/**
 * Format deskripsi untuk aksi
 */
const formatActionDescription = (action: any) => {
  if (!action || !action.name) return "";
  const args = action.args || {};
  
  switch (action.name.toLowerCase()) {
    case 'navigate':
      return `Membuka URL: ${args.url}`;
    case 'click':
      return `Mengklik elemen: ${args.selector || 'tidak ada selector'}`;
    case 'type':
      return `Mengetik: "${args.text || ''}" ${args.selector ? 'pada ' + args.selector : ''}`;
    case 'scroll':
      return `Menggulir ke ${args.direction === 'up' ? 'atas' : 'bawah'}`;
    case 'wait':
      return `Menunggu selama ${args.duration || 1} detik`;
    case 'finish':
      return args.message || "Tindakan telah selesai";
    case 'search':
      return `Mencari: "${args.text || ''}"`;
    case 'extract':
      return `Mengekstrak data dari halaman`;
    case 'fill':
      return `Mengisi formulir: ${args.selector || 'tidak ada selector'}`;
    default:
      return JSON.stringify(args);
  }
}; 