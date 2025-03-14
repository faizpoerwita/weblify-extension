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
  Badge,
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

// Gradient dan warna yang konsisten dengan App.tsx
const gradientColors = {
  light: {
    primary: "linear-gradient(165deg, rgba(224,249,255,1) 0%, rgba(179,229,252,1) 40%, rgba(144,216,249,1) 60%, rgba(99,205,247,1) 100%)",
    secondary: "linear-gradient(135deg, rgba(214,242,255,1) 0%, rgba(191,232,253,1) 50%, rgba(166,223,251,1) 100%)",
    accent: "radial-gradient(circle, rgba(99,179,237,0.2) 0%, transparent 70%)",
    accentAlt: "radial-gradient(circle, rgba(66,153,225,0.2) 0%, transparent 70%)"
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

// Peningkatan formatActionDisplay dengan rendering yang lebih kaya visual
const formatActionDisplay = (action: ActionType): { title: string; description: string; color: string; icon: JSX.Element } => {
  let title = "Tindakan";
  let description = "";
  let color = "blue"; // Default color
  let icon: JSX.Element;

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

  // Assign appropriate color and icon per action type
  switch (name) {
    case "navigate":
      color = "blue";
      icon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="10 8 16 12 10 16 10 8"></polygon>
        </svg>
      );
      
      if (args?.url) {
        // Jika ada title yang disimpan di args, gunakan itu
        description = args.title ? 
          `${args.url} (${args.title})` : 
          args.url;
      }
      break;
      
    case "click":
      color = "orange";
      icon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 9v-6l5 9h-4l4 9-9-9h5z"></path>
        </svg>
      );
      
      if (args?.selector) {
        description = `pada elemen ${args.selector}`;
      }
      break;
      
    case ACTION_NAMES.EXTRACT:
      color = "purple";
      icon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4"></path>
          <path d="M17 9l-5 5-5-5"></path>
          <path d="M12 12V3"></path>
        </svg>
      );
      
      if (args?.selector) {
        description = `informasi dari ${args.selector}`;
      }
      break;
      
    case "scroll":
      color = "teal";
      icon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14"></path>
          {args?.direction === "up" ? 
            <path d="M7 10l5-5 5 5"></path> : 
            <path d="M7 14l5 5 5-5"></path>}
        </svg>
      );
      
      if (args?.direction) {
        description = `${args.direction === "up" ? "ke atas" : "ke bawah"}`;
      }
      break;
      
    case "wait":
      color = "cyan";
      icon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      );
      
      if (args?.duration) {
        description = `selama ${args.duration} detik`;
      }
      break;
      
    case ACTION_NAMES.FILL:
      color = "green";
      icon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      );
      
      if (args?.selector && args?.text) {
        description = `${args.selector} dengan '${args.text}'`;
      }
      break;
      
    default:
      color = "gray";
      icon = (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      );
      
      // Jika ada args yang diberikan tetapi tidak termasuk dalam case di atas
      if (args) {
        description = Object.entries(args)
          .filter(([key, value]) => value !== undefined && key !== 'success' && key !== 'error')
          .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
          .join(", ");
      }
  }

  return { title, description, color, icon };
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
        >
          {formatUserMessage(content)}
        </Text>
      );
    }

    return (
      <VStack align="stretch" spacing={4}>
        {/* Bagian Pemikiran AI */}
        {parsed.thought && (
          <Box
            bg="white"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="sm"
            borderWidth="1px"
            borderColor="blue.100"
            transition="all 0.2s"
            _hover={{ boxShadow: "md" }}
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
                    <path d="M12 2a10 10 0 0110 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2m0 6v4m0 4h.01"/>
                  </svg>
                </Box>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color="blue.700"
                >
                  Pemikiran AI
                </Text>
              </HStack>
            </Box>
            <Box p={4}>
              <Text fontSize="sm" color="gray.700" lineHeight="1.6">
                {parsed.thought.replace(/^(The user wants to|I will|I need to)\s*/, '').trim()}
              </Text>
            </Box>
          </Box>
        )}

        {/* Bagian Data */}
        {parsed.data && parsed.data.length > 0 && (
          <Box
            bg="white"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="sm"
            borderWidth="1px"
            borderColor="purple.100"
            transition="all 0.2s"
            _hover={{ boxShadow: "md" }}
          >
            <Box
              bg="purple.50"
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor="purple.100"
            >
              <HStack spacing={3}>
                <Box
                  bg="white"
                  p={2}
                  borderRadius="lg"
                  color="purple.500"
                  borderWidth="1px"
                  borderColor="purple.200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6v6l4 2m4-2a10 10 0 11-20 0 10 10 0 0120 0z"/>
                  </svg>
                </Box>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color="purple.700"
                >
                  Data
                </Text>
              </HStack>
            </Box>
            <Box p={4}>
              <VStack align="stretch" spacing={4}>
                {parsed.data.map((item: any, index: number) => {
                  switch (item.type) {
                    case 'json':
                      return (
                        <Box key={index}>
                          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>
                            Data Terstruktur
                          </Text>
                          <Box
                            bg={useColorModeValue("rgba(247, 250, 252, 0.8)", "rgba(23, 25, 35, 0.8)")}
                            borderRadius="lg"
                            p={3}
                            borderWidth="1px"
                            borderColor={useColorModeValue("gray.200", "gray.600")}
                            boxShadow="sm"
                            backdropFilter="blur(8px)"
                            transition="all 0.2s"
                            _hover={{ 
                              boxShadow: "md", 
                              borderColor: useColorModeValue("blue.200", "blue.500"),
                              transform: "translateY(-2px)"
                            }}
                            position="relative"
                            overflow="hidden"
                          >
                            {/* Decorative elements for glassmorphic effect */}
                            <Box
                              position="absolute"
                              top="-50%"
                              left="-20%"
                              width="50%"
                              height="200%"
                              background="linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0))"
                              transform="rotate(25deg)"
                              pointerEvents="none"
                            />
                            <Box
                              position="absolute"
                              top="0"
                              right="0"
                              width="100%"
                              height="100%"
                              background={useColorModeValue(
                                "radial-gradient(circle at top right, rgba(214, 242, 255, 0.3), transparent 70%)",
                                "radial-gradient(circle at top right, rgba(36, 99, 235, 0.1), transparent 70%)"
                              )}
                              pointerEvents="none"
                            />
                            
                            {/* Content */}
                            <Box position="relative" zIndex="1">
                              <JsonViewerForInvalidJson data={item.content} />
                            </Box>
                            
                            {/* Data type indicator */}
                            <Box
                              position="absolute"
                              top="6px"
                              right="6px"
                              borderRadius="full"
                              bg={useColorModeValue("blue.50", "blue.900")}
                              color={useColorModeValue("blue.500", "blue.200")}
                              px={2}
                              py={0.5}
                              fontSize="xs"
                              fontWeight="medium"
                              opacity="0.7"
                              _hover={{ opacity: 1 }}
                              transition="opacity 0.2s"
                            >
                              JSON
                            </Box>
                          </Box>
                        </Box>
                      );
                    case 'table':
                      return (
                        <Box key={index}>
                          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>
                            Tabel Data
                          </Text>
                          <Box
                            overflowX="auto"
                            bg={useColorModeValue("rgba(247, 250, 252, 0.8)", "rgba(23, 25, 35, 0.8)")}
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor={useColorModeValue("gray.200", "gray.600")}
                            backdropFilter="blur(8px)"
                            boxShadow="sm"
                            transition="all 0.2s"
                            _hover={{ 
                              boxShadow: "md",
                              borderColor: useColorModeValue("blue.200", "blue.500") 
                            }}
                            position="relative"
                            overflow="hidden"
                          >
                            {/* Decorative elements */}
                            <Box
                              position="absolute"
                              top="0"
                              left="0"
                              width="100%"
                              height="100%"
                              background={useColorModeValue(
                                "linear-gradient(135deg, rgba(214, 242, 255, 0.2), transparent 80%)",
                                "linear-gradient(135deg, rgba(36, 99, 235, 0.05), transparent 80%)"
                              )}
                              pointerEvents="none"
                            />
                            
                            {/* Table wrapper */}
                            <Box position="relative" zIndex="1">
                            <Box as="table" width="100%" fontSize="sm">
                              {item.content.headers && (
                                  <Box as="thead" bg={useColorModeValue("gray.100", "gray.700")}>
                                  <Box as="tr">
                                    {item.content.headers.map((header: string, idx: number) => (
                                      <Box
                                        key={idx}
                                        as="th"
                                        p={2}
                                        textAlign="left"
                                        fontWeight="medium"
                                          color={useColorModeValue("gray.700", "gray.300")}
                                          borderBottom="2px solid"
                                          borderColor={useColorModeValue("blue.100", "blue.800")}
                                      >
                                        {header}
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              )}
                              <Box as="tbody">
                                {item.content.rows.map((row: any[], rowIdx: number) => (
                                  <Box
                                    key={rowIdx}
                                    as="tr"
                                    borderTopWidth="1px"
                                      borderColor={useColorModeValue("gray.200", "gray.600")}
                                      transition="background 0.2s"
                                      _hover={{
                                        bg: useColorModeValue("blue.50", "blue.900"),
                                      }}
                                  >
                                    {row.map((cell, cellIdx) => (
                                      <Box
                                        key={cellIdx}
                                        as="td"
                                        p={2}
                                          color={useColorModeValue("gray.600", "gray.300")}
                                      >
                                        {cell}
                                      </Box>
                                    ))}
                                  </Box>
                                ))}
                              </Box>
                              </Box>
                            </Box>
                            
                            {/* Data type indicator */}
                            <Box
                              position="absolute"
                              top="6px"
                              right="6px"
                              borderRadius="full"
                              bg={useColorModeValue("purple.50", "purple.900")}
                              color={useColorModeValue("purple.500", "purple.200")}
                              px={2}
                              py={0.5}
                              fontSize="xs"
                              fontWeight="medium"
                              opacity="0.7"
                              _hover={{ opacity: 1 }}
                              transition="opacity 0.2s"
                            >
                              TABEL
                            </Box>
                          </Box>
                        </Box>
                      );
                    case 'list':
                      return (
                        <Box key={index}>
                          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>
                            Daftar
                          </Text>
                          <VStack align="stretch" spacing={2}>
                            {item.content.map((listItem: string, idx: number) => (
                              <HStack key={idx} spacing={3} align="start">
                                <Box
                                  w="2px"
                                  h="2px"
                                  borderRadius="full"
                                  bg="purple.400"
                                  mt={2.5}
                                />
                                <Text fontSize="sm" color="gray.700" flex={1}>
                                  {listItem}
                                </Text>
                              </HStack>
                            ))}
                          </VStack>
                        </Box>
                      );
                    case 'code':
                      return (
                        <Box key={index}>
                          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>
                            Kode
                          </Text>
                          <Box
                            p={3}
                            bg={useColorModeValue("rgba(247, 250, 252, 0.8)", "rgba(26, 32, 44, 0.8)")}
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor={useColorModeValue("gray.200", "gray.600")}
                            boxShadow="sm"
                            backdropFilter="blur(8px)"
                            position="relative"
                            overflow="hidden"
                            transition="all 0.2s"
                            _hover={{ 
                              boxShadow: "md",
                              borderColor: useColorModeValue("green.200", "green.700"),
                              transform: "translateY(-2px)"
                            }}
                          >
                            {/* Decorative elements */}
                            <Box
                              position="absolute"
                              top="-10%"
                              left="-5%"
                              width="30%"
                              height="120%"
                              background="linear-gradient(45deg, rgba(72, 187, 120, 0.05), rgba(72, 187, 120, 0))"
                              transform="rotate(15deg)"
                              pointerEvents="none"
                            />
                            
                            {/* Line numbers decoration (fake) */}
                            <Box
                              position="absolute"
                              left="0"
                              top="0"
                              bottom="0"
                              width="40px"
                              bg={useColorModeValue("rgba(237, 242, 247, 0.6)", "rgba(45, 55, 72, 0.3)")}
                              borderRight="1px solid"
                              borderColor={useColorModeValue("gray.200", "gray.600")}
                              pointerEvents="none"
                            />
                            
                            {/* Code content */}
                            <Text
                              fontSize="sm"
                              fontFamily="inherit"
                              color={useColorModeValue("gray.700", "gray.300")}
                              whiteSpace="pre-wrap"
                              pl="45px"
                              position="relative"
                              zIndex="1"
                            >
                              {item.content}
                            </Text>
                            
                            {/* Data type indicator */}
                            <Box
                              position="absolute"
                              top="6px"
                              right="6px"
                              borderRadius="full"
                              bg={useColorModeValue("green.50", "green.900")}
                              color={useColorModeValue("green.600", "green.200")}
                              px={2}
                              py={0.5}
                              fontSize="xs"
                              fontWeight="medium"
                              opacity="0.7"
                              _hover={{ opacity: 1 }}
                              transition="opacity 0.2s"
                            >
                              CODE
                            </Box>
                          </Box>
                        </Box>
                      );
                    case 'link':
                      return (
                        <Box
                          key={index}
                          as="a"
                          href={item.content.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          p={2}
                          bg="purple.50"
                          borderRadius="md"
                          color="purple.600"
                          fontSize="sm"
                          _hover={{
                            bg: "purple.100",
                            textDecoration: "none"
                          }}
                        >
                          {item.content.text || item.content.url}
                        </Box>
                      );
                    default:
                      return (
                        <Text
                          key={index}
                          fontSize="sm"
                          color="gray.700"
                          lineHeight="1.6"
                        >
                          {item.content}
                        </Text>
                      );
                  }
                })}
              </VStack>
            </Box>
          </Box>
        )}

        {/* Bagian Aksi */}
        {parsed.action && (
          <Box
            bg="white"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="sm"
            borderWidth="1px"
            borderColor={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.100`}
            transition="all 0.2s"
            _hover={{ boxShadow: "md" }}
          >
            <Box
              bg={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.50`}
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.100`}
            >
              <HStack spacing={3} justify="space-between">
                <HStack spacing={3}>
                  <Box
                    bg="white"
                    p={2}
                    borderRadius="lg"
                    color={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.500`}
                    borderWidth="1px"
                    borderColor={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.200`}
                  >
                    {getActionIcon(parsed.action.name)}
                  </Box>
                  <VStack spacing={0} align="start">
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.700`}
                    >
                      {parsed.action.name && actionTitles[parsed.action.name as keyof typeof actionTitles] || parsed.action.name}
                    </Text>
                    <Text fontSize="xs" color={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.600`}>
                      {getStatusDisplay(parsed.action.status || 'idle', parsed.action)}
                    </Text>
                  </VStack>
                </HStack>
                {parsed.action.metadata?.duration && (
                  <Text fontSize="xs" color="gray.500">
                    {(parsed.action.metadata.duration / 1000).toFixed(1)}s
                  </Text>
                )}
              </HStack>
            </Box>

            {/* Konten Aksi */}
            <Box p={4}>
              <VStack align="stretch" spacing={3}>
                {/* Preview URL untuk Aksi Navigasi */}
                {parsed.action.name === ACTION_NAMES.NAVIGATE && parsed.action.args?.url && (
                  <Box
                    p={3}
                    bg="gray.50"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    {(() => {
                      const urlData = processUrlData(parsed.action.args.url);
                      if (!urlData) return null;

                      return (
                        <VStack align="stretch" spacing={3}>
                          <HStack spacing={3}>
                            <Box
                              p={1.5}
                              bg="white"
                              borderRadius="lg"
                              borderWidth="1px"
                              borderColor="gray.200"
                            >
                              <img
                                src={urlData.favicon}
                                alt=""
                                width="20"
                                height="20"
                                style={{ display: 'block' }}
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ3NyAyIDIgNi40NzcgMiAxMnM0LjQ3NyAxMCAxMCAxMCAxMC00LjQ3NyAxMC0xMFMxNy41MjMgMiAxMiAyeiIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==';
                                }}
                              />
                            </Box>
                            <VStack spacing={0} align="start" flex={1}>
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                color="gray.700"
                              >
                                {urlData.title}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {urlData.domain}
                              </Text>
                            </VStack>
                          </HStack>

                          <Box
                            p={2}
                            bg="white"
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor="gray.200"
                          >
                            <HStack spacing={2}>
                              <Box color={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.500`}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                                  <path d="M15 3h6v6"/>
                                  <path d="M10 14L21 3"/>
                                </svg>
                              </Box>
                              <Text
                                fontSize="xs"
                                fontFamily="inherit"
                                color="gray.600"
                                flex={1}
                                noOfLines={1}
                              >
                                {urlData.fullUrl}
                              </Text>
                            </HStack>
                          </Box>

                          {/* Info Tambahan */}
                          <HStack spacing={3}>
                            {urlData.searchQuery && (
                              <HStack spacing={2}>
                                <Box color={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.500`}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"/>
                                    <path d="M21 21l-4.35-4.35"/>
                                  </svg>
                                </Box>
                                <Text fontSize="xs" color="gray.600">
                                  {urlData.searchQuery}
                                </Text>
                              </HStack>
                            )}
                            {urlData.contentType !== 'page' && (
                              <HStack spacing={2}>
                                <Box color={`${getStatusColor(parsed.action.status || 'idle', parsed.action)}.500`}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                                  </svg>
                                </Box>
                                <Text fontSize="xs" color="gray.600" textTransform="capitalize">
                                  {urlData.contentType}
                                </Text>
                              </HStack>
                            )}
                          </HStack>
                        </VStack>
                      );
                    })()}
                  </Box>
                )}

                {/* Argumen Aksi Lainnya */}
                {parsed.action.args && Object.entries(parsed.action.args).map(([key, value]) => {
                  if (key === 'url') return null;
                  if (key === 'details' && Array.isArray(value)) {
                    return (
                      <Box key={key}>
                        <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>
                          Detail
                        </Text>
                        <VStack align="stretch" spacing={2}>
                          {value.map((detail, idx) => (
                            <HStack key={idx} spacing={2}>
                              <Box w="2px" h="2px" borderRadius="full" bg="gray.400" mt={2} />
                              <Text fontSize="xs" color="gray.600">
                                {detail}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    );
                  }
                  return (
                    <HStack key={key} spacing={3}>
                      <Text
                        fontSize="xs"
                        fontWeight="medium"
                        color="gray.500"
                        textTransform="capitalize"
                        w="80px"
                      >
                        {key}
                      </Text>
                      <Box
                        flex={1}
                        p={2}
                        bg="gray.50"
                        borderRadius="md"
                        fontSize="xs"
                        fontFamily="inherit"
                      >
                        <Text color="gray.700">
                          {typeof value === 'object' ? (
                            <JsonViewerForInvalidJson data={value} />
                          ) : (
                            String(value)
                          )}
                        </Text>
                      </Box>
                    </HStack>
                  );
                })}
              </VStack>
            </Box>
          </Box>
        )}

        {/* Bagian Pesan */}
        {parsed.message && (
          <Box
            bg="white"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="sm"
            borderWidth="1px"
            borderColor="teal.100"
            transition="all 0.2s"
            _hover={{ boxShadow: "md" }}
          >
            <Box
              bg="teal.50"
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor="teal.100"
            >
              <HStack spacing={3}>
                <Box
                  bg="white"
                  p={2}
                  borderRadius="lg"
                  color="teal.500"
                  borderWidth="1px"
                  borderColor="teal.200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </Box>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color="teal.700"
                >
                  Respon AI
                </Text>
              </HStack>
            </Box>
            <Box p={4}>
              <VStack align="stretch" spacing={3}>
                {parsed.message.split('\n').map((line: string, idx: number) => {
                  if (line.trim().startsWith('•')) {
                    return (
                      <HStack key={idx} spacing={3} align="start">
                        <Box
                          w="2px"
                          h="2px"
                          borderRadius="full"
                          bg="teal.400"
                          mt={2.5}
                        />
                        <Text fontSize="sm" color="gray.700" flex={1}>
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
                        bg="gray.50"
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor="gray.200"
                      >
                        <Text
                          fontSize="sm"
                          fontFamily="inherit"
                          color="gray.700"
                          whiteSpace="pre-wrap"
                        >
                          {code}
                        </Text>
                      </Box>
                    );
                  }

                  if (line.includes('http')) {
                    return (
                      <Box
                        key={idx}
                        as="a"
                        href={line.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        p={2}
                        bg="teal.50"
                        borderRadius="md"
                        color="teal.600"
                        fontSize="sm"
                        _hover={{
                          bg: "teal.100",
                          textDecoration: "none"
                        }}
                      >
                        {line.trim()}
                      </Box>
                    );
                  }

                  return (
                    <Text
                      key={idx}
                      fontSize="sm"
                      color="gray.700"
                      lineHeight="1.6"
                    >
                      {line}
                    </Text>
                  );
                })}
              </VStack>
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
                              
                              {/* Render tindakan menggunakan hasil formatActionDisplay dengan UI yang lebih menarik */}
                              {typeof jsonData.action === 'object' && (
                                <Box px={{base: 0, md: 2}}>
                                  {(() => {
                                    // Gunakan action dari jsonData
                                    const action = jsonData.action;
                                    // Dapatkan informasi display yang diperkaya
                                    const { title, description, color, icon } = formatActionDisplay(action);
                                    const { name, args, status } = action;
                                    
                                    // Identifikasi apakah aksi ini memiliki URL (untuk navigasi)
                                    const hasUrl = name === 'navigate' && args?.url;
                                    
                                    // Deteksi rasio vertikal
                                    const isExtremeVertical = window.innerHeight > window.innerWidth * 2.5;
                                    
                                    return (
                                      <Box
                                        borderWidth="1px"
                                        borderColor={`${color}.200`}
                                        borderRadius="lg"
                                        overflow="hidden"
                                        bg="white"
                                        boxShadow="sm"
                                        transition="all 0.2s"
                                        _hover={{ 
                                          boxShadow: "md", 
                                          borderColor: `${color}.300`,
                                          transform: "translateY(-2px)"
                                        }}
                                        mb={2}
                                        position="relative"
                                      >
                                        {/* Header aksi */}
                                        <Flex 
                                          bg={`${color}.50`} 
                                          p={{base: 2.5, md: 2}} 
                                          borderBottomWidth="1px" 
                                          borderColor={`${color}.100`}
                                          align="center"
                                          justify="space-between"
                                          position="relative"
                                        >
                                          <Flex align="center">
                                            {/* Ikon aksi dengan animasi subtle */}
                                            <Box
                                              p={1.5}
                                              borderRadius="md"
                                              bg={`${color}.100`}
                                              color={`${color}.700`}
                                              mr={2}
                                              transition="all 0.3s"
                                              _groupHover={{
                                                bg: `${color}.200`,
                                                transform: "scale(1.05)",
                                              }}
                                            >
                                              {icon}
                                            </Box>
                                            
                                            {/* Judul aksi */}
                                            <Text
                                              fontSize={{base: "sm", md: "sm"}}
                                              fontWeight="bold"
                                              color={`${color}.800`}
                                              bgGradient={`linear(to-r, ${color}.600, ${color}.400)`}
                                              bgClip="text"
                                              letterSpacing="tight"
                                            >
                                              {title}
                                            </Text>
                                          </Flex>
                                        </Flex>
                                        
                                        {/* Konten aksi */}
                                        <Box p={{base: 3, md: 2.5}}>
                                          {/* Tampilan khusus untuk navigasi website */}
                                          {hasUrl && args?.url ? (
                                            <Flex direction={{base: "column", md: "row"}} gap={{base: 2, md: 3}}>
                                              {/* Favicon website */}
                                              <Box 
                                                borderWidth="1px"
                                                borderColor="gray.200"
                                                borderRadius="md"
                                                overflow="hidden"
                                                width={{base: "40px", md: "36px"}}
                                                height={{base: "40px", md: "36px"}}
                                                bg="white"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                flexShrink={0}
                                              >
                                                <Image 
                                                  src={`https://www.google.com/s2/favicons?domain=${new URL(args.url).hostname}&sz=48`}
                                                  alt="Website favicon"
                                                  width="24px"
                                                  height="24px"
                                                  fallback={
                                                    <Box p={1} color="gray.400">
                                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <line x1="2" y1="12" x2="22" y2="12"></line>
                                                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path>
                                                      </svg>
                                                    </Box>
                                                  }
                                                />
                                              </Box>
                                              
                                              {/* URL dan info website */}
                                              <Box flex="1">
                                                {/* Judul Website jika tersedia */}
                                                {args.title && (
                                                  <Text 
                                                    fontSize={{base: "sm", md: "sm"}}
                                                    fontWeight="semibold"
                                                    color="gray.800"
                                                    mb={1}
                                                    noOfLines={1}
                                                    title={args.title}
                                                  >
                                                    {args.title}
                                                  </Text>
                                                )}
                                                
                                                {/* URL dengan format elegan */}
                                                <Box 
                                                  bg="gray.50"
                                                  p={2}
                                                  borderRadius="md"
                                                  borderWidth="1px"
                                                  borderColor="gray.200"
                                                  fontSize={{base: "xs", md: "xs"}}
                                                  fontFamily="monospace"
                                                  color="gray.700"
                                                  _hover={{
                                                    borderColor: `${color}.300`,
                                                    bg: "gray.100"
                                                  }}
                                                  transition="all 0.2s"
                                                >
                                                  <Text 
                                                    noOfLines={1}
                                                    title={args.url}
                                                  >
                                                    {/* Format URL berdasarkan rasio layar */}
                                                    {(() => {
                                                      try {
                                                        const url = new URL(args.url);
                                                        
                                                        if (isExtremeVertical) {
                                                          // Format super ringkas untuk rasio vertikal ekstrem
                                                          return url.hostname.replace('www.', '');
                                                        } else if (window.innerWidth < 400) {
                                                          // Format ringkas untuk layar kecil
                                                          const path = url.pathname !== '/' ? '/...' : '';
                                                          return `${url.hostname.replace('www.', '')}${path}`;
                                                        } else {
                                                          // Format lengkap
                                                          return args.url.replace(/^(https?:\/\/)?(www\.)?/, '');
                                                        }
                                                      } catch(e) {
                                                        return args.url;
                                                      }
                                                    })()}
                                                  </Text>
                                                </Box>
                                              </Box>
                                            </Flex>
                                          ) : (
                                            // Tampilan untuk aksi non-navigasi
                                            <Text 
                                              fontSize={{base: "sm", md: "sm"}}
                                              color="gray.700"
                                              fontWeight="medium"
                                            >
                                              {description}
                                            </Text>
                                          )}
                                          
                                          {/* Tampilkan detail tambahan jika tersedia */}
                                          {args?.details && args.details.length > 0 && (
                                            <Box mt={2} bg="gray.50" p={2} borderRadius="md" borderWidth="1px" borderColor="gray.200">
                                              <Text fontSize="xs" fontWeight="semibold" color="gray.600" mb={1}>Detail Tambahan:</Text>
                                              <UnorderedList pl={4} spacing={1} fontSize="xs" color="gray.600">
                                                {args.details.map((detail, idx) => (
                                                  <ListItem key={idx}>{detail}</ListItem>
                                                ))}
                                              </UnorderedList>
                                            </Box>
                                          )}
                                          
                                          {/* Tampilkan pesan error jika ada */}
                                          {args?.error && (
                                            <Box 
                                              mt={2} 
                                              bg="red.50" 
                                              p={2} 
                                              borderRadius="md" 
                                              borderWidth="1px" 
                                              borderColor="red.200"
                                              color="red.700"
                                              fontSize="xs"
                                            >
                                              <Flex align="center" mb={1}>
                                                <Box mr={1} color="red.500">
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

export default TaskUI;
