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
  useTheme,
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

// Menambahkan fungsi processUrlData yang digunakan dalam formatAIResponse
const processUrlData = (url: string) => {
  try {
    const urlObj = new URL(url);
    // Deteksi tipe konten berdasarkan url pattern
    let contentType = 'website';
    if (urlObj.pathname.includes('/search')) {
      contentType = 'search';
    } else if (urlObj.pathname.includes('/product') || urlObj.pathname.includes('/item')) {
      contentType = 'product';
    } else if (urlObj.pathname.includes('/category') || urlObj.pathname.includes('/c/')) {
      contentType = 'category';
    } else if (urlObj.pathname.includes('/video') || urlObj.pathname.includes('/watch')) {
      contentType = 'video';
    } else if (urlObj.pathname.includes('/channel') || urlObj.pathname.includes('/user')) {
      contentType = 'channel';
    } else if (urlObj.pathname.includes('/article') || urlObj.pathname.includes('/blog')) {
      contentType = 'article';
    }
    
    return {
      title: urlObj.hostname.replace('www.', ''),
      searchQuery: urlObj.searchParams.get('q') || urlObj.searchParams.get('search') || null,
      contentType: contentType,
    };
  } catch (e) {
    return null;
  }
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

const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch(e) {
    return url;
  }
};

const TaskProgressBar: React.FC<TaskProgressBarProps> = ({ 
  isRunning, 
  onStop, 
  currentTask,
  isScrollingDown = false,
  currentAction
}) => {
  const theme = useTheme();
  const bgColor = useColorModeValue("rgba(255, 255, 255, 0.8)", "rgba(23, 25, 35, 0.8)");
  const cardBgColor = useColorModeValue(theme.colors.blue[50], theme.colors.blue[900]);
  const textColor = useColorModeValue(theme.colors.gray[800], theme.colors.gray[100]);
  const borderColor = useColorModeValue(theme.colors.blue[100], theme.colors.blue[700]);
  
  const getActionText = () => {
    if (!currentAction) return "Menjalankan...";
    
    switch (currentAction) {
      case ACTION_NAMES.NAVIGATE:
        return "Navigasi ke website";
      case ACTION_NAMES.CLICK:
        return "Klik pada elemen";
      case ACTION_NAMES.FILL:
        return "Mengisi form";
      case ACTION_NAMES.WAIT:
        return "Menunggu";
      case ACTION_NAMES.SCROLL:
        return "Menggulir halaman";
      case ACTION_NAMES.SEARCH:
        return "Melakukan pencarian";
      case ACTION_NAMES.EXTRACT:
        return "Mengekstrak data";
      default:
        return "Menjalankan...";
    }
  };

  return (
    <Box 
      position="relative"
      borderRadius="xl"
      overflow="hidden"
      className="task-progress-bar-container"
      role="status"
      aria-live="polite"
    >
      {/* Floating card dengan efek crystal glass */}
      <Box
        borderRadius="xl"
        overflow="hidden"
        bg={bgColor}
        backdropFilter="blur(30px) saturate(180%)"
        borderWidth="1px"
        borderColor={borderColor}
        boxShadow="0 10px 25px rgba(0, 0, 0, 0.15)"
        transition="all 0.3s"
        width="100%"
      >
        <Flex 
          direction={{ base: "column", md: "row" }} 
          align="center" 
          justify="space-between"
          px={{ base: 3, md: 5 }}
          py={{ base: 3, md: 4 }}
          gap={3}
        >
          {/* Section status tugas dengan informasi website untuk navigasi */}
          <Flex 
            align="center" 
            flex="1" 
            maxWidth={{ base: "100%", md: "70%", lg: "75%", xl: "80%" }}
            overflow="hidden"
          >
            {/* Icon status */}
            <Box
              bg="white"
              borderRadius="full"
              p={2}
              mr={4}
              boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)"
              position="relative"
              flexShrink={0}
            >
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                bottom="0"
                borderRadius="full"
                bg={`linear-gradient(135deg, ${theme.colors.blue[300]}, ${theme.colors.purple[400]})`}
                opacity="0.7"
                animation="pulse-glow 2s infinite"
                sx={{
                  "@keyframes pulse-glow": {
                    "0%, 100%": { opacity: 0.5, transform: "scale(1)" },
                    "50%": { opacity: 0.8, transform: "scale(1.1)" }
                  }
                }}
              />
              {currentAction === ACTION_NAMES.NAVIGATE ? (
                <Box color="blue.600" position="relative" zIndex="2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                  </svg>
                </Box>
              ) : (
                <Box color="blue.600" position="relative" zIndex="2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                </Box>
              )}
            </Box>

            {/* Task/Action info */}
            <Box flex="1" overflow="hidden">
              {/* Current action title */}
              <Text 
                fontWeight="bold" 
                fontSize={{ base: "sm", md: "md" }} 
                color={textColor}
                noOfLines={1}
              >
                {getActionText()}
              </Text>
              
              {/* Current task description */}
              <Text 
                fontSize={{ base: "xs", md: "sm" }} 
                color="gray.500" 
                noOfLines={1} 
                mt={1}
              >
                {currentTask}
              </Text>
            </Box>
          </Flex>

          {/* Stop button */}
          <Flex 
            align="center" 
            justify="flex-end"
            flexShrink={0}
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onStop();
              }}
              size={{ base: "sm", md: "md" }}
              colorScheme="red"
              variant="outline"
              leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>}
              aria-label="Stop task"
              fontWeight="medium"
              _hover={{ bg: "red.50", borderColor: "red.400" }}
            >
              Berhenti
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
};

// Tambahkan definisi hook useTaskManager di bagian atas file, sebelum komponen TaskUI
interface TaskManagerHook {
  taskInProgress: boolean;
  currentAction: string | null;
  currentActionArgs: any;
  handleStopTask: () => void;
}

// Variabel untuk menyimpan state dan fungsi yang akan diakses oleh hook
let taskManagerState: TaskManagerHook = {
  taskInProgress: false,
  currentAction: null,
  currentActionArgs: null,
  handleStopTask: () => {}
};

// Custom hook untuk mengakses task manager state
const useTaskManager = (): TaskManagerHook => {
  return taskManagerState;
};

// Di dalam komponen TaskUI, perbarui state management
const TaskUI = () => {
  // Tambahkan state dari useAppState hook dengan akses ke slice yang benar
  const state = useAppState((state) => ({
    interruptTask: state.currentTask.actions.interrupt,
    pauseTask: state.currentTask.actions.pauseTask,
    resumeTask: state.currentTask.actions.resumeTask,
    status: state.currentTask.status,
  }));
  
  const [taskInProgress, setTaskInProgress] = useState<boolean>(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [currentActionArgs, setCurrentActionArgs] = useState<any>(null); // Tambahkan state untuk args

  // Fungsi untuk menghentikan task
  const handleStopTask = () => {
    if (state.interruptTask) {
      state.interruptTask();
    }
  };

  // Perbarui taskManagerState global saat state lokal berubah
  useEffect(() => {
    taskManagerState = {
      taskInProgress,
      currentAction,
      currentActionArgs,
      handleStopTask
    };
  }, [taskInProgress, currentAction, currentActionArgs]);

  // Gunakan Effect untuk menampilkan TaskProgressBar saat task berjalan
  useEffect(() => {
    // Listener untuk taskManager running event
    const handleTaskRunning = (isRunning: boolean) => {
      setTaskInProgress(isRunning);
    };

    // Listener untuk action yang sedang berjalan
    const handleActionUpdate = (action: string | null, args: any = null) => {
      setCurrentAction(action);
      setCurrentActionArgs(args); 
    };

    // Observe state changes untuk task status
    setTaskInProgress(state.status === 'running');
    
    return () => {
      // Cleanup tidak diperlukan karena kita tidak mendaftarkan listener
    };
  }, [state.status]);

  // ... existing code ...
};

export default TaskUI;
