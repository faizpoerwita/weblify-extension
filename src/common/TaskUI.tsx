import React, { useCallback, useRef, useEffect, useState, useMemo } from "react";
import {
  Button,
  Box,
  HStack,
  Spacer,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  VStack,
  Text,
  Flex,
  Code,
  Progress,
  IconButton,
  Tooltip,
  Portal,
  useColorMode,
  useColorModeValue,
  Image,
  UnorderedList,
  ListItem,
  Stack,
  useBreakpointValue,
  Icon,
} from "@chakra-ui/react";
import { debugMode } from "../constants";
import { useAppState } from "../state/store";
import RunTaskButton from "./RunTaskButton";
import VoiceButton from "./VoiceButton";
import TaskHistory from "./TaskHistory";
import TaskStatus from "./TaskStatus";
import RecommendedTasks from "./RecommendedTasks";
import AutosizeTextarea from "./AutosizeTextarea";
import type { TaskHistoryEntry as ImportedTaskHistoryEntry } from "../state/currentTask";
import { css, Global } from "@emotion/react";
import JsonViewerForInvalidJson from "./JsonViewerForInvalidJson";
import { FaBrain, FaPlayCircle, FaVolumeUp, FaGlobe, FaMousePointer, FaKeyboard, FaArrowsAlt, FaClock, FaCheckCircle, FaSearch, FaFileExport, FaPen, FaCircle } from "react-icons/fa";

// Gradient dan warna yang konsisten dengan App.tsx
const gradientColors = {
  light: {
    primary: "linear-gradient(165deg, rgba(230,245,255,1) 0%, rgba(179,229,252,1) 35%, rgba(120,190,240,1) 70%, rgba(80,160,230,1) 100%)", 
    secondary: "linear-gradient(135deg, rgba(220,240,255,1) 0%, rgba(180,225,250,1) 50%, rgba(140,205,245,1) 100%)",
    accent: "radial-gradient(circle, rgba(80,160,230,0.3) 0%, transparent 70%)",
    accentAlt: "radial-gradient(circle, rgba(60,140,220,0.3) 0%, transparent 70%)",
    card: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(240,250,255,0.85) 100%)"
  }
};

const injectContentScript = async () => {
  const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
  if (!tab || !tab.id) {
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["src/pages/contentInjected/index.js"],
    world: "MAIN",
  });
};

function ActionExecutor() {
  const state = useAppState((state) => ({
    attachDebugger: state.currentTask.actions.attachDebugger,
    detachDegugger: state.currentTask.actions.detachDebugger,
    performActionString: state.currentTask.actions.performActionString,
    prepareLabels: state.currentTask.actions.prepareLabels,
    showImagePrompt: state.currentTask.actions.showImagePrompt,
  }));
  return (
    <Box mt={4}>
      <HStack
        columnGap="0.5rem"
        rowGap="0.5rem"
        fontSize="md"
        borderTop="1px dashed gray"
        py="3"
        shouldWrapChildren
        wrap="wrap"
      >
        <Button onClick={state.attachDebugger}>Attach</Button>
        <Button onClick={state.prepareLabels}>Prepare</Button>
        <Button onClick={state.showImagePrompt}>Show Image</Button>
        <Button
          onClick={() => {
            injectContentScript();
          }}
        >
          Inject
        </Button>
      </HStack>
    </Box>
  );
}

const ACTION_STATUSES = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  FINISH: 'finish'
} as const;

const ACTION_NAMES = {
  NAVIGATE: 'navigate',
  CLICK: 'click',
  TYPE: 'type',
  SCROLL: 'scroll',
  WAIT: 'wait',
  FINISH: 'finish',
  SEARCH: 'search',
  EXTRACT: 'extract',
  FILL: 'fill'
} as const;

const OPERATION_NAMES = {
  CLICK: 'click',
  SET_VALUE: 'setValue',
  SET_VALUE_AND_ENTER: 'setValueAndEnter',
  NAVIGATE: 'navigate',
  SCROLL: 'scroll',
  WAIT: 'wait',
  FAIL: 'fail',
  PROCESSING: 'processing'
} as const;

type ActionStatus = typeof ACTION_STATUSES[keyof typeof ACTION_STATUSES];
type ActionName = typeof ACTION_NAMES[keyof typeof ACTION_NAMES];
type OperationName = typeof OPERATION_NAMES[keyof typeof OPERATION_NAMES];

type ActionOperation = {
  name: OperationName | "finish";
  args?: Record<string, any>;
  description?: string;
};

interface ActionType {
  name: ActionName;
  args?: {
    url?: string;
    selector?: string;
    text?: string;
    duration?: number;
    direction?: 'up' | 'down';
    success?: boolean;
    error?: string;
    result?: string;
    details?: string[];
    message?: string;
    title?: string; // Tambahkan properti title untuk menyimpan judul website
  };
  status?: ActionStatus;
}

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

interface DisplayTaskHistoryEntry {
  type: "user" | "assistant";
  message: string;
  status: ActionStatus;
  metadata: {
    timestamp: string;
    action?: ActionName;
    details?: string[];
  };
  isNewGroup?: boolean;
  isLastInGroup?: boolean;
}

interface BaseTaskHistoryEntry {
  prompt?: string;
  response?: string;
  action?: {
    operation: ActionOperation;
  };
}

interface TaskHistoryEntryType extends Omit<BaseTaskHistoryEntry, 'action'> {
  action?: {
    operation: ActionOperation;
    status?: string;
    name: string;
    args?: Record<string, any>;
  };
}

const formatUserMessage = (content: string): string => {
  const cleaners = [
    // Hapus prefix dan timestamp
    [/^The user requests the following task:\s*/i, ''],
    [/Current time:.*$/m, ''],
    [/You have already taken the following actions:[\s\S]*?(?=\n\n|$)/, ''],
    
    // Hapus informasi teknis
    [/Current URL:.*$/m, ''],
    [/Current page scrolling position:.*$/m, ''],
    [/Use the following data as a reference[\s\S]*?(?=\n\n|$)/, ''],
    [/uid = \d+[\s\S]*?(?=(\n\n|\n===|$))/g, ''],
    [/===+/g, ''],
    [/This textarea currently has focus:[\s\S]*?(?=\n\n|$)/, ''],
    
    // Hapus format JSON dan thought/action
    [/Thought:.*$/m, ''],
    [/Action:.*$/m, ''],
    [/\{[\s\S]*?\}/g, ''],
    
    // Hapus whitespace berlebih
    [/\n{2,}/g, '\n']
  ];

  const cleanedContent = cleaners.reduce(
    (text, [pattern, replacement]) => text.replace(pattern as RegExp, replacement as string),
    content
  );

  return cleanedContent
    .split('\n')
    .filter(line => line.trim() && !line.match(/^[=\s-]+$/))
    .join('\n')
    .trim()
    .replace(/^[a-z]/, letter => letter.toUpperCase());
};

const formatAIResponse = (content: string): string => {
  try {
    const parsed = JSON.parse(content);
    
    if (!parsed.thought) {
      return parsed.message || content;
    }

    let message = parsed.thought
      .replace(/^(The user wants to|I will|I need to)\s*/, '')
      .trim();

    if (!parsed.action) {
      return message;
    }

    const actionFormatters = {
      navigate: (args: any) => {
        if (!args?.url) return message;
        try {
          const urlData = processUrlData(args.url);
          if (urlData) {
            // Format pesan berdasarkan tipe konten
            if (urlData.searchQuery) {
              return `Mencari "${urlData.searchQuery}" di ${urlData.title}`;
            }
            
            switch (urlData.contentType) {
              case 'search':
                return `Membuka pencarian di ${urlData.title}`;
              case 'product':
                return `Melihat produk di ${urlData.title}`;
              case 'category':
                return `Menjelajahi kategori di ${urlData.title}`;
              case 'video':
                return `Menonton video di ${urlData.title}`;
              case 'channel':
                return `Mengunjungi channel di ${urlData.title}`;
              case 'article':
                return `Membaca artikel di ${urlData.title}`;
              default:
                return `Membuka ${urlData.title}`;
            }
          }
          
          // Fallback ke format URL sederhana
          const url = new URL(args.url);
          return `Membuka ${url.hostname.replace('www.', '')}`;
        } catch {
          return `Membuka ${args.url}`;
        }
      },
      
      click: (args: any) => {
        if (args?.selector) {
          const cleanSelector = args.selector.replace(/[.#]/, '');
          return `Mengklik elemen ${cleanSelector}`;
        }
        if (args?.text) return `Mengklik "${args.text}"`;
        return message;
      },
      
      type: (args: any) => {
        if (!args?.text) return message;
        if (args.text.length > 50) {
          return `Mengetik teks panjang ke dalam formulir`;
        }
        return `Mengetik "${args.text}"`;
      },
      
      scroll: (args: any) => {
        if (args?.direction) return `Menggulir halaman ke ${args.direction}`;
        return 'Menggulir halaman';
      },
      
      wait: (args: any) => {
        if (!args?.duration) return 'Menunggu sebentar';
        const seconds = Math.round(args.duration / 1000);
        return `Menunggu ${seconds} detik`;
      },
      
      finish: (args: any) => {
        if (args?.success) {
          if (args.result) return `Berhasil: ${args.result}`;
          return 'Tugas berhasil diselesaikan';
        }
        if (args?.error) return `Gagal: ${args.error}`;
        return 'Tugas selesai';
      },

      search: (args: any) => {
        if (args?.text) return `Mencari "${args.text}"`;
        return 'Melakukan pencarian';
      }
    };

    const formatter = actionFormatters[parsed.action.name as keyof typeof actionFormatters];
    return formatter ? formatter(parsed.action.args) : message;
  } catch {
    return content
      .replace(/```[a-z]*\n|\n```/g, '')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n/g, ' ')
      .trim();
  }
};

const actionTitles: Record<ActionName, string> = {
  [ACTION_NAMES.NAVIGATE]: 'Navigasi Web',
  [ACTION_NAMES.CLICK]: 'Klik',
  [ACTION_NAMES.TYPE]: 'Ketik',
  [ACTION_NAMES.SCROLL]: 'Scroll',
  [ACTION_NAMES.WAIT]: 'Tunggu',
  [ACTION_NAMES.FINISH]: 'Selesai',
  [ACTION_NAMES.SEARCH]: 'Cari',
  [ACTION_NAMES.EXTRACT]: 'Ekstrak',
  [ACTION_NAMES.FILL]: 'Isi'
};

const formatActionDisplay = (action: ActionType): { title: string; description: string } => {
  let title = "Tindakan";
  let description = "";

  const { name, args } = action;

  const actionTitles: Record<string, string> = {
    navigate: "Navigasi",
    click: "Klik",
    extract: "Ekstrak",
    scroll: "Gulir",
    wait: "Tunggu",
    fill: "Isi"
  };

  title = actionTitles[name] || name;

  switch (name) {
    case "navigate":
      if (args?.url) {
        // Jika ada title yang disimpan di args, gunakan itu
        description = args.title ? 
          `${args.url} (${args.title})` : 
          args.url;
      }
      break;
    case "click":
      if (args?.selector) {
        description = `pada elemen ${args.selector}`;
      }
      break;
    case ACTION_NAMES.EXTRACT:
      if (args?.selector) {
        description = `informasi dari ${args.selector}`;
      }
      break;
    case "scroll":
      if (args?.direction) {
        description = `${args.direction === "up" ? "ke atas" : "ke bawah"}`;
      }
      break;
    case "wait":
      if (args?.duration) {
        description = `selama ${args.duration} detik`;
      }
      break;
    case ACTION_NAMES.FILL:
      if (args?.selector && args?.text) {
        description = `${args.selector} dengan '${args.text}'`;
      }
      break;
    default:
      // Jika ada args yang diberikan tetapi tidak termasuk dalam case di atas
      if (args) {
        description = Object.entries(args)
          .filter(([key, value]) => value !== undefined && key !== 'success' && key !== 'error')
          .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
          .join(", ");
      }
  }

  return { title, description };
};

const formatActionName = (name: string): string => {
  const actionIcons: Record<string, string> = {
    navigate: '→',
    click: '•',
    type: '✎',
    search: '🔍',
    scroll: '↕',
    wait: '◔',
    finish: '✓',
    default: '•'
  };

  return `${actionIcons[name as keyof typeof actionIcons] || actionIcons.default} ${name}`;
};

const getActionName = (content: string): string => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.action?.name) {
      return parsed.action.name;
    }
  } catch (e) {
    // If not JSON, return empty
  }
  return "";
};

const getActionDetails = (content: string): ActionType | undefined => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.action?.name) {
      const actionName = parsed.action.name as ActionName;
      return {
        name: actionName,
        args: parsed.action.args,
        status: parsed.action.status as ActionStatus
      };
    }
  } catch (e) {
    // If not JSON, return undefined
  }
  return undefined;
};

const getActionIcon = (actionName: string): JSX.Element => {
  switch (actionName) {
    case 'navigate':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8L22 12L18 16"/>
          <path d="M2 12H22"/>
          <path d="M2 12C2 6.47715 6.47715 2 12 2"/>
        </svg>
      );
    case 'finish':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      );
    case 'click':
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6l6-6"/>
        </svg>
      );
    default:
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
      );
  }
};

interface TaskProgressBarProps {
  isRunning: boolean;
  onStop: () => void;
  currentTask?: string;
  isScrollingDown?: boolean;
  currentAction?: ActionName;
}

const TaskProgressBar: React.FC<TaskProgressBarProps> = ({ 
  isRunning, 
  onStop, 
  currentTask,
  isScrollingDown = false,
  currentAction
}) => {
  // Helper function untuk mendapatkan teks aksi yang lebih user-friendly
  const getActionText = () => {
    if (!isRunning) return "Waiting";
    if (!currentAction) return "Running";
    
    const actionStr = String(currentAction);
    switch (actionStr) {
      case "navigate":
        return "Navigating";
      case "click":
        return "Clicking";
      case "type":
        return "Typing";
      case "scroll":
        return "Scrolling";
      case "wait":
        return "Waiting";
      case "search":
        return "Searching";
      default:
        return formatActionName(actionStr);
    }
  };

  // Colors berdasarkan status
  const primaryColor = isRunning 
    ? "rgba(66, 153, 225, 1)" // Blue primary
    : "rgba(113, 128, 150, 1)"; // Gray primary
      
  const secondaryColor = isRunning 
    ? "rgba(107, 70, 193, 1)" // Purple accent
    : "rgba(74, 85, 104, 1)"; // Dark gray accent
      
  const tertiaryColor = isRunning 
    ? "rgba(144, 205, 244, 1)" // Light blue highlight
    : "rgba(160, 174, 192, 1)"; // Light gray highlight
  
  const actionText = getActionText();
  
  return (
    <Box 
      as="section"
        position="relative"
      borderRadius="xl"
        overflow="hidden"
      backgroundColor={isRunning ? "rgba(240, 249, 255, 0.8)" : "rgba(240, 240, 245, 0.8)"}
      borderColor={isRunning ? "rgba(179, 217, 255, 0.6)" : "rgba(226, 232, 240, 0.6)"}
      borderWidth="1px"
      boxShadow={`0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06), 0 0 0 1px ${isRunning ? 'rgba(66, 153, 225, 0.15)' : 'rgba(203, 213, 224, 0.15)'}`}
      sx={{
        backdropFilter: "blur(20px) saturate(180%)",
        transformOrigin: "center top"
      }}
      transition="all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
    >
      {/* Styling tetap mempertahankan progress bar yang ada */}
      {/* ... existing code ... */}
      
    <Box 
      position="absolute" 
          top="0"
          left="0"
          right="0"
          bottom="0"
          zIndex="0"
          background={isRunning 
            ? "radial-gradient(circle at 30% 40%, rgba(120,210,255,0.3), transparent 70%), radial-gradient(circle at 70% 60%, rgba(100,180,255,0.25), transparent 70%)"
            : "radial-gradient(circle at 30% 40%, rgba(235,235,245,0.3), transparent 70%), radial-gradient(circle at 70% 60%, rgba(225,225,235,0.25), transparent 70%)"
          }
          sx={{
            backdropFilter: "blur(15px) brightness(105%)",
            animation: isRunning ? "pulse-bg 8s infinite alternate ease-in-out" : "none",
            "@keyframes pulse-bg": {
              "0%": { opacity: 0.85 },
              "50%": { opacity: 0.95 },
              "100%": { opacity: 0.85 }
            },
            "&:before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: isRunning
                ? "linear-gradient(45deg, rgba(90,180,255,0.15) 0%, rgba(120,200,255,0.05) 50%, rgba(150,220,255,0.15) 100%)"
                : "linear-gradient(45deg, rgba(220,220,235,0.15) 0%, rgba(235,235,245,0.05) 50%, rgba(250,250,255,0.15) 100%)",
              filter: "blur(10px)"
            }
          }}
        />

        {/* Frosted Overlay with Border Gradient */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
        zIndex="5"
        backgroundColor="transparent"
        borderRadius="inherit"
            sx={{
          "&:before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            background: "transparent",
            borderRadius: "inherit",
            border: isRunning
              ? "1px solid rgba(144, 205, 244, 0.4)"
              : "1px solid rgba(226, 232, 240, 0.3)",
            opacity: 0.7,
            animation: isRunning ? "frost-pulse 4s infinite ease-in-out" : "none",
            "@keyframes frost-pulse": {
              "0%": { opacity: 0.6 },
              "50%": { opacity: 0.8 },
              "100%": { opacity: 0.6 }
            },
          },
          "&:after": {
            content: '""',
            position: "absolute",
            inset: "-1px",
            borderRadius: "inherit",
            padding: "1px",
              background: isRunning
              ? `linear-gradient(135deg, ${primaryColor}55 0%, transparent 50%, ${secondaryColor}33 100%)`
              : `linear-gradient(135deg, rgba(226, 232, 240, 0.4) 0%, transparent 50%, rgba(203, 213, 224, 0.2) 100%)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            animation: isRunning ? "natural-shimmer 6s infinite ease-in-out" : "none",
              "@keyframes natural-shimmer": {
              "0%": { opacity: 0.8, transform: "translateX(0) translateY(0)" },
              "33%": { opacity: 0.9, transform: "translateX(1%) translateY(-1%)" },
              "67%": { opacity: 0.8, transform: "translateX(-1%) translateY(1%)" },
              "100%": { opacity: 0.8, transform: "translateX(0) translateY(0)" }
            }
          }
        }}
      />

      {/* Crystal effect overlay */}
          <Box
            position="absolute"
        inset="0"
        zIndex="1"
        background={`linear-gradient(130deg, transparent 0%, ${isRunning ? "rgba(255, 255, 255, 0.13)" : "rgba(255, 255, 255, 0.09)"} 40%, transparent 100%)`}
            sx={{
          animation: isRunning ? "crystal-shimmer 10s infinite ease-in-out" : "none",
              "@keyframes crystal-shimmer": {
            "0%": { opacity: 0.5, transform: "translateX(-5%) translateY(0)" },
            "50%": { opacity: 0.7, transform: "translateX(5%) translateY(0)" },
            "100%": { opacity: 0.5, transform: "translateX(-5%) translateY(0)" }
              }
            }}
          />

          <Box 
            position="relative" 
            zIndex="10"
            p="18px"
          >
            <Flex justifyContent="space-between" alignItems="center" mb="10px">
          <Text
                fontSize="14px"
                fontWeight="600"
                color="#333"
                noOfLines={2}
                lineHeight="1.4"
                flex="1"
                pr="12px"
                opacity={isRunning ? 1 : 0.8}
                transform={isRunning ? "translateY(0)" : "translateY(1px)"}
                transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
          >
            {currentTask || "Running task..."}
          </Text>
              <HStack spacing="8px">
                <Box
                  as="button"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  w="26px"
                  h="26px"
                  borderRadius="full"
                  bg="gray.200"
                  color="gray.600"
                  transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  _hover={{ 
                    bg: "gray.300", 
                    transform: "scale(1.05)",
                    boxShadow: "0 2px 8px rgba(160, 174, 192, 0.4)"
                  }}
                  _active={{
                    transform: "scale(0.95)"
                  }}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onStop();
                  }}
                  title="Stop Task"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Box>
          </HStack>
        </Flex>
            
        {/* Execution status */}
        <Flex
          position="relative"
          alignItems="center"
          fontSize="12px"
          color={isRunning ? "blue.600" : "gray.500"}
          fontWeight="500"
          mt="4px"
          zIndex="1"
        >
          <Box
            w="8px"
            h="8px"
          borderRadius="full"
                mr="8px"
            bg={isRunning ? primaryColor : "gray.300"}
                sx={{
              animation: isRunning ? "pulse 1.5s infinite ease-in-out" : "none",
              "@keyframes pulse": {
                "0%": { opacity: 0.6, transform: "scale(0.75)" },
                "50%": { opacity: 1, transform: "scale(1)" },
                "100%": { opacity: 0.6, transform: "scale(0.75)" }
              }
            }}
          />
          {actionText}
      </Flex>
      </Box>
    </Box>
  );
};

const defaultStatus = ACTION_STATUSES.IDLE;

const StatusIndicator: React.FC<{ status: ActionStatus; action?: ActionType }> = ({ status, action }) => {
  const getStatusIcon = () => {
    // Jika statusnya navigasi, tampilkan ikon khusus navigasi
    if (action?.name === ACTION_NAMES.NAVIGATE && status !== ACTION_STATUSES.ERROR) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="10 8 16 12 10 16 10 8"></polygon>
        </svg>
      );
    }

    // Ikon status umum
    switch (status) {
      case ACTION_STATUSES.SUCCESS:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        );
      case ACTION_STATUSES.ERROR:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        );
      case ACTION_STATUSES.WARNING:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01M12 3l9 16H3L12 3z"/>
          </svg>
        );
      case ACTION_STATUSES.RUNNING:
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

  // Fungsi untuk mendapatkan UrlData dari action jika tersedia
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

  const urlData = getUrlData();
  
  // Fungsi untuk mendapatkan warna berdasarkan status
  const getStatusColorValue = (stat: ActionStatus, act?: ActionType): string => {
    // Logika penentuan warna berdasarkan status dan action type
    if (stat === ACTION_STATUSES.RUNNING) return "blue";
    if (stat === ACTION_STATUSES.SUCCESS) return "green";
    if (stat === ACTION_STATUSES.ERROR) return "red";
    if (stat === ACTION_STATUSES.WARNING) return "orange";
    
    // Default untuk idle dan status lainnya
    if (act?.name === ACTION_NAMES.NAVIGATE) return "blue"; 
    return "gray";
  };

  // Tampilan khusus untuk status navigasi (dengan optimasi vertikal)
  if (action?.name === ACTION_NAMES.NAVIGATE && urlData) {
  return (
      <Box
        borderWidth="1px"
        borderColor={`${getStatusColor(status, action)}.200`}
        bg={`${getStatusColor(status, action)}.50`}
        borderRadius="lg"
        p={1.5}
        overflow="hidden"
        boxShadow="sm"
        maxWidth="100%"
        width="100%" 
        transition="all 0.2s"
        _hover={{ boxShadow: "md" }}
      >
        {/* Layout vertikal untuk status navigasi */}
        <Flex direction={{base: "column", sm: "row"}} align="stretch" gap={1.5}>
          {/* Header dengan status dan ikon */}
          <Flex 
            align="center" 
            gap={2}
            pb={{base: 1.5, sm: 0}}
            borderBottomWidth={{base: "1px", sm: "0"}}
            borderColor={`${getStatusColor(status, action)}.100`}
            width="full"
          >
            {/* Status icon dengan ukuran yang ditingkatkan */}
            <Flex 
              align="center" 
              justify="center"
              minWidth={{base: "28px", sm: "24px"}} // Lebih besar di vertikal
              height={{base: "28px", sm: "24px"}} // Lebih besar di vertikal
              borderRadius="md"
              bg={`${getStatusColor(status, action)}.100`}
              color={`${getStatusColor(status, action)}.700`} // Warna lebih gelap untuk kontras
              boxShadow={`inset 0 0 0 1px ${getStatusColor(status, action)}.200`}
              flexShrink={0}
            >
              {status === ACTION_STATUSES.RUNNING ? (
                <Box animation="spin 1.5s linear infinite" sx={{
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" }
          }
                }}>
                  {getStatusIcon()}
                </Box>
              ) : (
                getStatusIcon()
              )}
            </Flex>
            
            {/* Status label dengan kontras yang ditingkatkan */}
            <Text 
              fontSize={{base: "xs", sm: "2xs"}} // Lebih besar di vertikal 
              fontWeight="bold" // Lebih bold di vertikal
              color={`${getStatusColor(status, action)}.800`} // Warna lebih gelap
              px={1.5}
              py={0.5} 
              bg={`${getStatusColor(status, action)}.100`}
              borderRadius="md"
              letterSpacing="0.02em"
              whiteSpace="nowrap"
              flexShrink={0}
            >
              {status === ACTION_STATUSES.RUNNING ? 'NAVIGASI' : 
               status === ACTION_STATUSES.SUCCESS ? 'SELESAI' : 
               status === ACTION_STATUSES.ERROR ? 'GAGAL' : 'NAVIGASI'}
            </Text>
          </Flex>
          
          {/* Website favicon and info dengan kontras yang ditingkatkan */}
          <Flex 
            flex="1" 
            minWidth="0" 
            direction="column"
            justify="space-between"
            gap={1.5} // Gap yang lebih besar
            px={{base: 2, sm: 2}}
            py={{base: 1, sm: 1}}
            bg="rgba(255,255,255,0.7)" // Background lebih kontras
            borderRadius="md"
          >
            {/* Website Title dengan ukuran yang ditingkatkan */}
            <Flex align="center" width="full">
              {/* Favicon dengan ukuran yang ditingkatkan */}
              <Box
                width="20px" // Lebih besar
                height="20px" // Lebih besar
                mr={2.5} // Margin lebih besar
                flexShrink={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="sm" 
                overflow="hidden"
                border="1px solid" 
                borderColor="gray.200"
              >
                <Image 
                  src={urlData.favicon}
                  alt={urlData.domain}
                  width="20px"
                  height="20px"
                  fallback={
                    <Box p={0} color="gray.500"> {/* Warna lebih gelap */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path>
                      </svg>
                    </Box>
                  }
                />
              </Box>
              
              {/* Title dengan ukuran yang ditingkatkan */}
              <Text 
                fontSize={{base: "sm", sm: "xs"}} // Lebih besar di vertikal
                fontWeight="semibold" // Lebih bold
                color="gray.800" // Warna lebih gelap untuk keterbacaan
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
                width="full"
                title={urlData.title} // Show full title on hover
              >
                {urlData.title}
              </Text>
            </Flex>
            
            {/* URL dengan format yang lebih mudah dibaca */}
            <Box 
              width="full" 
              mt={0.5}
              fontSize={{base: "xs", sm: "2xs"}} // Lebih besar di vertikal
              px={2}
              py={1.5} // Padding vertikal lebih besar
              bg="white"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
              color="gray.700" // Warna lebih gelap
              fontFamily="monospace"
              fontWeight="medium" // Lebih bold
            >
              <Text
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap" 
                title={urlData.fullUrl} // Show full URL on hover
              >
                {/* Tampilan URL yang lebih ringkas namun mudah dibaca */}
                {(() => {
                  // Deteksi rasio vertikal ekstrem
                  const isExtremeVertical = window.innerHeight > window.innerWidth * 2.5;
                  const isMobile = window.innerWidth < 400;
                  
                  if (isExtremeVertical || isMobile) {
                    // Format super ringkas untuk rasio vertikal ekstrem
                    return urlData.domain;
                  } else if (window.innerHeight > window.innerWidth * 1.5) {
                    // Format ringkas untuk rasio vertikal sedang
                    return `${urlData.domain}${urlData.path.length ? '/...' : ''}`;
                  } else {
                    // Format lengkap
                    return `${urlData.domain}${urlData.path.length ? '/' + urlData.path.join('/') : ''}`;
                  }
                })()}
              </Text>
            </Box>
          </Flex>
        </Flex>
      </Box>
    );
  }

  // Default status indicator display with vertical optimization
  return (
    <Flex 
      align="center" 
      gap={2}
      maxWidth="100%"
      overflow="hidden"
      p={{base: 2, sm: 1}} // Padding lebih besar di vertikal
      borderRadius="md"
      bg={`${getStatusColor(status, action)}.50`}
      borderWidth="1px"
      borderColor={`${getStatusColor(status, action)}.100`}
    >
      <Flex 
        align="center" 
        justify="center"
        minWidth={{base: "24px", sm: "20px"}} // Lebih besar di vertikal
        height={{base: "24px", sm: "20px"}} // Lebih besar di vertikal
        borderRadius="full"
        bg={`${getStatusColor(status, action)}.100`}
        color={`${getStatusColor(status, action)}.700`} // Warna lebih gelap
        flexShrink={0}
      >
        {status === ACTION_STATUSES.RUNNING ? (
          <Box animation="spin 1.5s linear infinite" sx={{
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" }
            }
          }}>
        {getStatusIcon()}
      </Box>
        ) : (
          getStatusIcon()
        )}
      </Flex>
      <Text 
        fontSize={{base: "sm", sm: "xs"}} // Lebih besar di vertikal
        color={`${getStatusColor(status, action)}.800`} // Warna lebih gelap
        fontWeight="medium"
        letterSpacing="0.02em"
        textOverflow="ellipsis"
        overflow="hidden"
        whiteSpace="nowrap"
        flex="1"
      >
        {getStatusDisplay(status, action)}
      </Text>
    </Flex>
  );
};

const getStatusDisplay = (status: ActionStatus, action?: ActionType): string => {
  if (status === ACTION_STATUSES.RUNNING) return 'Sedang memproses...';
  if (status === ACTION_STATUSES.SUCCESS) {
    if (action?.args?.success) return 'Tugas berhasil diselesaikan';
    if (action?.name === ACTION_NAMES.NAVIGATE && action?.args?.url) {
      try {
        const urlData = processUrlData(action.args.url);
        if (urlData) {
          return `Berhasil membuka ${urlData.title}`;
        }
      } catch {
        return 'Navigasi berhasil';
      }
    }
    return 'Selesai';
  }
  if (status === ACTION_STATUSES.ERROR) {
    if (action?.args?.error) return `Gagal: ${action.args.error}`;
    if (action?.name === ACTION_NAMES.NAVIGATE) return 'Gagal membuka halaman';
    return 'Terjadi kesalahan';
  }
  if (status === ACTION_STATUSES.WARNING) return 'Perhatian';
  
  // Status berdasarkan aksi
  if (action?.name === ACTION_NAMES.NAVIGATE) {
    const url = action.args?.url;
    if (url) {
      try {
        const urlData = processUrlData(url);
        if (urlData) {
          if (urlData.searchQuery) {
            return `Mencari "${urlData.searchQuery}" di ${urlData.domain}`;
          }
          return `Membuka ${urlData.title}`;
        }
      } catch {
        return `Navigasi ke ${url}`;
      }
    }
    return 'Navigasi halaman';
  }
  if (action?.name === ACTION_NAMES.CLICK) {
    const element = action.args?.selector || action.args?.text;
    return `Mengklik${element ? ` ${element}` : ''}`;
  }
  if (action?.name === ACTION_NAMES.TYPE) {
    const text = action.args?.text;
    return `Mengetik${text ? ` "${text}"` : ''}`;
  }
  if (action?.name === ACTION_NAMES.SCROLL) {
    const direction = action.args?.direction;
    return `Menggulir${direction ? ` ke ${direction}` : ''}`;
  }
  if (action?.name === ACTION_NAMES.WAIT) {
    const duration = action.args?.duration;
    return `Menunggu${duration ? ` ${duration}ms` : ''}`;
  }
  if (action?.name === ACTION_NAMES.SEARCH) {
    const query = action.args?.text;
    return `Mencari${query ? ` "${query}"` : ''}`;
  }
  
  return status;
};

const getStatusColor = (status: ActionStatus, action?: ActionType): string => {
  if (status === ACTION_STATUSES.RUNNING) return 'blue';
  if (status === ACTION_STATUSES.SUCCESS) return 'green';
  if (status === ACTION_STATUSES.ERROR) return 'red';
  if (status === ACTION_STATUSES.WARNING) return 'orange';
  
  // Warna berdasarkan aksi dan status
  if (action?.name === ACTION_NAMES.NAVIGATE) {
    if (action.args?.url) {
      try {
        const urlData = processUrlData(action.args.url);
        if (urlData) {
          switch (urlData.platform) {
            case 'search': return 'yellow';
            case 'ecommerce': return 'green';
            case 'social': return 'blue';
            case 'news': return 'purple';
            default: return 'teal';
          }
        }
      } catch {
        return 'teal';
      }
    }
    return 'teal';
  }
  if (action?.name === ACTION_NAMES.CLICK) return 'cyan';
  if (action?.name === ACTION_NAMES.TYPE) return 'teal';
  if (action?.name === ACTION_NAMES.SCROLL) return 'pink';
  if (action?.name === ACTION_NAMES.SEARCH) return 'yellow';
  
  return 'gray';
};

interface PlatformData {
  type: 'search' | 'ecommerce' | 'social' | 'news' | 'website';
  isSearch?: boolean;
  isImage?: boolean;
  isProduct?: boolean;
  isCategory?: boolean;
  isVideo?: boolean;
  isChannel?: boolean;
  isArticle?: boolean;
  isProfile?: boolean;
  searchParam?: string;
  title: string;
}

const platformData: Record<string, PlatformData> = {
  'google.com': {
    type: 'search',
    isSearch: true,
    isImage: false,
    searchParam: 'q',
    title: 'Google'
  },
  'bing.com': {
    type: 'search',
    isSearch: true,
    searchParam: 'q',
    title: 'Bing'
  },
  'tokopedia.com': {
    type: 'ecommerce',
    isProduct: true,
    isCategory: true,
    searchParam: 'q',
    title: 'Tokopedia'
  },
  'shopee.co.id': {
    type: 'ecommerce',
    isProduct: true,
    isCategory: true,
    searchParam: 'keyword',
    title: 'Shopee'
  },
  'youtube.com': {
    type: 'social',
    isVideo: true,
    isChannel: true,
    searchParam: 'search_query',
    title: 'YouTube'
  },
  'facebook.com': {
    type: 'social',
    isProfile: true,
    isSearch: true,
    searchParam: 'q',
    title: 'Facebook'
  },
  'kompas.com': {
    type: 'news',
    isArticle: true,
    isCategory: true,
    searchParam: 'q',
    title: 'Kompas'
  },
  'detik.com': {
    type: 'news',
    isArticle: true,
    isCategory: true,
    searchParam: 'query',
    title: 'Detik'
  }
};

interface UrlData {
  domain: string;
  path: string[];
  searchQuery?: string;
  protocol: string;
  platform: PlatformData['type'];
  contentType: 'search' | 'product' | 'category' | 'video' | 'channel' | 'article' | 'page';
  title: string;
  fullUrl: string;
  favicon: string;
}

const processUrlData = (url: string): UrlData | null => {
  try {
    const urlObj = new URL(url);
    const searchParams = Object.fromEntries(urlObj.searchParams);
    const path = urlObj.pathname.split('/').filter(Boolean);
    const domain = urlObj.hostname.replace('www.', '');
    const protocol = urlObj.protocol;

    // Dapatkan platform data atau default
    const platform = platformData[domain] || {
      type: 'website',
      title: domain
    };

    // Deteksi pencarian dari berbagai parameter umum
    const searchKeys = ['q', 'query', 'search', 'keyword', 'search_query', 's'];
    const searchQuery = platform.searchParam ? 
      searchParams[platform.searchParam] : 
      searchKeys.map(key => searchParams[key]).find(Boolean);

    // Deteksi tipe konten
    const contentType = (() => {
      if (platform.type === 'search' && platform.isSearch) return 'search';
      if (platform.type === 'ecommerce' && platform.isProduct) return 'product';
      if (platform.type === 'ecommerce' && platform.isCategory) return 'category';
      if (platform.type === 'social' && platform.isVideo) return 'video';
      if (platform.type === 'social' && platform.isChannel) return 'channel';
      if (platform.type === 'news' && platform.isArticle) return 'article';
      if (path.some(p => ['article', 'post', 'read', 'berita', 'news'].includes(p))) return 'article';
      if (path.some(p => ['product', 'item', 'produk'].includes(p))) return 'product';
      if (path.some(p => ['category', 'kategori', 'cat'].includes(p))) return 'category';
      return 'page';
    })() as UrlData['contentType'];

    // Dapatkan judul yang sesuai
    const getTitle = () => {
      if (searchQuery) return `Pencarian di ${platform.title}`;
      switch (contentType) {
        case 'search': return `Pencarian ${platform.title}`;
        case 'product': return `Produk di ${platform.title}`;
        case 'category': return `Kategori di ${platform.title}`;
        case 'video': return `Video di ${platform.title}`;
        case 'channel': return `Channel di ${platform.title}`;
        case 'article': return `Artikel di ${platform.title}`;
        default: return platform.title;
      }
    };

    return {
      domain,
      path,
      searchQuery,
      protocol,
      platform: platform.type,
      contentType,
      title: getTitle(),
      fullUrl: url,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  } catch {
    return null;
  }
};

// Mengupdate fungsi MessageContent untuk chat UI yang lebih modern
const MessageContent: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
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
        return <Icon as={FaCircle} color="gray.700" boxSize="18px" />;
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
          ? `Mengklik elemen dengan selector: ${action.args.selector.substring(0, 30)}${action.args.selector.length > 30 ? '...' : ''}` 
          : 'Mengklik elemen pada halaman';
      case 'type':
        return action.args?.text 
          ? `Mengetik: "${action.args.text.substring(0, 30)}${action.args.text.length > 30 ? '...' : ''}"` 
          : 'Mengetik teks ke dalam form';
      case 'scroll':
        return action.args?.direction 
          ? `Menggulir halaman ke ${action.args.direction === 'up' ? 'atas' : 'bawah'}` 
          : 'Menggulir halaman';
      case 'wait':
        return action.args?.duration 
          ? `Menunggu selama ${action.args.duration / 1000} detik` 
          : 'Menunggu sebentar';
      case 'finish':
        return action.args?.success 
          ? 'Tugas berhasil diselesaikan' 
          : 'Menyelesaikan tugas';
      case 'search':
        return action.args?.text 
          ? `Mencari: "${action.args.text.substring(0, 30)}${action.args.text.length > 30 ? '...' : ''}"` 
          : 'Melakukan pencarian';
      case 'extract':
        return 'Mengekstrak data dari halaman';
      case 'fill':
        return action.args?.selector 
          ? `Mengisi form pada elemen: ${action.args.selector.substring(0, 30)}${action.args.selector.length > 30 ? '...' : ''}` 
          : 'Mengisi form pada halaman';
      default:
        return `Melakukan tindakan: ${action.name}`;
    }
  };

  try {
    const parsed = JSON.parse(content) as AIJsonResponse;
    
    if (isUser) {
      return (
        <Text 
          fontSize="sm" 
          lineHeight="1.7"
          whiteSpace="pre-wrap"
          fontWeight="medium"
          color="white"
          animation="fadeIn 0.3s ease-out"
          sx={{
            "@keyframes fadeIn": {
              "0%": { opacity: 0, transform: "translateY(5px)" },
              "100%": { opacity: 1, transform: "translateY(0)" }
            }
          }}
        >
          {formatUserMessage(content)}
        </Text>
      );
    }

    return (
      <VStack align="stretch" spacing={4} animation="fadeIn 0.5s ease-out">
        {/* Bagian Pemikiran AI */}
        {parsed.thought && (
          <Box
            bg="rgba(255, 255, 255, 0.85)"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="0 4px 20px rgba(0, 100, 255, 0.1)"
            borderWidth="1px"
            borderColor="blue.100"
            transition="all 0.3s ease"
            backdropFilter="blur(12px)"
            _hover={{ 
              boxShadow: "0 8px 25px rgba(0, 100, 255, 0.15)",
              transform: "translateY(-2px)"
            }}
            transform="translateZ(0)"
            position="relative"
          >
            {/* Background dekoratif */}
            <Box 
              position="absolute" 
              top="0" 
              right="0" 
              bottom="0" 
              left="0" 
              pointerEvents="none"
              opacity="0.05"
              background="radial-gradient(circle at 15% 85%, rgba(99,179,237,0.6) 0%, transparent 60%)"
            />
            
            <Box
              bgGradient="linear(to-r, blue.50, cyan.50)"
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor="blue.100"
              position="relative"
            >
              <HStack spacing={3}>
                <Box
                  w="24px"
                  h="24px"
                  borderRadius="full"
                  bg="blue.50"
                  border="1px solid"
                  borderColor="blue.200"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="0 2px 5px rgba(0,100,255,0.1)"
                >
                  <Icon 
                    as={FaBrain} 
                    color="blue.500"
                    boxSize="14px"
                    animation="pulse 4s infinite ease-in-out"
                  />
                </Box>
                <Text
                  fontWeight="600" 
                  color="blue.700"
                  letterSpacing="0.01em"
                >
                  Pemikiran AI
                </Text>
              </HStack>
            </Box>
            <Box p={4} lineHeight="1.7" fontSize="sm" position="relative">
              <Text whiteSpace="pre-wrap" color="gray.700">
                {parsed.thought}
              </Text>
            </Box>
          </Box>
        )}

        {/* Bagian Tindakan */}
        {parsed.action && (
          <Box
            bg="rgba(255, 255, 255, 0.85)"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="0 4px 20px rgba(0, 100, 255, 0.1)"
            borderWidth="1px"
            borderColor="blue.100"
            transition="all 0.3s ease"
            backdropFilter="blur(12px)"
            _hover={{ 
              boxShadow: "0 8px 25px rgba(0, 100, 255, 0.15)",
              transform: "translateY(-2px)"
            }}
            transform="translateZ(0)"
            position="relative"
          >
            {/* Background dekoratif */}
            <Box 
              position="absolute" 
              top="0" 
              right="0" 
              bottom="0" 
              left="0" 
              pointerEvents="none"
              opacity="0.05"
              background="radial-gradient(circle at 85% 15%, rgba(66,153,225,0.6) 0%, transparent 60%)"
            />
            
            <Box
              bgGradient="linear(to-r, blue.50, cyan.50)"
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor="blue.100"
              position="relative"
            >
              <HStack spacing={3}>
                <Box
                  w="24px"
                  h="24px"
                  borderRadius="full"
                  bg="blue.50"
                  border="1px solid"
                  borderColor="blue.200"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="0 2px 5px rgba(0,100,255,0.1)"
                >
                  {formatActionIcon(parsed.action)}
                </Box>
                <Text
                  fontWeight="600" 
                  color="blue.700"
                  letterSpacing="0.01em"
                >
                  {formatActionTitle(parsed.action)}
                </Text>
              </HStack>
            </Box>
            <Box p={4} position="relative">
              <Text fontSize="sm" color="gray.700" mb={2}>
                {formatActionDescription(parsed.action)}
              </Text>
              
              {parsed.action.args && Object.keys(parsed.action.args).length > 0 && (
                <Box
                  mt={3}
                  p={3}
                  bg="rgba(240, 247, 255, 0.6)"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="blue.100"
                >
                  <JsonViewer data={parsed.action.args} isExpanded={true} />
                </Box>
              )}
            </Box>
          </Box>
        )}
      </VStack>
    );
  } catch (e) {
    // Jika content bukan JSON yang valid, tampilkan sebagai teks biasa
    const processedContent = isUser ? formatUserMessage(content) : formatAIResponse(content);
    
    // Function to detect if the content is AI JSON response but not parsed correctly
    const detectJsonBlocks = (text: string) => {
      // Match pattern with "thought" and "action"
      const jsonPattern = /```(?:json)?\s*\{\s*"thought"\s*:|^\{\s*"thought"\s*:|"thought"\s*:|"action"\s*:/;
      return jsonPattern.test(text);
    };
    
    if (!isUser && detectJsonBlocks(content)) {
      try {
        // Try to extract JSON part
        let jsonContent = content;
        if (content.includes("```json")) {
          jsonContent = content.replace(/```json\s*([\s\S]*?)\s*```/g, "$1");
        } else if (content.includes("```")) {
          jsonContent = content.replace(/```\s*([\s\S]*?)\s*```/g, "$1");
        }
        
        // Try to parse with some basic fixes
        jsonContent = jsonContent.trim();
        if (!jsonContent.startsWith("{")) jsonContent = "{" + jsonContent;
        if (!jsonContent.endsWith("}")) jsonContent = jsonContent + "}";
        
        const parsedJson = JSON.parse(jsonContent);
        
        // Check if has thought or action
        if (parsedJson.thought || parsedJson.action) {
          return (
            <VStack align="stretch" spacing={4} animation="fadeIn 0.5s ease-out">
              {parsedJson.thought && (
                <Box
                  bg="rgba(255, 255, 255, 0.85)"
                  borderRadius="2xl"
                  overflow="hidden"
                  boxShadow="0 4px 20px rgba(0, 100, 255, 0.1)"
                  borderWidth="1px" 
                  borderColor="blue.100"
                  transition="all 0.3s ease"
                  backdropFilter="blur(12px)"
                  _hover={{ 
                    boxShadow: "0 8px 25px rgba(0, 100, 255, 0.15)",
                    transform: "translateY(-2px)"
                  }}
                  transform="translateZ(0)"
                  position="relative"
                >
                  {/* Background dekoratif */}
                  <Box 
                    position="absolute" 
                    top="0" 
                    right="0" 
                    bottom="0" 
                    left="0" 
                    pointerEvents="none"
                    opacity="0.05"
                    background="radial-gradient(circle at 15% 85%, rgba(99,179,237,0.6) 0%, transparent 60%)"
                  />
                  
                  <Box
                    bgGradient="linear(to-r, blue.50, cyan.50)" 
                    px={4}
                    py={3}
                    borderBottom="1px solid" 
                    borderColor="blue.100"
                    position="relative"
                  >
                    <HStack spacing={3}>
                      <Box
                        w="24px"
                        h="24px"
                        borderRadius="full"
                        bg="blue.50"
                        border="1px solid"
                        borderColor="blue.200"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        boxShadow="0 2px 5px rgba(0,100,255,0.1)"
                      >
                        <Icon 
                          as={FaBrain} 
                          color="blue.500"
                          boxSize="14px" 
                          animation="pulse 4s infinite ease-in-out"
                        />
                      </Box>
                      <Text 
                        fontWeight="600"
                        color="blue.700"
                        letterSpacing="0.01em"
                      >
                        Pemikiran AI
                      </Text>
                    </HStack>
                  </Box>
                  <Box p={4} lineHeight="1.7" fontSize="sm" position="relative">
                    <Text whiteSpace="pre-wrap" color="gray.700">
                      {parsedJson.thought}
                    </Text>
                  </Box>
                </Box>
              )}
              
              {parsedJson.action && (
                <Box
                  bg="rgba(255, 255, 255, 0.85)"
                  borderRadius="2xl" 
                  overflow="hidden"
                  boxShadow="0 4px 20px rgba(0, 100, 255, 0.1)"
                  borderWidth="1px"
                  borderColor="blue.100"
                  transition="all 0.3s ease"
                  backdropFilter="blur(12px)"
                  _hover={{ 
                    boxShadow: "0 8px 25px rgba(0, 100, 255, 0.15)",
                    transform: "translateY(-2px)"
                  }}
                  transform="translateZ(0)"
                  position="relative"
                >
                  {/* Background dekoratif */}
                  <Box 
                    position="absolute" 
                    top="0" 
                backgroundColor: "rgba(255, 255, 255, 0.75)",
                boxShadow: "0 6px 16px rgba(0, 100, 255, 0.08)",
                borderColor: "rgba(200, 230, 255, 0.9)",
                transform: "translateY(-1px)"
              }}
            />
              {/* Decorative accent for textarea */}
              <Box
                position="absolute"
                bottom="6px"
                left="16px"
                width="30%"
                height="2px"
                background="linear-gradient(90deg, rgba(99,179,237,0.3) 0%, rgba(99,179,237,0) 100%)"
                borderRadius="full"
                opacity="0.7"
                pointerEvents="none"
            />
          </Box>
          <Button
            onClick={runTask}
            isDisabled={taskInProgress || state.isListening || !state.instructions?.trim()}
            size="sm"
            borderRadius="full"
              h="42px"
              w="42px"
              minW="42px"
            p={0}
              bg="blue.500"
              color="white"
              _hover={{
                bg: "blue.600",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(66, 153, 225, 0.4)"
              }}
              _active={{
                bg: "blue.700",
                transform: "translateY(0)",
                boxShadow: "0 2px 4px rgba(66, 153, 225, 0.3)"
              }}
              transition="all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            _disabled={{
              opacity: 0.4,
              cursor: "not-allowed",
                boxShadow: "none",
                transform: "none"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
          {state.voiceMode && (
            <VoiceButton
              taskInProgress={taskInProgress}
              onStopSpeaking={runTask}
            />
          )}
        </Box>

        {state.voiceMode && (
            <Alert 
              status="info" 
              borderRadius="xl" 
              mt={2} 
              py={1} 
              px={2.5} 
              size="sm"
              bg="rgba(235, 248, 255, 0.8)"
              borderColor="rgba(144, 205, 244, 0.4)"
            >
            <AlertIcon boxSize="14px" />
            <AlertDescription fontSize="xs">
              Press Space to start/stop speaking
            </AlertDescription>
          </Alert>
        )}
      </Box>

      {!state.voiceMode && !state.instructions && !taskInProgress && (
          <Box 
            px={4} 
            pb={4}
            bg="rgba(255, 255, 255, 0.5)"
            backdropFilter="blur(5px)"
          >
          <RecommendedTasks runTask={runTaskWithNewInstructions} />
        </Box>
      )}

      {debugMode && <ActionExecutor />}
    </Box>
    </>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  isUser, 
  content, 
  status = ACTION_STATUSES.IDLE, 
  metadata 
}) => {
  // Definisikan action secara benar untuk mencegah error tipe
  const actionName = metadata?.action?.name;
  const action = actionName ? {
    name: actionName,
    args: metadata?.action?.args || {}
  } as ActionType : undefined;
  
  const isProcessing = status === ACTION_STATUSES.RUNNING;

  return (
    <Flex 
      justify={isUser ? "flex-end" : "flex-start"} 
      mb={4}
      opacity={0}
      animation="fadeIn 0.3s ease-in-out forwards"
      sx={{
        "@keyframes fadeIn": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        }
      }}
    >
      {!isUser && (
        <Box
          w="36px"
          h="36px"
          mr={2}
          borderRadius="xl"
          bg="blue.50"
          border="1px solid"
          borderColor="blue.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          boxShadow="0 4px 12px rgba(0, 100, 255, 0.1)"
          _hover={{ transform: "scale(1.05)" }}
          transition="transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          position="relative"
          overflow="hidden"
        >
          {/* Latar belakang dekoratif untuk avatar */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="linear-gradient(135deg, rgba(214, 238, 255, 0.8) 0%, rgba(227, 246, 255, 0.4) 100%)"
            opacity="0.8"
          />
          <Text 
            color="blue.500" 
            fontSize="sm" 
            fontWeight="bold"
            position="relative"
            zIndex="1"
          >W</Text>
        </Box>
      )}
      <Box
        maxW={{ base: isUser ? "75%" : "80%", md: isUser ? "65%" : "70%" }}
        bg={isUser 
          ? "linear-gradient(135deg, #3182ce 0%, #4299e1 100%)" 
          : "rgba(255, 255, 255, 0.85)"}
        color={isUser ? "white" : "gray.700"}
        borderRadius={isUser ? "2xl 2xl 0 2xl" : "0 2xl 2xl 2xl"}
        boxShadow={isUser 
          ? "0 4px 12px rgba(66, 153, 225, 0.24)" 
          : "0 4px 12px rgba(0, 100, 255, 0.1)"}
        border="1px solid"
        borderColor={isUser ? "blue.500" : "rgba(226, 232, 240, 0.6)"}
        overflow="hidden"
        transition="all 0.2s ease"
        _hover={{
          transform: "translateY(-2px)",
          boxShadow: isUser 
            ? "0 6px 16px rgba(66, 153, 225, 0.3)" 
            : "0 6px 16px rgba(0, 100, 255, 0.15)"
        }}
        backdropFilter={isUser ? "none" : "blur(12px)"}
        position="relative"
      >
        {/* Latar belakang dekoratif untuk pesan */}
        {!isUser && (
          <Box
            position="absolute"
            top="0"
            left="0"
            width="100%"
            height="100%"
            opacity="0.05"
            background="radial-gradient(circle at 30% 30%, rgba(99,179,237,0.6) 0%, transparent 70%)"
            zIndex="0"
            pointerEvents="none"
          />
        )}
        
        <Box p={4} position="relative" zIndex="1">
          <MessageContent content={content} isUser={isUser} />
        </Box>

        {!isUser && status && (
          <Box 
            borderTop="1px solid"
            borderColor="rgba(226, 232, 240, 0.6)"
            bg={`${getStatusColor(status, action)}.50`}
            px={{base: 4, sm: 4}}
            py={{base: 3, sm: 3}}
            position="relative"
            zIndex="1"
          >
            <StatusIndicator status={status} action={action} />
          </Box>
        )}
      </Box>
    </Flex>
  );
};

export default TaskUI;
