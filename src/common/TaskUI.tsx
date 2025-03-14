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
  SEARCH: 'search'
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
  [ACTION_NAMES.SEARCH]: 'Cari'
};

const formatActionDisplay = (action: ActionType): { title: string; description: string } => {
  const title = actionTitles[action.name] || action.name;
  let description = '';

  if (action.args) {
    const { url, selector, text, duration, direction } = action.args;
    if (url) {
      try {
        const urlData = processUrlData(url);
        if (urlData) {
          description = urlData.title;
        } else {
          const urlObj = new URL(url);
          description = `${urlObj.hostname.replace('www.', '')}${urlObj.pathname !== '/' ? urlObj.pathname : ''}`;
        }
      } catch {
        description = url;
      }
    }
    if (selector) description = `pada ${selector}`;
    if (text) description = `"${text}"`;
    if (duration) description = `selama ${duration}ms`;
    if (direction) description = `ke ${direction}`;
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
    switch (status) {
      case ACTION_STATUSES.SUCCESS:
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        );
      case ACTION_STATUSES.ERROR:
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        );
      case ACTION_STATUSES.WARNING:
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4M12 17h.01M12 3l9 16H3L12 3z"/>
          </svg>
        );
      case ACTION_STATUSES.RUNNING:
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        );
      default:
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
        );
    }
  };

  return (
    <Flex align="center" gap={2}>
      <Box
        color={`${getStatusColor(status, action)}.500`}
        animation={status === ACTION_STATUSES.RUNNING ? "spin 2s linear infinite" : undefined}
        sx={{
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" }
          }
        }}
      >
        {getStatusIcon()}
      </Box>
      <Text 
        fontSize="xs" 
        color={`${getStatusColor(status, action)}.600`}
        fontWeight="medium"
        letterSpacing="0.02em"
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

// Tambahkan fungsi helper untuk deteksi dan perbaikan JSON
const tryParseJSON = (text: string): { isValid: boolean; data?: any; fixedText?: string } => {
  // Pertama coba parse langsung
  try {
    const data = JSON.parse(text);
    return { isValid: true, data };
  } catch (e) {
    // JSON tidak valid, coba perbaiki format umum
    try {
      // Perbaiki kasus single quotes ke double quotes
      let fixedText = text.replace(/'/g, '"');
      
      // Perbaiki quotes pada keys yang tidak ada quotes
      fixedText = fixedText.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      
      // Coba parse hasil perbaikan
      const data = JSON.parse(fixedText);
      return { isValid: true, data, fixedText };
    } catch (e) {
      return { isValid: false };
    }
  }
};

// Tambahkan fungsi untuk mendeteksi JSON dalam string biasa
const containsJSON = (text: string): { isJSON: boolean; jsonContent?: string; prefix?: string; suffix?: string } => {
  // Pola untuk menemukan kemungkinan blok JSON dalam teks
  const jsonPattern = /({[\s\S]*}|\[[\s\S]*\])/;
  const match = text.match(jsonPattern);
  
  if (match) {
    const jsonContent = match[0];
    const startIndex = text.indexOf(jsonContent);
    const prefix = text.substring(0, startIndex);
    const suffix = text.substring(startIndex + jsonContent.length);
    
    // Cek apakah konten adalah JSON valid
    const parseResult = tryParseJSON(jsonContent);
    if (parseResult.isValid) {
      return { 
        isJSON: true, 
        jsonContent: parseResult.fixedText || jsonContent,
        prefix: prefix.trim(),
        suffix: suffix.trim()
      };
    }
  }
  
  return { isJSON: false };
};

const MessageContent: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  try {
    // Pertama coba parse sebagai AIJsonResponse
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

    // Lanjutkan dengan kode yang ada untuk parsing AIJsonResponse
    return (
      <VStack align="stretch" spacing={4}>
        {/* Existing AIJsonResponse rendering code */}
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

        {/* Continue with existing data, action, message rendering */}
        {parsed.data && parsed.data.length > 0 && (
          /* Existing data rendering */
          <Box>
            {/* Continue with existing data rendering */}
          </Box>
        )}

        {parsed.action && (
          /* Existing action rendering */
          <Box>
            {/* Continue with existing action rendering */}
          </Box>
        )}

        {parsed.message && (
          /* Existing message rendering */
          <Box>
            {/* Continue with existing message rendering */}
          </Box>
        )}
      </VStack>
    );
  } catch (error) {
    // Jika parse AIJsonResponse gagal, coba deteksi JSON dalam konten
    const jsonDetection = containsJSON(content);
    
    if (jsonDetection.isJSON && !isUser) {
      // Konten mengandung JSON yang valid
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
            {/* Prefix */}
            {jsonDetection.prefix && (
              <Text
                fontSize="sm"
                color={isUser ? "white" : "gray.700"}
                lineHeight="1.6"
              >
                {jsonDetection.prefix}
              </Text>
            )}
            
            {/* JSON Content */}
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
              {/* Decorative elements */}
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
              
              <Box position="relative" zIndex="1">
                <JsonViewer data={JSON.parse(jsonDetection.jsonContent || '{}')} />
              </Box>
              
              {/* Badge */}
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
            
            {/* Suffix */}
            {jsonDetection.suffix && (
              <Text
                fontSize="sm"
                color={isUser ? "white" : "gray.700"}
                lineHeight="1.6"
              >
                {jsonDetection.suffix}
              </Text>
            )}
          </VStack>
        </Box>
      );
    }
    
    // Fallback ke tampilan teks biasa, tapi dengan deteksi JSON per baris
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
            // Deteksi JSON dalam setiap baris
            if (!isUser) {
              const lineJsonDetection = containsJSON(line);
              if (lineJsonDetection.isJSON) {
                return (
                  <Box key={idx}>
                    {lineJsonDetection.prefix && (
                      <Text
                        fontSize="sm"
                        color="gray.700"
                        lineHeight="1.6"
                        mb={2}
                      >
                        {lineJsonDetection.prefix}
                      </Text>
                    )}
                    
                    <Box
                      bg={useColorModeValue("rgba(247, 250, 252, 0.8)", "rgba(23, 25, 35, 0.8)")}
                      borderRadius="lg"
                      p={3}
                      borderWidth="1px"
                      borderColor={useColorModeValue("gray.200", "gray.600")}
                      boxShadow="sm"
                      backdropFilter="blur(8px)"
                      position="relative"
                    >
                      <JsonViewer data={JSON.parse(lineJsonDetection.jsonContent || '{}')} />
                      
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
                      >
                        JSON
                      </Box>
                    </Box>
                    
                    {lineJsonDetection.suffix && (
                      <Text
                        fontSize="sm"
                        color="gray.700"
                        lineHeight="1.6"
                        mt={2}
                      >
                        {lineJsonDetection.suffix}
                      </Text>
                    )}
                  </Box>
                );
              }
            }
            
            // Deteksi code block JSON
            if (!isUser && line.includes('```json')) {
              try {
                // Extract JSON content from code block
                const matches = line.match(/```json\s*([\s\S]*?)```/);
                if (matches && matches[1]) {
                  const jsonContent = matches[1].trim();
                  const parseResult = tryParseJSON(jsonContent);
                  
                  if (parseResult.isValid) {
                    return (
                      <Box
                        key={idx}
                        bg={useColorModeValue("rgba(247, 250, 252, 0.8)", "rgba(23, 25, 35, 0.8)")}
                        borderRadius="lg"
                        p={3}
                        borderWidth="1px"
                        borderColor={useColorModeValue("gray.200", "gray.600")}
                        boxShadow="sm"
                        backdropFilter="blur(8px)"
                        position="relative"
                      >
                        <JsonViewer data={parseResult.data} />
                        
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
                        >
                          JSON
                        </Box>
                      </Box>
                    );
                  }
                }
              } catch (e) {
                // Fall back to regular code handling
              }
            }
            
            // Original line parsing logic
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

            if (line.includes('```') && !line.includes('```json')) {
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
                    fontFamily="mono"
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
          boxShadow="0 2px 8px rgba(0, 0, 0, 0.05)"
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
            bg="linear-gradient(135deg, rgba(214, 238, 255, 0.6) 0%, rgba(227, 246, 255, 0.4) 100%)"
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
        maxW={isUser ? "80%" : "85%"}
        bg={isUser 
          ? "linear-gradient(135deg, #3182ce 0%, #4299e1 100%)" 
          : "rgba(255, 255, 255, 0.85)"}
        color={isUser ? "white" : "gray.700"}
        borderRadius={isUser ? "2xl 2xl 0 2xl" : "0 2xl 2xl 2xl"}
        boxShadow={isUser 
          ? "0 4px 12px rgba(66, 153, 225, 0.24)" 
          : "0 4px 12px rgba(0, 0, 0, 0.06)"}
        border="1px solid"
        borderColor={isUser ? "blue.500" : "rgba(226, 232, 240, 0.6)"}
        overflow="hidden"
        transition="all 0.2s ease"
        _hover={{
          transform: "translateY(-2px)",
          boxShadow: isUser 
            ? "0 6px 16px rgba(66, 153, 225, 0.3)" 
            : "0 6px 16px rgba(0, 0, 0, 0.08)"
        }}
        backdropFilter={isUser ? "none" : "blur(10px)"}
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
            background="radial-gradient(circle at 30% 30%, rgba(99,179,237,0.4) 0%, transparent 70%)"
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
            px={4}
            py={3}
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
  thought?: string;
  action?: {
    name: ActionName;
    args?: Record<string, any>;
    status?: ActionStatus;
    details?: string[];
    metadata?: {
      timestamp?: string;
      duration?: number;
      success?: boolean;
      error?: string;
    };
  };
  message?: string;
  data?: {
    type: 'text' | 'code' | 'list' | 'link' | 'table' | 'json';
    content: any;
    metadata?: Record<string, any>;
  }[];
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
        fontFamily="mono"
        fontSize="sm"
        borderRadius="sm"
        px={typeof data === 'string' ? 1 : 0}
        bg={typeof data === 'string' ? 'whiteAlpha.300' : 'transparent'}
      >
        {data === null ? 'null' : 
         typeof data === 'string' ? `"${data}"` : 
         String(data)}
      </Text>
    );
  }

  const isArray = Array.isArray(data);
  const isEmpty = Object.keys(data).length === 0;

  if (isEmpty) {
    return (
      <Text as="span" color={colors.bracket} fontFamily="mono" fontSize="sm">
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
        <Text fontFamily="mono" color={colors.bracket} fontSize="sm">
          {isArray ? '[' : '{'}
        </Text>
        {!expanded && (
          <Text fontFamily="mono" color="gray.500" fontSize="xs" ml={1} fontStyle="italic">
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
                <Text color={colors.key} fontFamily="mono" fontSize="sm" fontWeight="medium">
                  {isArray ? 
                    <Box as="span" px={1} fontSize="xs" bg={useColorModeValue("gray.100", "gray.600")} borderRadius="sm" mr={1}>
                      {key}
                    </Box> : 
                    `"${key}":`
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
      
      <Text fontFamily="mono" color={colors.bracket} fontSize="sm" pl={expanded ? indent : 0}>
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
        if (state.instructions?.trim()) {
          runTask();
        }
      }
    }
  };

  // Tambahkan state untuk task execution
  const [taskExecution, setTaskExecution] = useState<{
    isPaused: boolean;
    currentStep: number;
    remainingSteps: any[];
  }>({
    isPaused: false,
    currentStep: 0,
    remainingSteps: []
  });

  // Fungsi untuk menangani stop task
  const handleStopTask = useCallback(() => {
    if (state.taskStatus === "running") {
      state.interruptTask();
      console.log('Task stopped via interrupt');
      toast({
        title: "Task dihentikan",
        description: "Task telah berhasil dihentikan",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "top"
      });
    }
  }, [state.taskStatus, state.interruptTask, toast]);

  // Update task execution state saat ada perubahan
  useEffect(() => {
    if (state.taskStatus === "running" && !taskExecution.isPaused) {
      // Update progress
      setTaskExecution(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1
      }));
    }
  }, [state.taskStatus, taskExecution.isPaused]);

  const displayHistory = transformTaskHistory(state.taskHistory);

  const getCurrentTaskTitle = useCallback((instructions: string) => {
    if (!instructions) return "Running task...";
    if (instructions.length > 50) {
      return `${instructions.substring(0, 50)}...`;
    }
    return instructions;
  }, []);

  // Determine current action for display
  const currentAction = useMemo(() => {
    const lastHistoryEntry = state.taskHistory[state.taskHistory.length - 1];
    return lastHistoryEntry?.action?.operation?.name;
  }, [state.taskHistory]);

  return (
    <>
      {/* Global styles untuk animasi */}
      <Global 
        styles={css`
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
        `}
      />
      
      {/* TaskProgressBar yang independen, muncul sebagai notifikasi menggunakan Portal */}
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
          onStop={handleStopTask}
          currentTask={getCurrentTaskTitle(state.instructions || "")}
              isScrollingDown={false}
              currentAction={currentAction as ActionName}
            />
          </Box>
        </Portal>
      )}

      <Box 
        h="100%" 
        display="flex" 
        flexDirection="column" 
        position="relative"
        background="transparent"
        borderRadius="xl"
        overflow="hidden"
        boxShadow="0 8px 32px rgba(0, 0, 0, 0.08)"
      >
        {/* Background animasi gradient yang seamless dengan App.tsx */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          zIndex="0"
          pointerEvents="none"
          bg={gradientColors.light.primary}
          backgroundSize="300% 300%"
          animation="gradient-flow 18s ease-in-out infinite"
          overflow="hidden"
        >
          {/* Animated background effects - persis seperti di App.tsx */}
          <Box
            position="absolute"
            top="-10%"
            left="-10%"
            width="120%"
            height="120%"
            opacity="0.6"
            animation="rotate 60s linear infinite"
            sx={{
              background: "radial-gradient(ellipse at center, rgba(99,179,237,0.15) 0%, rgba(99,179,237,0) 70%)"
            }}
          />
          
          {/* Subtle animated blue blobs */}
          <Box
            position="absolute"
            top="10%"
            left="5%"
            width="30%"
            height="40%"
            opacity="0.6"
            animation="float 18s infinite ease-in-out"
            sx={{
              background: "radial-gradient(circle, rgba(99,179,237,0.12) 0%, transparent 70%)",
              borderRadius: "50%"
            }}
          />
          
          <Box
            position="absolute"
            bottom="20%"
            right="10%"
            width="25%"
            height="30%"
            opacity="0.6"
            animation="float 15s infinite ease-in-out reverse"
            sx={{
              background: "radial-gradient(circle, rgba(66,153,225,0.12) 0%, transparent 70%)",
              borderRadius: "50%"
            }}
          />
          
          {/* Additional subtle blue blobs - persis seperti di App.tsx */}
          <Box
            position="absolute"
            top="60%"
            left="25%"
            width="20%"
            height="25%"
            opacity="0.5"
            animation="float 20s infinite ease-in-out 2s"
            sx={{
              background: "radial-gradient(circle, rgba(144,205,244,0.1) 0%, transparent 70%)",
              borderRadius: "50%"
            }}
          />
          
          <Box
            position="absolute"
            top="30%"
            right="15%"
            width="35%"
            height="20%"
            opacity="0.5" 
            animation="float 25s infinite ease-in-out 1s"
            sx={{
              background: "radial-gradient(circle, rgba(129,198,246,0.1) 0%, transparent 70%)",
              borderRadius: "50%"
            }}
          />
        </Box>

        {/* Konten utama */}
      <Box 
        flex="1" 
        overflowY="auto" 
        px={4} 
        pt={4}
        ref={chatContainerRef}
          position="relative"
          zIndex="1"
          sx={{
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
              background: "rgba(237, 242, 247, 0.3)",
              borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
              background: "rgba(160, 174, 192, 0.5)",
            borderRadius: "3px",
              "&:hover": {
                background: "rgba(160, 174, 192, 0.7)",
              }
          },
        }}
      >
        {/* Welcome Message */}
        {displayHistory.length === 0 && (
          <ChatMessage
            isUser={false}
            content={WELCOME_MESSAGE}
            status={ACTION_STATUSES.IDLE}
          />
        )}
        
        {displayHistory.map((entry, index) => (
          <ChatMessage
            key={index}
            isUser={entry.type === "user"}
            content={entry.message}
            status={entry.type === "assistant" ? entry.status : ACTION_STATUSES.IDLE}
          />
        ))}
        {taskInProgress && (
          <ChatMessage
            isUser={false}
            content="Sedang memproses permintaan Anda..."
            status={ACTION_STATUSES.RUNNING}
          />
        )}
      </Box>

      <Box 
        p={3}
        borderTop="1px solid" 
          borderColor="rgba(226, 232, 240, 0.8)"
          bg="rgba(255, 255, 255, 0.7)"
          backdropFilter="blur(10px)"
          position="relative"
          zIndex="2"
          transition="all 0.3s ease"
          boxShadow="0 -2px 10px rgba(0, 0, 0, 0.03)"
      >
        <Flex gap={2} align="flex-end">
            <Box flex="1" position="relative">
            <AutosizeTextarea
              autoFocus
              placeholder="Tell weblify.id what to do..."
              value={state.instructions || ""}
              onChange={(e) => state.setInstructions(e.target.value)}
              onKeyDown={onKeyDown}
              style={{
                opacity: taskInProgress || state.isListening ? 0.4 : 1,
                cursor: taskInProgress || state.isListening ? "not-allowed" : "text",
                  backgroundColor: taskInProgress || state.isListening ? "rgba(247, 250, 252, 0.8)" : "rgba(255, 255, 255, 0.8)",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                borderRadius: "1.25rem",
                  padding: "0.75rem 1.25rem",
                resize: "none",
                  minHeight: "44px",
                maxHeight: "120px",
                fontSize: "0.875rem",
                  lineHeight: "1.5",
                outline: "none",
                transition: "all 0.2s ease",
                  overflowY: "auto",
                  backdropFilter: "blur(5px)",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)"
              }}
              _focus={{
                  borderColor: "var(--chakra-colors-blue-400)",
                  boxShadow: "0 0 0 2px rgba(66, 153, 225, 0.3)"
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
        </Flex>

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

export default TaskUI;
