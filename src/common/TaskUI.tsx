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
  
  return (
    <Box 
      position="fixed" 
      top={isScrollingDown ? "-100px" : "10px"} 
      left="50%"
      transform="translateX(-50%)"
      width="320px"
      maxWidth="90%"
      zIndex={1000}
      transition="all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
      opacity="1"
      filter="none"
      animation="slideInFade 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards"
      sx={{
        "@keyframes slideInFade": {
          "0%": {
            opacity: "0.7",
            transform: "translate(-50%, -20px)",
            filter: "grayscale(30%) blur(8px)"
          },
          "100%": {
            opacity: "1",
            transform: "translate(-50%, 0)",
            filter: "grayscale(30%) blur(0px)"
          }
        },
        "@keyframes slideOutFade": {
          "0%": {
            opacity: "1",
            transform: "translate(-50%, 0)",
            filter: "grayscale(30%) blur(0px)"
          },
          "100%": {
            opacity: "0",
            transform: "translate(-50%, -20px)",
            filter: "blur(8px)",
            pointerEvents: "none"
          }
        }
      }}
    >
      {/* Card Container */}
      <Box
        className="card-container"
        position="relative"
        borderRadius="16px"
        overflow="hidden"
        boxShadow="0 15px 35px rgba(0, 0, 0, 0.2), 0 5px 15px rgba(0, 0, 0, 0.1)"
        transform={isRunning ? "translateY(0)" : "translateY(-2px)"}
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        animation={isRunning ? "card-appear 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards" : "card-disappear 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards"}
        _after={{
          content: '""',
          position: "absolute",
          top: "-110%",
          left: "-210%",
          width: "300%",
          height: "200%",
          opacity: "0.1",
          transform: "rotate(30deg)",
          background: "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)",
          animation: isRunning ? "card-shine 8s infinite cubic-bezier(0.45, 0.05, 0.55, 0.95)" : "none"
        }}
      >
        {/* Deep Rich Gradient Background */}
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
          top="1px"
          left="1px"
          right="1px"
          bottom="1px"
          borderRadius="15px"
          zIndex="1"
          sx={{
            background: isRunning 
              ? "linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(230,240,255,0.07) 50%, rgba(210,230,255,0.15) 100%)" 
              : "linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(240,240,250,0.07) 50%, rgba(230,230,240,0.15) 100%)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.3)",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(12px) saturate(150%)",
            animation: isRunning ? "frost-pulse 6s infinite alternate ease-in-out" : "none",
            "@keyframes frost-pulse": {
              "0%": { 
                backdropFilter: "blur(12px) saturate(150%)",
                background: isRunning 
                  ? "linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(230,240,255,0.07) 50%, rgba(210,230,255,0.15) 100%)"
                  : "linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(240,240,250,0.07) 50%, rgba(230,230,240,0.15) 100%)"
              },
              "50%": { 
                backdropFilter: "blur(15px) saturate(170%)",
                background: isRunning 
                  ? "linear-gradient(165deg, rgba(255,255,255,0.3) 0%, rgba(230,240,255,0.1) 50%, rgba(210,230,255,0.2) 100%)"
                  : "linear-gradient(165deg, rgba(255,255,255,0.3) 0%, rgba(240,240,250,0.1) 50%, rgba(230,230,240,0.2) 100%)"
              },
              "100%": { 
                backdropFilter: "blur(12px) saturate(150%)",
                background: isRunning 
                  ? "linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(230,240,255,0.07) 50%, rgba(210,230,255,0.15) 100%)"
                  : "linear-gradient(165deg, rgba(255,255,255,0.25) 0%, rgba(240,240,250,0.07) 50%, rgba(230,230,240,0.15) 100%)"
              }
            }
          }}
        />

        {/* Neo-morphic Border Effect with Gradient */}
        <Box 
          position="absolute"
          top="-1px"
          left="-1px"
          right="-1px"
          bottom="-1px"
          borderRadius="17px"
          zIndex="1"
          sx={{
            background: isRunning 
              ? "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 25%, rgba(210,230,255,0.5) 50%, rgba(180,210,250,0.3) 75%, rgba(255,255,255,0.6) 100%)" 
              : "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.3) 25%, rgba(255,235,210,0.5) 50%, rgba(250,220,180,0.3) 75%, rgba(255,255,255,0.6) 100%)",
            backgroundSize: "400% 400%",
            animation: isRunning ? "border-shine-animated 12s infinite ease" : "none",
            opacity: 0.85
          }}
        />

        {/* Glass Effect Container with Neo-morphism */}
        <Box 
          position="relative"
          borderRadius="15px"
          padding="0"
          overflow="hidden"
          zIndex="2"
          _before={{
            content: '""',
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            borderRadius: "15px",
            padding: "1px",
            boxShadow: "inset 0 0 2px 0 rgba(255, 255, 255, 0.9)",
            zIndex: 2
          }}
        >
          {/* Frosted Glass Background Layer */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            borderRadius="15px"
            backdropFilter="blur(75px) saturate(160%) contrast(85%) brightness(105%)" 
            zIndex="1"
          />
          
          {/* Enhanced Multi-Gradient Layer */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            borderRadius="15px"
            background={isRunning 
              ? "linear-gradient(140deg, rgba(255,255,255,0.12) 0%, rgba(210,235,255,0.08) 20%, rgba(195,225,255,0.04) 40%, rgba(200,230,255,0.07) 60%, rgba(215,240,255,0.1) 80%, rgba(225,245,255,0.14) 100%)" 
              : "linear-gradient(140deg, rgba(255,255,255,0.12) 0%, rgba(255,240,230,0.08) 20%, rgba(255,235,225,0.04) 40%, rgba(255,230,220,0.07) 60%, rgba(255,235,225,0.1) 80%, rgba(255,245,240,0.14) 100%)"
            }
            sx={{
              _after: {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isRunning
                  ? "radial-gradient(circle at 20% 20%, rgba(230,245,255,0.35), transparent 70%), radial-gradient(circle at 80% 30%, rgba(210,235,255,0.25), transparent 75%), radial-gradient(circle at 40% 70%, rgba(200,225,255,0.2), transparent 75%), radial-gradient(circle at 70% 80%, rgba(220,240,255,0.3), transparent 75%)"
                  : "radial-gradient(circle at 20% 20%, rgba(255,245,240,0.35), transparent 70%), radial-gradient(circle at 80% 30%, rgba(255,235,220,0.25), transparent 75%), radial-gradient(circle at 40% 70%, rgba(255,230,215,0.2), transparent 75%), radial-gradient(circle at 70% 80%, rgba(255,240,230,0.3), transparent 75%)"
              },
              filter: "blur(30px)",
              opacity: 0.65,
              mixBlendMode: "screen"
            }}
            zIndex="2"
          />

          {/* Crystalline Texture Layer */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            borderRadius="15px"
            zIndex="3"
            opacity="0.25"
            sx={{
              background: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPgogIDxmaWx0ZXIgaWQ9Im5vaXNlIj4KICAgIDxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjA1IiBudW1PY3RhdmVzPSI1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIiAvPgogIDwvZmlsdGVyPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuNSIvPgo8L3N2Zz4=')",
              filter: "contrast(170%) brightness(160%)",
              mixBlendMode: "overlay"
            }}
          />

          {/* Advanced Inner Glow with Light Diffusion */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            borderRadius="15px"
            background={isRunning
              ? "rgba(255, 255, 255, 0.04)"
              : "rgba(255, 255, 255, 0.03)"
            }
            boxShadow={isRunning 
              ? `inset 0 0 40px 25px rgba(255, 255, 255, 0.35), inset 0 0 80px 45px rgba(235, 245, 255, 0.12)`
              : `inset 0 0 40px 25px rgba(255, 255, 255, 0.25)`
            }
            animation={isRunning ? "diffused-glow 8s infinite alternate ease-in-out" : "none"}
            sx={{
              "@keyframes diffused-glow": {
                "0%": { 
                  boxShadow: `inset 0 0 35px 20px rgba(255, 255, 255, 0.3), inset 0 0 70px 40px rgba(235, 245, 255, 0.1)`,
                  opacity: 0.65
                },
                "25%": {
                  boxShadow: `inset 0 0 45px 30px rgba(255, 255, 255, 0.4), inset 0 0 90px 55px rgba(235, 245, 255, 0.13)`,
                  opacity: 0.8
                },
                "50%": {
                  boxShadow: `inset 0 0 40px 25px rgba(255, 255, 255, 0.35), inset 0 0 85px 50px rgba(235, 245, 255, 0.12)`,
                  opacity: 0.7
                },
                "75%": {
                  boxShadow: `inset 0 0 42px 27px rgba(255, 255, 255, 0.45), inset 0 0 90px 55px rgba(235, 245, 255, 0.14)`,
                  opacity: 0.85
                },
                "100%": { 
                  boxShadow: `inset 0 0 37px 22px rgba(255, 255, 255, 0.32), inset 0 0 75px 45px rgba(235, 245, 255, 0.11)`,
                  opacity: 0.7
                }
              }
            }}
            zIndex="4"
          />
          
          {/* Dynamic Light Reflection Effect */}
          <Box
            position="absolute"
            top="0"
            left="-100%"
            right="0"
            bottom="0"
            opacity={isRunning ? "0.7" : "0.4"}
            zIndex="5"
            sx={{
              background: isRunning
                ? "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 20%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.2) 60%, rgba(255,255,255,0) 80%, transparent 100%)"
                : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, rgba(255,255,255,0) 75%, transparent 100%)",
              transform: "skewX(-15deg)",
              filter: "blur(4px)",
              animation: isRunning ? "light-sweep 10s infinite cubic-bezier(0.4, 0, 0.2, 1)" : "none"
            }}
          />
          
          {/* Enhanced Shimmer Effect with Natural Movement */}
          <Box
            position="absolute"
            top="0"
            left="-120%"
            width="150%"
            height="200%"
            opacity={isRunning ? "0.6" : "0"}
            transform="rotate(-25deg)"
            animation={isRunning ? "natural-shimmer 8s infinite" : "none"}
            sx={{
              background: `
                linear-gradient(
                  to right,
                  transparent 0%,
                  rgba(255,255,255,0) 25%,
                  rgba(255,255,255,0.5) 45%,
                  rgba(255,255,255,0.8) 50%,
                  rgba(255,255,255,0.5) 55%,
                  rgba(255,255,255,0) 75%,
                  transparent 100%
                )
              `,
              "@keyframes natural-shimmer": {
                "0%": { 
                  left: "-120%", 
                  top: "0%",
                  opacity: 0, 
                  filter: "blur(5px)"
                },
                "10%": { 
                  opacity: 0.4, 
                  filter: "blur(3px)"
                },
                "20%": { 
                  opacity: 0.6, 
                  filter: "blur(2px)"
                },
                "30%": { 
                  opacity: 0.4, 
                  filter: "blur(3px)"
                },
                "40%": { 
                  opacity: 0.2, 
                  filter: "blur(4px)"
                },
                "100%": { 
                  left: "60%", 
                  top: "100%",
                  opacity: 0, 
                  filter: "blur(5px)"
                }
              }
            }}
            zIndex="6"
          />

          {/* Surface Texture for Realistic Glass */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            opacity="0.18"
            zIndex="6"
            sx={{
              backgroundImage: "url('data:image/png;base64,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')",
              mixBlendMode: "overlay",
              filter: "blur(1px) contrast(160%) brightness(130%)",
              backgroundSize: "200px 200px",
              backgroundRepeat: "repeat",
              backgroundPosition: "center center"
            }}
          />
          
          {/* Extra Frost Layer */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            borderRadius="15px"
            background="linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06), rgba(255,255,255,0.02), rgba(255,255,255,0.08))"
            zIndex="7"
            sx={{
              backdropFilter: "blur(18px) saturate(125%)",
              mixBlendMode: "overlay",
              filter: "contrast(85%) brightness(115%)"
            }}
          />
          
          {/* Prism Effect for Edge Highlights */}
          <Box
            position="absolute"
            top="-1px"
            left="-1px"
            right="-1px"
            bottom="-1px"
            borderRadius="16px"
            opacity="0.35"
            zIndex="8"
            sx={{
              background: "none",
              border: "1px solid transparent",
              borderImage: isRunning
                ? "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(200,220,255,0.4), rgba(220,235,255,0.1), rgba(255,255,255,0.7)) 1"
                : "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,230,210,0.4), rgba(255,235,220,0.1), rgba(255,255,255,0.7)) 1",
              animation: isRunning ? "prism-shift 10s infinite linear" : "none",
              boxShadow: "0 0 15px 1px rgba(255,255,255,0.5)",
              filter: "blur(1px)"
            }}
          />
          
          {/* Crystal Highlights Layer */}
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0" 
            bottom="0"
            borderRadius="15px" 
            zIndex="9"
            opacity="0.3"
            sx={{
              background: "none",
              backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.8) 0%, transparent 3%), radial-gradient(circle at 75% 15%, rgba(255,255,255,0.6) 0%, transparent 3%), radial-gradient(circle at 50% 40%, rgba(255,255,255,0.7) 0%, transparent 3%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.7) 0%, transparent 3%), radial-gradient(circle at 15% 60%, rgba(255,255,255,0.8) 0%, transparent 3%), radial-gradient(circle at 65% 80%, rgba(255,255,255,0.7) 0%, transparent 3%)",
              animation: isRunning ? "crystal-shimmer 12s infinite alternate ease-in-out" : "none",
              "@keyframes crystal-shimmer": {
                "0%": {
                  opacity: "0.2",
                  filter: "blur(2px) brightness(100%)"
                },
                "33%": { 
                  opacity: "0.4",
                  filter: "blur(1px) brightness(140%)"
                },
                "66%": { 
                  opacity: "0.25",
                  filter: "blur(1.5px) brightness(120%)" 
                },
                "100%": { 
                  opacity: "0.35",
                  filter: "blur(1px) brightness(150%)"
                }
              }
            }}
          />

          {/* Content Container with Padding */}
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
            
            <Flex align="center">
              <Box
                as="span"
                display="inline-block"
                w="6px"
                h="6px"
          borderRadius="full"
                bg={isRunning ? primaryColor : "gray.500"}
                mr="8px"
                boxShadow={isRunning ? `0 0 8px ${primaryColor}` : "none"}
                animation={isRunning ? "pulse-dot 2s infinite" : "none"}
                sx={{
                  "@keyframes pulse-dot": {
                    "0%": { 
                      opacity: 1, 
                      transform: "scale(1)",
                      boxShadow: `0 0 8px ${primaryColor}`
                    },
                    "50%": { 
                      opacity: 0.6, 
                      transform: "scale(1.3)",
                      boxShadow: `0 0 12px ${primaryColor}`
                    },
                    "100%": { 
                      opacity: 1, 
                      transform: "scale(1)",
                      boxShadow: `0 0 8px ${primaryColor}`
                    },
                  },
                }}
              />
              <Text
                fontSize="13px"
                fontWeight="500"
                color={isRunning ? primaryColor : "gray.500"}
                textShadow={isRunning ? `0 0 8px ${primaryColor}33` : "none"}
                transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              >
                {getActionText()}
              </Text>
      </Flex>
          </Box>
        </Box>
        
        {/* Global styles untuk keyframes */}
        <Global styles={css`
          @keyframes pulse-inner-glow-secondary {
            0% {
              box-shadow: inset 0 0 15px 8px ${secondaryColor}55;
              opacity: 0.7;
              transform: scale(0.995);
            }
            50% {
              box-shadow: inset 0 0 25px 12px ${secondaryColor}66;
              opacity: 0.85;
              transform: scale(1);
            }
            100% {
              box-shadow: inset 0 0 35px 16px ${secondaryColor}77;
              opacity: 0.9;
              transform: scale(0.998);
            }
          }

          @keyframes breathe {
            0% {
              box-shadow: inset 0 0 30px 15px ${primaryColor}33;
              opacity: 0.7;
              transform: scale(0.995);
            }
            50% {
              box-shadow: inset 0 0 45px 22px ${primaryColor}44;
              opacity: 0.9;
              transform: scale(1);
            }
            100% {
              box-shadow: inset 0 0 30px 15px ${primaryColor}33;
              opacity: 0.7;
              transform: scale(0.995);
            }
          }

          .card-container {
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .card-container:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
          }
        `} />
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
                {parsed.data.map((item, index) => {
                  switch (item.type) {
                    case 'json':
                      return (
                        <Box key={index}>
                          <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={2}>
                            JSON Data
                          </Text>
                          <Box
                            bg="gray.50"
                            borderRadius="lg"
                            p={3}
                            borderWidth="1px"
                            borderColor="gray.200"
                          >
                            <JsonViewer data={item.content} />
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
                            bg="gray.50"
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor="gray.200"
                          >
                            <Box as="table" width="100%" fontSize="sm">
                              {item.content.headers && (
                                <Box as="thead" bg="gray.100">
                                  <Box as="tr">
                                    {item.content.headers.map((header: string, idx: number) => (
                                      <Box
                                        key={idx}
                                        as="th"
                                        p={2}
                                        textAlign="left"
                                        fontWeight="medium"
                                        color="gray.700"
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
                                    borderColor="gray.200"
                                  >
                                    {row.map((cell, cellIdx) => (
                                      <Box
                                        key={cellIdx}
                                        as="td"
                                        p={2}
                                        color="gray.600"
                                      >
                                        {cell}
                                      </Box>
                                    ))}
                                  </Box>
                                ))}
                              </Box>
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
                            bg="gray.50"
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor="gray.200"
                          >
                            <Text
                              fontSize="sm"
                              fontFamily="mono"
                              color="gray.700"
                              whiteSpace="pre-wrap"
                            >
                              {item.content}
                            </Text>
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
                      {actionTitles[parsed.action.name]}
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
                                fontFamily="mono"
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
                        fontFamily="mono"
                      >
                        <Text color="gray.700">
                          {typeof value === 'object' ? (
                            <JsonViewer data={value} />
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
                          fontFamily="mono"
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
    // Jika bukan JSON, tampilkan sebagai teks biasa
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
  const action = metadata?.action ? {
    name: metadata.action,
    args: {},
  } : undefined;
  const actionDisplay = action ? formatActionDisplay(action) : null;
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
          w="32px"
          h="32px"
          mr={2}
          borderRadius="xl"
          bg="blue.50"
          border="1px solid"
          borderColor="blue.200"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          boxShadow="sm"
          _hover={{ transform: "scale(1.05)" }}
          transition="transform 0.2s"
        >
          <Text color="blue.500" fontSize="sm" fontWeight="bold">F</Text>
        </Box>
      )}
      <Box
        maxW={isUser ? "80%" : "85%"}
        bg={isUser ? "blue.500" : "white"}
        color={isUser ? "white" : "gray.700"}
        borderRadius="2xl"
        boxShadow="lg"
        border="1px solid"
        borderColor={isUser ? "blue.600" : "gray.100"}
        overflow="hidden"
        transition="all 0.2s"
        _hover={{
          transform: "translateY(-1px)",
          boxShadow: "xl"
        }}
      >
        <Box p={4}>
          <MessageContent content={content} isUser={isUser} />
        </Box>

        {!isUser && status && (
          <Box 
            borderTop="1px solid"
            borderColor="gray.100"
            bg={`${getStatusColor(status, action)}.50`}
            px={4}
            py={3}
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

  if (typeof data !== 'object' || data === null) {
    return (
      <Text 
        as="span" 
        color={
          typeof data === 'string' ? 'green.600' :
          typeof data === 'number' ? 'blue.600' :
          typeof data === 'boolean' ? 'purple.600' :
          'gray.600'
        }
        fontFamily="mono"
      >
        {JSON.stringify(data)}
      </Text>
    );
  }

  const isArray = Array.isArray(data);
  const isEmpty = Object.keys(data).length === 0;

  if (isEmpty) {
    return (
      <Text as="span" color="gray.600" fontFamily="mono">
        {isArray ? '[]' : '{}'}
      </Text>
    );
  }

  return (
    <Box pl={indent}>
      <HStack spacing={1} onClick={() => setExpanded(!expanded)} cursor="pointer" mb={1}>
        <Box 
          transform={expanded ? 'rotate(90deg)' : 'rotate(0deg)'}
          transition="transform 0.2s"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </Box>
        <Text fontFamily="mono" color="gray.700">
          {isArray ? '[' : '{'}
        </Text>
      </HStack>
      
      {expanded && (
        <VStack align="stretch" spacing={1}>
          {Object.entries(data).map(([key, value], index) => (
            <Box key={key}>
              <HStack spacing={2}>
                <Text color="blue.600" fontFamily="mono">
                  {isArray ? '' : `"${key}": `}
                </Text>
                <JsonViewer data={value} level={level + 1} />
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
      
      <Text fontFamily="mono" color="gray.700" pl={indent}>
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
  
  // Track scroll direction
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
    return lastHistoryEntry?.action?.name;
  }, [state.taskHistory]);

  return (
    <Box 
      h="100%" 
      display="flex" 
      flexDirection="column" 
      bg="gray.50"
      position="relative"
    >
      {taskInProgress && (
        <TaskProgressBar
          isRunning={taskInProgress}
          onStop={handleStopTask}
          currentTask={getCurrentTaskTitle(state.instructions || "")}
          isScrollingDown={isScrollingDown}
          currentAction={currentAction}
        />
      )}
      <Box 
        flex="1" 
        overflowY="auto" 
        px={4} 
        pt={4}
        ref={chatContainerRef}
        css={{
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#CBD5E0",
            borderRadius: "3px",
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
        borderColor="gray.200"
        bg="white"
      >
        <Flex gap={2} align="flex-end">
          <Box flex="1">
            <AutosizeTextarea
              autoFocus
              placeholder="Tell weblify.id what to do..."
              value={state.instructions || ""}
              onChange={(e) => state.setInstructions(e.target.value)}
              onKeyDown={onKeyDown}
              style={{
                opacity: taskInProgress || state.isListening ? 0.4 : 1,
                cursor: taskInProgress || state.isListening ? "not-allowed" : "text",
                backgroundColor: taskInProgress || state.isListening ? "var(--chakra-colors-gray-50)" : "white",
                border: "1px solid var(--chakra-colors-gray-200)",
                borderRadius: "1.25rem",
                padding: "0.5rem 1rem",
                resize: "none",
                minHeight: "40px",
                maxHeight: "120px",
                fontSize: "0.875rem",
                lineHeight: "1.4",
                outline: "none",
                transition: "all 0.2s ease",
                overflowY: "auto"
              }}
              _focus={{
                borderColor: "var(--chakra-colors-blue-500)",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)"
              }}
            />
          </Box>
          <Button
            onClick={runTask}
            isDisabled={taskInProgress || state.isListening || !state.instructions?.trim()}
            colorScheme="blue"
            size="sm"
            borderRadius="full"
            h="36px"
            w="36px"
            minW="36px"
            p={0}
            _disabled={{
              opacity: 0.4,
              cursor: "not-allowed",
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
          <Alert status="info" borderRadius="xl" mt={2} py={1} px={2.5} size="sm">
            <AlertIcon boxSize="14px" />
            <AlertDescription fontSize="xs">
              Press Space to start/stop speaking
            </AlertDescription>
          </Alert>
        )}
      </Box>

      {!state.voiceMode && !state.instructions && !taskInProgress && (
        <Box px={4} pb={4}>
          <RecommendedTasks runTask={runTaskWithNewInstructions} />
        </Box>
      )}
      {debugMode && <ActionExecutor />}
    </Box>
  );
};

export default TaskUI;
