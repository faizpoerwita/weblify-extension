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
  Textarea,
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
import { FaBrain, FaPlayCircle, FaVolumeUp, FaGlobe, FaMousePointer, FaKeyboard, FaArrowsAlt, FaClock, FaCheckCircle, FaSearch, FaFileExport, FaPen, FaCircle, FaPaperPlane, FaMicrophone } from "react-icons/fa";

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
            backdropFilter="blur(10px)"
            _hover={{ 
              boxShadow: "0 8px 25px rgba(0, 100, 255, 0.15)",
              transform: "translateY(-2px)"
            }}
            transform="translateZ(0)"
          >
            <Box
              bgGradient="linear(to-r, blue.50, cyan.50)"
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor="blue.100"
            >
              <HStack spacing={3}>
                <Icon 
                  as={FaBrain} 
                  color="blue.500"
                  boxSize="18px"
                  animation="pulse 4s infinite ease-in-out"
                  sx={{
                    "@keyframes pulse": {
                      "0%": { opacity: 0.8, transform: "scale(1)" },
                      "50%": { opacity: 1, transform: "scale(1.05)" },
                      "100%": { opacity: 0.8, transform: "scale(1)" }
                    }
                  }}
                />
                <Text
                  fontWeight="600" 
                  color="blue.700"
                  letterSpacing="0.01em"
                >
                  Pemikiran AI
                </Text>
              </HStack>
            </Box>
            <Box p={4} lineHeight="1.7" fontSize="sm">
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
            backdropFilter="blur(10px)"
            _hover={{ 
              boxShadow: "0 8px 25px rgba(0, 100, 255, 0.15)",
              transform: "translateY(-2px)"
            }}
            transform="translateZ(0)"
          >
            <Box
              bgGradient="linear(to-r, purple.50, blue.50)"
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor="blue.100"
            >
              <HStack spacing={3}>
                <Icon 
                  as={FaPlayCircle} 
                  color="blue.500" 
                  boxSize="18px"
                  animation="pulse 4s infinite ease-in-out"
                />
                <Text
                  fontWeight="600" 
                  color="blue.700"
                  letterSpacing="0.01em"
                >
                  Tindakan
                </Text>
              </HStack>
            </Box>
            <Box p={4}>
              <HStack align="flex-start" spacing={3}>
                <Box 
                  bg="blue.50" 
                            borderRadius="lg"
                  p={2}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {formatActionIcon(parsed.action)}
                          </Box>
                <VStack align="start" spacing={1} flex="1">
                  <Text fontWeight="600" color="blue.800" fontSize="sm">
                    {formatActionTitle(parsed.action)}
                          </Text>
                  <Text color="gray.600" fontSize="xs" lineHeight="1.5">
                    {formatActionDescription(parsed.action)}
                  </Text>
                </VStack>
              </HStack>
                                  </Box>
                                </Box>
                              )}

        {/* Bagian Speak (jika ada) */}
        {parsed.speak && (
          <Box
            bg="rgba(255, 255, 255, 0.85)"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="0 4px 20px rgba(0, 100, 255, 0.1)"
            borderWidth="1px"
            borderColor="blue.100"
            transition="all 0.3s ease"
            backdropFilter="blur(10px)"
            _hover={{ 
              boxShadow: "0 8px 25px rgba(0, 100, 255, 0.15)",
              transform: "translateY(-2px)"
            }}
            transform="translateZ(0)"
          >
            <Box
              bgGradient="linear(to-r, green.50, teal.50)"
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor="blue.100"
            >
              <HStack spacing={3}>
                <Icon as={FaVolumeUp} color="green.500" boxSize="18px" />
                <Text 
                  fontWeight="600" 
                  color="green.700"
                  letterSpacing="0.01em"
                >
                  Ucapan
                </Text>
              </HStack>
                                      </Box>
            <Box p={4} lineHeight="1.7" fontSize="sm">
              <Text whiteSpace="pre-wrap" color="gray.700">
                {parsed.speak}
              </Text>
                                  </Box>
                              </Box>
        )}
                          </VStack>
    );
  } catch {
    // Jika bukan JSON, kita perlu memeriksa apakah konten berisi JSON yang belum di-parse
    // Deteksi pola JSON dengan regexp yang ditingkatkan untuk menangkap lebih banyak pola JSON
    const jsonPattern = /(\{[\s\S]*?\}|\[[\s\S]*?\])|```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/;
    
    // Coba deteksi dan visualisasikan konten JSON yang mungkin ada di dalam teks
    if (!isUser && jsonPattern.test(content)) {
      // Regex yang ditingkatkan untuk ekstrak JSON, termasuk nested objects dan arrays
      // Termasuk JSON yang mungkin diformat dalam blok kode
      const extractJsonRegex = /```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```|(\{[\s\S]*?\}|\[[\s\S]*?\])/g;
      // Extract JSON content
      let possibleJsons = [];
      let match;
      while ((match = extractJsonRegex.exec(content)) !== null) {
        possibleJsons.push(match[1] || match[2]); // Grup 1 untuk JSON dalam kode, grup 2 untuk JSON biasa
      }
      
      if (possibleJsons && possibleJsons.length > 0) {
        // Pisahkan teks dan JSON
        const segments = [];
        let lastIndex = 0;
        let match;
        const regex = new RegExp(extractJsonRegex);
        
        // Proses semua segmen teks dan JSON
        while ((match = regex.exec(content)) !== null) {
          // Tambahkan teks sebelum JSON jika ada
          if (match.index > lastIndex) {
            segments.push({
              type: 'text',
              content: content.substring(lastIndex, match.index)
            });
          }
          
          // Tambahkan JSON
          segments.push({
            type: 'json',
            content: match[1] || match[2] // Ambil JSON dari grup regex yang cocok
          });
          
          lastIndex = match.index + match[0].length;
        }
        
        // Tambahkan teks yang tersisa setelah JSON terakhir
        if (lastIndex < content.length) {
          segments.push({
            type: 'text',
            content: content.substring(lastIndex)
          });
        }
        
                      return (
          <Box
            bg="white"
            p={4}
            borderRadius="2xl"
                            borderWidth="1px"
                            borderColor="gray.200"
            boxShadow="sm"
            transition="all 0.2s"
            _hover={{ boxShadow: "md" }}
          >
            <VStack align="stretch" spacing={4}>
              {segments.map((segment, idx) => {
                if (segment.type === 'text' && segment.content.trim()) {
                      return (
                        <Text
                      key={`text-${idx}`}
                          fontSize="sm"
                          color="gray.700"
                          lineHeight="1.6"
                      whiteSpace="pre-wrap"
                        >
                      {segment.content.trim()}
                        </Text>
                      );
                } else if (segment.type === 'json') {
                  try {
                    const jsonData = JSON.parse(segment.content);
                    
                    // Deteksi format khusus dengan "thought" dan "action"
                    if (jsonData && jsonData.thought && (jsonData.action || typeof jsonData.action === 'object')) {
                      // Format khusus untuk JSON dengan format "thought" dan "action"
                      return (
                        <Box 
                          key={`json-${idx}`}
            bg="white"
                          borderRadius="lg"
            overflow="hidden"
            boxShadow="sm"
            borderWidth="1px"
                          borderColor="blue.100"
            transition="all 0.2s"
            _hover={{ boxShadow: "md" }}
                          mt={2}
                          mb={2}
                        >
                          {/* Header Pemikiran AI */}
                          <Flex
                            bg="blue.50"
                            px={3}
                            py={2}
              borderBottom="1px solid"
                            borderColor="blue.100"
                            align="center"
            >
                  <Box
                    bg="white"
                              p={1.5}
                              borderRadius="md"
                              color="blue.500"
                    borderWidth="1px"
                              borderColor="blue.200"
                              mr={2}
                  >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2a10 10 0 0110 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2m0 6v4m0 4h.01"/>
                              </svg>
                  </Box>
                    <Text
                              fontSize={{base: "xs", md: "sm"}}
                      fontWeight="medium"
                              color="blue.700"
                    >
                              Pemikiran AI
                    </Text>
                          </Flex>
                          
                          {/* Pemikiran - optimasi untuk tampilan vertical */}
                          <Box p={3}>
                            <Text 
                              fontSize={{base: "xs", md: "sm"}} 
                              color="gray.700" 
                              lineHeight="1.5"
                              maxHeight={{base: "120px", md: "none"}}
                              overflowY={{base: "auto", md: "visible"}}
                              sx={{
                                scrollbarWidth: "thin",
                                scrollbarColor: "blue.200 transparent",
                                "&::-webkit-scrollbar": {
                                  width: "4px",
                                },
                                "&::-webkit-scrollbar-track": {
                                  background: "transparent",
                                },
                                "&::-webkit-scrollbar-thumb": {
                                  background: "blue.200",
                                  borderRadius: "full",
                                },
                              }}
                            >
                              {jsonData.thought}
                    </Text>
            </Box>

                          {/* Action - optimasi untuk tampilan vertical */}
                          {jsonData.action && (
                            <Box
                              borderTopWidth="1px"
                              borderColor="blue.100"
                              bg="blue.50"
                    p={3}
                            >
                              <Flex align="center" mb={2}>
                                <Box
                              bg="white"
                                  p={1.5}
                                  borderRadius="md"
                                  color="teal.500"
                              borderWidth="1px"
                                  borderColor="teal.200"
                                  mr={2}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 16l-4-4m0 0l4-4m-4 4h18"/>
                                  </svg>
                            </Box>
                              <Text
                                  fontSize={{base: "xs", md: "sm"}}
                                fontWeight="medium"
                                  color="teal.700"
                              >
                                  Tindakan
                              </Text>
                              </Flex>
                              
                              {typeof jsonData.action === 'object' ? (
                                <VStack 
                                  align="stretch" 
                                  spacing={2} 
                                  pl={{base: 2, md: 10}}
                                  maxHeight={{base: "150px", md: "none"}}
                                  overflowY={{base: "auto", md: "visible"}}
                                  sx={{
                                    scrollbarWidth: "thin",
                                    scrollbarColor: "teal.200 transparent",
                                    "&::-webkit-scrollbar": {
                                      width: "4px",
                                    },
                                    "&::-webkit-scrollbar-track": {
                                      background: "transparent",
                                    },
                                    "&::-webkit-scrollbar-thumb": {
                                      background: "teal.200",
                                      borderRadius: "full",
                                    },
                                  }}
                                >
                                  {/* Tampilan khusus untuk action navigate dengan website data */}
                                  {jsonData.action.name === 'navigate' && jsonData.action.args && jsonData.action.args.url && (
                                    <Box 
                            borderWidth="1px"
                                      borderColor="teal.100" 
                                      borderRadius="md"
                                      overflow="hidden"
                                      bg="white"
                                      boxShadow="sm"
                                      transition="all 0.2s"
                                      _hover={{ boxShadow: "md", borderColor: "teal.200" }}
                                      mb={1}
                                    >
                                      <Flex direction="column" width="full">
                                        <Flex p={2} alignItems="center" borderBottomWidth="1px" borderColor="teal.50">
                                          <Box 
                                            mr={2} 
                                            p={1} 
                                            borderRadius="sm" 
                                            bg="teal.50"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                          >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <circle cx="12" cy="12" r="10"></circle>
                                              <polygon points="10 8 16 12 10 16 10 8"></polygon>
                                </svg>
                              </Box>
                                          
                              <Text
                                fontSize="xs"
                                            fontWeight="medium" 
                                            color="teal.700"
                                            flex="1"
                                            isTruncated
                                          >
                                            Navigasi Website
                              </Text>
                                        </Flex>
                                        
                                        <Flex p={2} bg="gray.50" alignItems="center">
                                          {/* Website info dengan URL yang lebih ringkas */}
                                          <Box 
                                            width="12px" 
                                            height="12px" 
                                            mr={2}
                                            flexShrink={0}
                                          >
                                            <Image 
                                              src={`https://www.google.com/s2/favicons?domain=${new URL(jsonData.action.args.url).hostname}&sz=16`}
                                              alt="favicon"
                                              width="12px"
                                              height="12px"
                                              fallback={<Box bg="gray.100" borderRadius="sm" width="12px" height="12px" />}
                                            />
                                </Box>
                                          
                                          <Text 
                                            fontSize="2xs" 
                                            color="gray.700" 
                                            fontFamily="monospace"
                                            textOverflow="ellipsis"
                                            overflow="hidden"
                                            whiteSpace="nowrap"
                                            flex="1"
                                            title={jsonData.action.args.url}
                                          >
                                            {/* Tampilkan URL dalam format yang lebih ringkas */}
                                            {window.innerWidth < 400 || window.innerHeight > window.innerWidth * 2.5
                                              ? new URL(jsonData.action.args.url).hostname
                                              : jsonData.action.args.url.replace(/^(https?:\/\/)?(www\.)?/, '')
                                            }
                                </Text>
                                        </Flex>
                                      </Flex>
                  </Box>
                )}

                                  {/* Display other type of actions - optimasi untuk mode vertikal */}
                                  {Object.entries(jsonData.action).map(([key, value], keyIdx) => {
                                    // Skip displaying the name and args for navigate action since we have special display for it
                                    if (jsonData.action.name === 'navigate' && (key === 'name' || key === 'args')) {
                                      return null;
                                    }
                                    
                    return (
                                      <HStack 
                                        key={keyIdx} 
                                        spacing={2} 
                                        p={1.5} 
                                        bg="white" 
                                        borderRadius="md" 
                                        borderWidth="1px" 
                                        borderColor="gray.200" 
                                        _hover={{ borderColor: "teal.200", bg: "gray.50" }} 
                                        transition="all 0.2s"
                                      >
                                        <Text 
                                          fontSize="2xs" 
                                          fontWeight="medium" 
                                          color="teal.600" 
                                          width="60px"
                                          flexShrink={0}
                                        >
                                          {key}:
                        </Text>
                                        {typeof value === 'object' ? (
                                          <Box 
                                            borderRadius="sm"
                                            p={1.5}
                                            bg="white"
                                            borderWidth="1px"
                                            borderColor="teal.100"
                                            boxShadow="xs"
                                            width="full"
                                            maxHeight="80px"
                                            overflowY="auto"
                                            sx={{
                                              scrollbarWidth: "thin",
                                              scrollbarColor: "teal.100 transparent",
                                              "&::-webkit-scrollbar": {
                                                width: "3px",
                                              },
                                              "&::-webkit-scrollbar-track": {
                                                background: "transparent",
                                              },
                                              "&::-webkit-scrollbar-thumb": {
                                                background: "teal.100",
                                                borderRadius: "full",
                                              },
                                            }}
                                          >
                                            <JsonViewerForInvalidJson data={value} level={1} />
                                          </Box>
                                        ) : (
                                          <Text 
                                            fontSize="2xs" 
                                            color="gray.700" 
                                            fontFamily={key === 'url' ? 'monospace' : 'inherit'}
                                            isTruncated
                                            title={String(value)}
                                            flex="1"
                                          >
                                            {String(value)}
                              </Text>
                                        )}
                            </HStack>
                                    );
                                  })}
                        </VStack>
                              ) : (
                                <Text 
                                  fontSize="xs" 
                                  color="gray.700" 
                                  pl={{base: 2, md: 10}}
                                  fontFamily="monospace"
                                >
                                  {typeof jsonData.action === 'string' ? jsonData.action : JSON.stringify(jsonData.action)}
                                </Text>
                              )}
                            </Box>
                          )}
                      </Box>
                    );
                  }
                    
                    // Format visual default untuk JSON lainnya
                  return (
                      <Box 
                        key={`json-${idx}`}
                        bg="white"
                        borderRadius="lg"
                        overflow="hidden"
                        boxShadow="sm"
                        borderWidth="1px"
                        borderColor="teal.100"
                        transition="all 0.2s"
                        _hover={{ boxShadow: "md" }}
                        mt={2}
                        mb={2}
                      >
                        
                        {/* Lanjutkan dengan kode yang ada */}
                      </Box>
                    );
                  } catch (parseError) {
                    // Jika parsing gagal, tampilkan sebagai kode biasa dengan style yang lebih baik
                    return (
                      <Box key={`code-${idx}`}>
                        <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>
                          Format Kode
                      </Text>
                      <Box
                          p={3}
                          bg={useColorModeValue("gray.50", "gray.700")}
                          borderRadius="lg"
                          borderWidth="1px"
                          borderColor={useColorModeValue("gray.200", "gray.600")}
                          position="relative"
                          overflow="hidden"
                        >
                          <Box
                            position="absolute"
                            top="6px"
                            right="6px"
                            borderRadius="full"
                            bg={useColorModeValue("orange.50", "orange.900")}
                            color={useColorModeValue("orange.500", "orange.200")}
                            px={2}
                            py={0.5}
                        fontSize="xs"
                            fontWeight="medium"
                          >
                            CODE
                          </Box>
                          <Text
                            fontSize="sm"
                            fontFamily="inherit"
                            color={useColorModeValue("gray.700", "gray.300")}
                            whiteSpace="pre-wrap"
                          >
                            <JsonViewerForInvalidJson data={segment.content} />
                        </Text>
                      </Box>
                      </Box>
                  );
                  }
                }
                return null;
                })}
              </VStack>
            </Box>
        );
      }
    }
    
    // Jika bukan JSON dan tidak ada JSON di dalamnya, cek untuk format JSON dalam teks
    // Coba regex yang lebih agresif untuk mencari JSON
    const jsonRegex = /(\{|\[)[\s\S]*?(\}|\])/g;
    const matches = content.match(jsonRegex);
    
    if (!isUser && matches && matches.length > 0) {
      // Ada potensi JSON dalam teks, coba proses
      const segments = [];
      let lastIndex = 0;
      
      for (const match of matches) {
        const index = content.indexOf(match, lastIndex);
        
        // Tambah teks sebelum JSON
        if (index > lastIndex) {
          segments.push({
            type: 'text',
            content: content.substring(lastIndex, index)
          });
        }
        
        // Coba parse JSON
        try {
          JSON.parse(match);
          segments.push({ type: 'json', content: match });
        } catch {
          // Bukan JSON valid, tretap sebagai teks
          segments.push({ type: 'text', content: match });
        }
        
        lastIndex = index + match.length;
      }
      
      // Tambah teks setelah JSON terakhir
      if (lastIndex < content.length) {
        segments.push({
          type: 'text',
          content: content.substring(lastIndex)
        });
      }
      
      // Jika ada JSON valid, render dengan visualisasi
      if (segments.some(s => s.type === 'json')) {
        return (
          <Box
            bg="white"
            p={4}
            borderRadius="2xl"
            borderWidth="1px"
            borderColor="gray.200"
            boxShadow="sm"
            transition="all 0.2s"
            _hover={{ boxShadow: "md" }}
          >
            <VStack align="stretch" spacing={4}>
              {segments.map((segment, idx) => {
                if (segment.type === 'text') {
                  return (
                    <Text
                      key={`text-${idx}`}
                      fontSize="sm"
                      color="gray.700"
                      lineHeight="1.6"
                      whiteSpace="pre-wrap"
                    >
                      {segment.content.trim()}
                    </Text>
                  );
                } else if (segment.type === 'json') {
                  try {
                    const jsonData = JSON.parse(segment.content);
                    
                    // Tampilkan JSON dengan format yang lebih menarik seperti "Pemikiran AI"
                    return (
                      <Box 
                        key={`json-${idx}`}
            bg="white"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="sm"
            borderWidth="1px"
                        borderColor="blue.100"
            transition="all 0.2s"
            _hover={{ boxShadow: "md" }}
                        mt={2}
                        mb={2}
          >
            <Box
                          bg="blue.50"
              px={4}
              py={3}
              borderBottom="1px solid"
                          borderColor="blue.100"
            >
              <HStack spacing={3}>
                <Box
                  bg="white"
                  p={2}
                  borderRadius="lg"
                              color="blue.500"
                  borderWidth="1px"
                              borderColor="blue.200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2z"/>
                                <path d="M12 6v12M6 10v4M18 10v4"/>
                  </svg>
                </Box>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                              color="blue.700"
                >
                              Data JSON
                </Text>
              </HStack>
            </Box>
            <Box p={4}>
                          {/* Visualisasi data berdasarkan tipe */}
                          {typeof jsonData === 'object' && jsonData !== null ? (
                            // Jika objek, tampilkan sebagai tabel properti
                            <VStack align="stretch" spacing={2}>
                              {Object.entries(jsonData).map(([key, value], keyIdx) => {
                                // Jika nilai adalah objek kompleks, gunakan JsonViewer
                                if (typeof value === 'object' && value !== null) {
                    return (
                                    <Box key={keyIdx} mb={2}>
                                      <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1}>
                                        {key}:
                        </Text>
                                      <Box 
                                        p={2} 
                        bg="gray.50"
                                        borderRadius="md" 
                        borderWidth="1px"
                        borderColor="gray.200"
                      >
                                        <JsonViewerForInvalidJson data={value} level={1} />
                                      </Box>
                      </Box>
                    );
                  }

                                // Untuk nilai primitif, tampilkan sebagai baris
                    return (
                                  <HStack key={keyIdx} justify="space-between" p={2} borderRadius="md" _hover={{ bg: "gray.50" }}>
                                    <Text fontSize="sm" fontWeight="medium" color="gray.600">
                                      {key}
                                    </Text>
                                    <Text 
                                      fontSize="sm" 
                                      color={
                                        typeof value === 'string' ? "green.600" :
                                        typeof value === 'number' ? "blue.600" :
                                        typeof value === 'boolean' ? "purple.600" :
                                        "gray.600"
                                      }
                                      fontFamily="inherit"
                                    >
                                      {typeof value === 'string' ? value : String(value)}
                                    </Text>
                                  </HStack>
                                );
                              })}
                            </VStack>
                          ) : (
                            // Untuk nilai primitif atau array sederhana
                            <Box>
                              {Array.isArray(jsonData) ? (
                                <VStack align="stretch" spacing={2} p={2} bg="blue.50" borderRadius="md">
                                  <HStack>
                                    <Box bg="blue.100" p={1} borderRadius="md">
                                      <Text fontSize="xs" fontWeight="bold" color="blue.700">ARRAY</Text>
                                    </Box>
                                    <Text fontSize="xs" color="blue.600">{jsonData.length} item</Text>
                                  </HStack>
                                  {jsonData.map((item: any, arrayIdx: number) => (
                                    <Box 
                                      key={arrayIdx} 
                        p={2}
                                      bg="white" 
                        borderRadius="md"
                                      borderWidth="1px" 
                                      borderColor="blue.100"
                                      _hover={{ borderColor: "blue.300", transform: "translateY(-1px)" }}
                                      transition="all 0.2s"
                                      boxShadow="sm"
                                    >
                                      {typeof item === 'object' && item !== null ? (
                                        <JsonViewerForInvalidJson data={item} level={1} />
                                      ) : (
                                        <Text 
                        fontSize="sm"
                                          color={
                                            typeof item === 'string' ? "green.600" :
                                            typeof item === 'number' ? "blue.600" :
                                            typeof item === 'boolean' ? "purple.600" :
                                            "gray.600"
                                          }
                                        >
                                          {typeof item === 'string' ? item : String(item)}
                                        </Text>
                                      )}
                                    </Box>
                                  ))}
                                </VStack>
                              ) : (
                                <Box p={2} bg="gray.50" borderRadius="md">
                                  <Text fontSize="sm" color="gray.700">
                                    {typeof jsonData === 'string' ? jsonData : String(jsonData)}
                                  </Text>
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  } catch {
                    // Render sebagai teks biasa jika parsing gagal
                  return (
                    <Text
                        key={`text-${idx}`}
                      fontSize="sm"
                      color="gray.700"
                      lineHeight="1.6"
                        whiteSpace="pre-wrap"
                    >
                        {segment.content.trim()}
                    </Text>
                  );
                  }
                }
                return null;
                })}
              </VStack>
            </Box>
        );
      }
    }
    
    // Jika bukan JSON dan tidak ada JSON di dalamnya, tampilkan sebagai teks biasa
    return (
      <Box
        bg={isUser ? "transparent" : "white"}
        p={4}
        borderRadius="2xl"
        borderWidth={isUser ? "0" : "1px"}
        borderColor="gray.200"
        boxShadow={isUser ? "none" : "sm"}
        transition="all 0.2s"
        _hover={{ boxShadow: isUser ? "none" : "md" }}
      >
        <VStack align="stretch" spacing={3}>
          {content.split('\n').map((line, idx) => {
            if (line.trim().startsWith('•')) {
              return (
                <HStack key={idx} spacing={3} align="start">
                  <Box
                    w="2px"
                    h="2px"
                    borderRadius="full"
                    bg={isUser ? "white" : "gray.400"}
                    mt={2.5}
                  />
                  <Text
                    fontSize="sm"
                    color={isUser ? "white" : "gray.700"}
                    flex={1}
                    lineHeight="1.6"
                  >
                    {line.trim().replace('•', '')}
                  </Text>
                </HStack>
              );
            }

            if (line.includes('```')) {
              const code = line.replace(/```[a-z]*|```/g, '').trim();
              return (
                <Box
                  key={idx}
                  p={3}
                  bg={isUser ? "whiteAlpha.200" : "gray.50"}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={isUser ? "whiteAlpha.300" : "gray.200"}
                >
                  <Text
                    fontSize="sm"
                    fontFamily="inherit"
                    color={isUser ? "white" : "gray.700"}
                    whiteSpace="pre-wrap"
                  >
                    {code}
                  </Text>
                </Box>
              );
            }

            return (
              <Text
                key={idx}
                fontSize="sm"
                color={isUser ? "white" : "gray.700"}
                lineHeight="1.6"
                whiteSpace="pre-wrap"
              >
                {line}
              </Text>
            );
          })}
        </VStack>
      </Box>
    );
  }
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
          w="34px"
          h="34px"
          mr={2}
          borderRadius="xl"
          bg="blue.50"
          border="1px solid"
          borderColor="blue.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          boxShadow="0 3px 10px rgba(0, 100, 255, 0.1)"
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
            bg="linear-gradient(135deg, rgba(195, 235, 254, 0.7) 0%, rgba(130, 198, 245, 0.5) 100%)"
            opacity="0.9"
          />
          <Text 
            color="blue.600" 
            fontSize="sm" 
            fontWeight="bold"
            position="relative"
            zIndex="1"
          >W</Text>
        </Box>
      )}
      <Box
        maxW={isUser ? "80%" : "85%"}
        bg={isUser 
          ? "linear-gradient(135deg, #3182ce 0%, #4299e1 100%)" 
          : "rgba(255, 255, 255, 0.85)"}
        color={isUser ? "white" : "gray.700"}
        borderRadius={isUser ? "2xl 2xl 0 2xl" : "0 2xl 2xl 2xl"}
        boxShadow={isUser 
          ? "0 6px 16px rgba(66, 153, 225, 0.3)" 
          : "0 6px 16px rgba(0, 100, 255, 0.1)"}
        border="1px solid"
        borderColor={isUser ? "blue.500" : "rgba(226, 232, 240, 0.8)"}
        overflow="hidden"
        transition="all 0.3s ease"
        _hover={{
          transform: "translateY(-2px)",
          boxShadow: isUser 
            ? "0 8px 20px rgba(66, 153, 225, 0.35)" 
            : "0 8px 20px rgba(0, 100, 255, 0.15)"
        }}
        backdropFilter={isUser ? "none" : "blur(15px) saturate(150%)"}
        position="relative"
      >
        {/* Latar belakang dekoratif untuk pesan */}
        {!isUser && (
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="linear-gradient(135deg, rgba(240, 249, 255, 0.95) 0%, rgba(230, 245, 255, 0.95) 100%)"
            zIndex="-1"
          />
        )}

        <Box p={3}>
          <MessageContent content={content} isUser={isUser} />
          
          {metadata?.action && (
            <Box mt={2}>
              <StatusIndicator status={status} action={action} />
            </Box>
          )}
        </Box>
      </Box>
    </Flex>
  );
};

const transformTaskHistory = (history: BaseTaskHistoryEntry[]): DisplayTaskHistoryEntry[] => {
  let lastUserMessage = '';
  let lastAssistantMessage = '';
  let isProcessing = false;
  
  return history.reduce<DisplayTaskHistoryEntry[]>((entries, entry, index) => {
    // Cek status processing di awal
    if (entry.action?.operation.name === OPERATION_NAMES.PROCESSING) {
      isProcessing = true;
    }

    // Format pesan user
    if (entry.prompt) {
      const normalizedPrompt = formatUserMessage(entry.prompt).trim();
      
      // Hanya tambahkan jika berbeda dari pesan terakhir
      if (normalizedPrompt && normalizedPrompt !== lastUserMessage) {
        lastUserMessage = normalizedPrompt;
        
        entries.push({
          type: "user",
          message: normalizedPrompt,
          status: ACTION_STATUSES.IDLE,
          metadata: {
            timestamp: new Date().toISOString()
          },
          isNewGroup: true,
          isLastInGroup: true
        });
      }
    }

    // Format respons AI
    if (entry.response) {
      const normalizedResponse = entry.response.trim();
      
      // Hanya tambahkan jika ada respons dan berbeda dari respons terakhir
      if (normalizedResponse && normalizedResponse !== lastAssistantMessage) {
        lastAssistantMessage = normalizedResponse;
        
        entries.push({
          type: "assistant",
          message: normalizedResponse,
          status: entry.action?.operation.name === OPERATION_NAMES.PROCESSING 
            ? ACTION_STATUSES.RUNNING 
            : ACTION_STATUSES.IDLE,
          metadata: {
            timestamp: new Date().toISOString(),
            action: mapOperationToAction(entry.action?.operation)
          },
          isNewGroup: true,
          isLastInGroup: true
        });
      }
    }

    // Tambahkan status processing hanya di akhir jika sedang memproses
    if (index === history.length - 1 && isProcessing && 
        !entries.some(e => e.status === ACTION_STATUSES.RUNNING)) {
      entries.push({
        type: "assistant",
        message: "Sedang memproses permintaan Anda...",
        status: ACTION_STATUSES.RUNNING,
        metadata: {
          timestamp: new Date().toISOString()
        },
        isNewGroup: true,
        isLastInGroup: true
      });
    }

    return entries;
  }, []);
};

const mapOperationToAction = (operation?: ActionOperation): ActionName | undefined => {
  if (!operation) return undefined;

  const nameMap: Record<OperationName | 'finish', ActionName> = {
    [OPERATION_NAMES.CLICK]: ACTION_NAMES.CLICK,
    [OPERATION_NAMES.SET_VALUE]: ACTION_NAMES.TYPE,
    [OPERATION_NAMES.SET_VALUE_AND_ENTER]: ACTION_NAMES.TYPE,
    [OPERATION_NAMES.NAVIGATE]: ACTION_NAMES.NAVIGATE,
    [OPERATION_NAMES.SCROLL]: ACTION_NAMES.SCROLL,
    [OPERATION_NAMES.WAIT]: ACTION_NAMES.WAIT,
    [OPERATION_NAMES.FAIL]: ACTION_NAMES.FINISH,
    [OPERATION_NAMES.PROCESSING]: ACTION_NAMES.WAIT,
    'finish': ACTION_NAMES.FINISH
  };

  return nameMap[operation.name];
};

const WELCOME_MESSAGE = `Selamat datang! Saya weblify.id, asisten browser Anda.

Saya dapat membantu Anda dengan:
• Membuka situs web
• Mencari informasi
• Mengklik elemen
• Mengisi formulir
• Menggulir halaman

Apa yang bisa saya bantu hari ini?`;

interface AIJsonResponse {
  // Definisikan properti yang diperlukan
  [key: string]: any;
}

interface JsonViewerProps {
  data: any;
  level?: number;
  isExpanded?: boolean;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data, level = 0, isExpanded = true }) => {
  const [expanded, setExpanded] = React.useState(isExpanded);
  const indent = React.useMemo(() => level * 20, [level]);
  const colorMode = useColorMode().colorMode;
  const isDark = colorMode === "dark";

  // Warna berbasis mode tema
  const colors = {
    string: useColorModeValue("green.600", "green.300"),
    number: useColorModeValue("blue.600", "blue.300"),
    boolean: useColorModeValue("purple.600", "purple.300"),
    null: useColorModeValue("red.500", "red.300"),
    key: useColorModeValue("blue.600", "blue.300"),
    bracket: useColorModeValue("gray.700", "gray.300"),
    background: useColorModeValue("gray.50", "gray.700"),
    hoverBg: useColorModeValue("gray.100", "gray.600"),
  };

  if (typeof data !== 'object' || data === null) {
    // Visualisasi nilai primitif
    return (
      <Text 
        as="span" 
        color={
          typeof data === 'string' ? colors.string :
          typeof data === 'number' ? colors.number :
          typeof data === 'boolean' ? colors.boolean :
          data === null ? colors.null : 'gray.600'
        }
        fontFamily="inherit"
        fontSize="sm"
        borderRadius="sm"
        px={typeof data === 'string' ? 1 : 0}
        bg={typeof data === 'string' ? 'whiteAlpha.300' : 'transparent'}
      >
        {data === null ? 'null' : 
         typeof data === 'string' ? data : 
         String(data)}
      </Text>
    );
  }

  const isArray = Array.isArray(data);
  const isEmpty = Object.keys(data).length === 0;

  if (isEmpty) {
    return (
      <Text as="span" color={colors.bracket} fontFamily="inherit" fontSize="sm">
        {isArray ? '[ ]' : '{ }'}
      </Text>
    );
  }

  const itemCount = Object.keys(data).length;

  return (
    <Box pl={indent}>
      <HStack 
        spacing={1} 
        onClick={() => setExpanded(!expanded)} 
        cursor="pointer" 
        mb={1}
        borderRadius="md"
        p={1}
        _hover={{ bg: colors.hoverBg }}
        transition="background 0.2s"
      >
        <Box 
          transform={expanded ? 'rotate(90deg)' : 'rotate(0deg)'}
          transition="transform 0.2s"
          color={useColorModeValue("gray.600", "gray.400")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </Box>
        <Text fontFamily="inherit" color={colors.bracket} fontSize="sm">
          {isArray ? '[' : '{'}
        </Text>
        {!expanded && (
          <Text fontFamily="inherit" color="gray.500" fontSize="xs" ml={1} fontStyle="italic">
            {isArray ? `Array(${itemCount})` : `${itemCount} properti`}
          </Text>
        )}
      </HStack>
      
      {expanded && (
        <VStack align="stretch" spacing={1} 
          animation="fadeIn 0.2s ease-out"
          sx={{
            "@keyframes fadeIn": {
              "0%": { opacity: 0, transform: "translateY(-5px)" },
              "100%": { opacity: 1, transform: "translateY(0)" }
            }
          }}
        >
          {Object.entries(data).map(([key, value], index) => (
            <Box key={key} 
              borderLeft="1px solid" 
              borderColor="gray.200"
              pl={2}
              _hover={{ borderColor: "blue.200" }}
              transition="all 0.2s"
            >
              <HStack spacing={2} wrap="nowrap">
                <Text color={colors.key} fontFamily="inherit" fontSize="sm" fontWeight="medium">
                  {isArray ? 
                    <Box as="span" px={1} fontSize="xs" bg={useColorModeValue("gray.100", "gray.600")} borderRadius="sm" mr={1}>
                      {key}
                    </Box> : 
                    key
                  }
                </Text>
                <JsonViewer data={value} level={level + 1} />
                {index < Object.entries(data).length - 1 && !isArray && (
                  <Text color="gray.400" fontSize="sm">,</Text>
                )}
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
      
      <Text fontFamily="inherit" color={colors.bracket} fontSize="sm" pl={expanded ? indent : 0}>
        {isArray ? ']' : '}'}
      </Text>
    </Box>
  );
};

const TaskUI = () => {
  const state = useAppState((state) => ({
    taskHistory: state.currentTask.history,
    taskStatus: state.currentTask.status,
    runTask: state.currentTask.actions.runTask,
    interruptTask: state.currentTask.actions.interrupt,
    instructions: state.ui.instructions,
    setInstructions: state.ui.actions.setInstructions,
    voiceMode: state.settings.voiceMode,
    isListening: state.currentTask.isListening,
  }));
  const taskInProgress = state.taskStatus === "running";
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // State untuk tracking scroll direction
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  
  // Track scroll direction - tidak digunakan untuk TaskProgressBar karena selalu terlihat
  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const st = chatContainerRef.current.scrollTop;
        if (st > lastScrollTop && st > 50) {
          // Scrolling down & past the threshold
          setIsScrollingDown(true);
        } else {
          // Scrolling up
          setIsScrollingDown(false);
        }
        setLastScrollTop(st);
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [lastScrollTop]);

  const toastError = useCallback(
    (message: string) => {
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
    [toast],
  );

  const runTask = useCallback(() => {
    state.instructions && state.runTask(toastError);
  }, [state, toastError]);

  const runTaskWithNewInstructions = (newInstructions: string = "") => {
    if (!newInstructions) {
      return;
    }
    state.setInstructions(newInstructions);
    state.runTask(toastError);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (!e.shiftKey) {
        e.preventDefault();
        runTask();
      }
    }
  };

  const displayTaskHistory = useMemo(() => {
    return transformTaskHistory(state.taskHistory);
  }, [state.taskHistory]);

  // Global styles untuk TaskUI
  const globalStyles = css`
    @keyframes float {
      0% { transform: translate(0, 0); }
      50% { transform: translate(5px, 10px); }
      100% { transform: translate(0, 0); }
    }
    
    @keyframes gradient-flow {
      0% { background-position: 0% 25%; }
      25% { background-position: 50% 50%; }
      50% { background-position: 100% 75%; }
      75% { background-position: 50% 50%; }
      100% { background-position: 0% 25%; }
    }
    
    @keyframes pulse-subtle {
      0% { opacity: 0.3; }
      50% { opacity: 0.6; }
      100% { opacity: 0.3; }
    }
    
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      position="relative"
      overflow="hidden"
    >
      {/* Global styles untuk animasi */}
      <Global styles={globalStyles} />

      {/* Background gradient dan animasi */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="linear-gradient(135deg, rgba(240,249,255,0.6) 0%, rgba(225,240,255,0.6) 100%)"
        zIndex="-1"
        borderRadius="xl"
        overflow="hidden"
      >
        {/* Animated background effects */}
        <Box
          position="absolute"
          top="-5%"
          left="-5%"
          width="110%"
          height="110%"
          opacity="0.5"
          animation="rotate 60s linear infinite"
          sx={{
            background: "radial-gradient(ellipse at center, rgba(90,170,235,0.15) 0%, rgba(90,170,235,0) 70%)"
          }}
        />

        {/* Animated blue blobs */}
        <Box
          position="absolute"
          top="10%"
          left="5%"
          width="40%"
          height="40%"
          opacity="0.4"
          animation="float 18s infinite ease-in-out"
          sx={{
            background: "radial-gradient(circle, rgba(90,170,235,0.15) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
        
        <Box
          position="absolute"
          bottom="10%"
          right="10%"
          width="35%"
          height="35%"
          opacity="0.4"
          animation="float 22s infinite ease-in-out reverse"
          sx={{
            background: "radial-gradient(circle, rgba(110,190,250,0.15) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
        
        <Box
          position="absolute"
          top="40%"
          right="15%"
          width="25%"
          height="25%"
          opacity="0.3"
          animation="float 15s infinite ease-in-out"
          sx={{
            background: "radial-gradient(circle, rgba(70,150,225,0.15) 0%, transparent 70%)",
            borderRadius: "50%"
          }}
        />
      </Box>

      {/* Task history container */}
      <Box
        ref={chatContainerRef}
        flex="1"
        overflowY="auto"
        px={{ base: 3, md: 4 }}
        py={4}
        css={{
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "rgba(240, 249, 255, 0.6)",
            borderRadius: "10px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(66, 153, 225, 0.35)",
            borderRadius: "10px",
            "&:hover": {
              backgroundColor: "rgba(66, 153, 225, 0.5)",
            },
          },
        }}
      >
        {displayTaskHistory.map((entry, index) => (
          <ChatMessage
            key={index}
            isUser={entry.type === 'user'}
            content={entry.message}
            status={entry.status}
            metadata={entry.metadata}
          />
        ))}

        {/* Task Progress Bar - dipindahkan ke komponen terpisah dan selalu muncul di atas */}
        {taskInProgress && (
          <TaskProgressBar
            isRunning={taskInProgress}
            onStop={() => state.interruptTask()}
            currentTask={state.instructions}
            isScrollingDown={isScrollingDown}
            currentAction={state.taskHistory[state.taskHistory.length - 1]?.action?.name as ActionName}
          />
        )}
      </Box>

      {/* Input area */}
      <Box
        p={{ base: 3, md: 4 }}
        borderTop="1px solid"
        borderColor="rgba(226, 232, 240, 0.8)"
        bg="linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(240, 249, 255, 0.85) 100%)"
        backdropFilter="blur(15px) saturate(150%)"
        position="relative"
        transition="all 0.3s ease"
      >
        <HStack spacing={3} align="flex-end">
          <Textarea
            value={state.instructions}
            onChange={(e) => state.setInstructions(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Kirim perintah untuk tugas web..."
            size="md"
            resize="none"
            rows={1}
            py={2}
            px={4}
            borderRadius="xl"
            bg="white"
            border="1px solid"
            borderColor="blue.200"
            _hover={{ borderColor: "blue.300" }}
            _focus={{ 
              borderColor: "blue.400", 
              boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
              bg: "white" 
            }}
            fontSize="sm"
            fontWeight="medium"
            transition="all 0.3s ease"
          />
          <IconButton
            aria-label="Send message"
            icon={<SendIcon />}
            onClick={runTask}
            isLoading={taskInProgress}
            isDisabled={!state.instructions || taskInProgress}
            colorScheme="blue"
            borderRadius="full"
            size="md"
            boxShadow="0 4px 12px rgba(66, 153, 225, 0.2)"
            transition="all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            _hover={{
              transform: "translateY(-2px)",
              boxShadow: "0 6px 16px rgba(66, 153, 225, 0.3)"
            }}
            _active={{
              transform: "translateY(0)",
              boxShadow: "0 2px 6px rgba(66, 153, 225, 0.2)"
            }}
          />
          {state.voiceMode && (
            <IconButton
              aria-label="Voice input"
              icon={<MicIcon />}
              onClick={() => {}}
              isDisabled={taskInProgress}
              colorScheme={state.isListening ? "red" : "blue"}
              variant={state.isListening ? "solid" : "outline"}
              borderRadius="full"
              size="md"
              transition="all 0.3s ease"
              boxShadow="0 4px 12px rgba(66, 153, 225, 0.15)"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "0 6px 16px rgba(66, 153, 225, 0.25)"
              }}
              _active={{
                transform: "translateY(0)",
                boxShadow: "0 2px 6px rgba(66, 153, 225, 0.15)"
              }}
            />
          )}
        </HStack>
        
        {/* Recommended tasks */}
        <RecommendedTasks onSelectTask={runTaskWithNewInstructions} />
      </Box>

      {/* Portal untuk TaskProgressBar */}
      {taskInProgress && (
        <Portal>
          <Box
            position="fixed"
            top="16px"
            left="50%"
            transform="translateX(-50%) scale(1.05)"
            width={["calc(100% - 32px)", "90%", "80%", "600px"]}
            maxWidth="700px"
            zIndex="100000" // Super tinggi zIndex
            borderRadius="xl"
            boxShadow="0 12px 40px rgba(0, 0, 0, 0.25)"
            transition="all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            className="task-progress-notification"
            bg="transparent"
            animation="task-notification-appear 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            sx={{
              "@keyframes task-notification-appear": {
                "0%": { opacity: 0, transform: "translateX(-50%) translateY(-20px) scale(1.05)" },
                "100%": { opacity: 1, transform: "translateX(-50%) translateY(0) scale(1.05)" }
              }
            }}
          >
            <TaskProgressBar
              isRunning={taskInProgress}
              onStop={() => state.interruptTask()}
              currentTask={state.instructions}
              isScrollingDown={false} // Selalu tampilkan
              currentAction={state.taskHistory[state.taskHistory.length - 1]?.action?.name as ActionName}
            />
          </Box>
        </Portal>
      )}
    </Box>
  );
};

const RecommendedTasks: React.FC<{ onSelectTask: (task: string) => void }> = ({ onSelectTask }) => {
  const tasks = [
    "Buatkan rangkuman artikel dari halaman ini",
    "Cari informasi tentang produk X",
    "Ambil kontak dari halaman ini",
    "Ambil tabel data dari halaman ini",
    "Isi form pendaftaran",
  ];

  return (
    <Box mt={4}>
      <Text mb={2} fontSize="sm" fontWeight="medium" color="blue.700">
        Tugas yang disarankan:
      </Text>
      <Flex flexWrap="wrap" gap={2}>
        {tasks.map((task, index) => (
          <Button
            key={index}
            onClick={() => onSelectTask(task)}
            size="sm"
            px={3}
            py={1}
            height="auto"
            minH="30px"
            fontSize="xs"
            variant="unstyled"
            bg="rgba(255, 255, 255, 0.7)"
            color="blue.600"
            border="1px solid"
            borderColor="rgba(226, 232, 240, 0.8)"
            borderRadius="full"
            fontWeight="medium"
            whiteSpace="normal"
            textAlign="left"
            _hover={{
              bg: "linear-gradient(135deg, rgba(235, 248, 255, 0.9) 0%, rgba(215, 240, 255, 0.9) 100%)",
              borderColor: "blue.200",
              transform: "translateY(-2px)",
              boxShadow: "0 6px 12px rgba(66, 153, 225, 0.15)",
              color: "blue.700"
            }}
            _active={{
              bg: "rgba(235, 248, 255, 0.95)",
              transform: "translateY(0)",
              boxShadow: "0 2px 4px rgba(66, 153, 225, 0.1)"
            }}
            position="relative"
            overflow="hidden"
            transition="all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            backdropFilter="blur(8px)"
            boxShadow="0 2px 6px rgba(66, 153, 225, 0.08)"
          >
            {/* Subtle background glow effect */}
            <Box
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              bg={`radial-gradient(circle at ${index % 2 === 0 ? 'top left' : 'bottom right'}, rgba(66, 153, 225, 0.08) 0%, transparent 70%)`}
              opacity="0.8"
              animation={`float ${12 + index * 2}s infinite ease-in-out ${index * 1.5}s`}
              zIndex="0"
              pointerEvents="none"
            />
            
            <Text position="relative" zIndex="1">
              {task}
            </Text>
          </Button>
        ))}
      </Flex>
    </Box>
  );
};

// SendIcon dan MicIcon components
const SendIcon = () => <Icon as={FaPaperPlane} />;
const MicIcon = () => <Icon as={FaMicrophone} />;

export default TaskUI;
