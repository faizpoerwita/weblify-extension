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
} from "@chakra-ui/react";
import { useAppState } from "../../../state/store";
import { 
  ActionStatus, 
  ActionName, 
  ActionType, 
  ACTION_STATUSES, 
  ACTION_NAMES,
  WELCOME_MESSAGE,
  defaultStatus
} from './constants/actionConstants';
import { 
  ChatMessageProps, 
  DisplayTaskHistoryEntry, 
  BaseTaskHistoryEntry, 
  TaskHistoryEntryType 
} from './constants/chatTypes';
import { ChatMessage } from './components/ChatMessage';
import { TaskProgressBar } from './components/TaskProgressBar';
import { StatusIndicator } from './components/StatusIndicator';
import { processUrlData } from './utils/urlHelpers';
import { getStatusColor } from './utils/statusHelpers';

/**
 * Komponen utama TaskUI yang menampilkan antarmuka tugas
 */
const TaskUI = () => {
  // State dan hooks dari store
  const { colorMode } = useColorMode();
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  
  // State dari store
  const {
    taskHistory,
    isRunningTask,
    currentTask,
    currentAction,
    stopTask,
    runTask,
    clearHistory,
  } = useAppState((state) => ({
    taskHistory: state.currentTask.history || [],
    isRunningTask: state.currentTask.status === "running",
    currentTask: state.ui.instructions || "",
    currentAction: state.currentTask.actionStatus,
    stopTask: () => state.currentTask.actions.interrupt(),
    runTask: (onError = (error: string) => console.error(error)) => state.currentTask.actions.runTask(onError),
    clearHistory: () => {
      useAppState.setState((state) => {
        state.currentTask.history = [];
        return state;
      });
    },
  }));

  // State lokal
  const [userInput, setUserInput] = useState("");
  const [displayHistory, setDisplayHistory] = useState<DisplayTaskHistoryEntry[]>([]);

  // Transformasi history untuk tampilan
  useEffect(() => {
    const transformed = transformTaskHistory(taskHistory);
    setDisplayHistory(transformed);
  }, [taskHistory]);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    if (messagesEndRef.current && !isScrollingDown) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayHistory, isScrollingDown]);

  // Deteksi scroll
  const handleScroll = () => {
    if (!messagesEndRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 10;
    
    setIsScrollingDown(!isScrolledToBottom);
  };

  // Tambahkan event listener untuk scroll
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fokus ke textarea saat komponen dimuat
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handler untuk menjalankan tugas dengan instruksi baru
  const runTaskWithNewInstructions = (newInstructions: string = "") => {
    if (!newInstructions.trim() && !userInput.trim()) return;
    
    const instructions = newInstructions.trim() || userInput.trim();
    runTask(instructions);
    setUserInput("");
  };

  // Handler untuk keydown pada textarea
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runTaskWithNewInstructions();
    }
  };

  // Render komponen
  return (
    <Box height="100%" display="flex" flexDirection="column">
      {/* Chat history */}
      <Box 
        flex="1" 
        overflowY="auto" 
        px={2} 
        py={4}
        css={{
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: colorMode === "dark" ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.05)",
          },
          "&::-webkit-scrollbar-thumb": {
            background: colorMode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
            borderRadius: "4px",
          },
        }}
      >
        {/* Welcome message if no history */}
        {displayHistory.length === 0 && (
          <ChatMessage
            isUser={false}
            content={WELCOME_MESSAGE}
            status={defaultStatus}
          />
        )}

        {/* Display chat history */}
        {displayHistory.map((entry, index) => (
          <ChatMessage
            key={index}
            isUser={entry.type === "user"}
            content={entry.message}
            status={entry.status}
            metadata={entry.metadata}
          />
        ))}

        {/* Invisible element for auto-scroll */}
        <div ref={messagesEndRef} />
      </Box>

      {/* Task progress bar */}
      <TaskProgressBar
        isRunning={isRunningTask}
        onStop={stopTask}
        currentTask={currentTask}
        isScrollingDown={isScrollingDown}
        currentAction={currentAction as ActionName}
      />

      {/* Input area */}
      <Box p={4} borderTop="1px solid" borderColor={colorMode === "dark" ? "gray.700" : "gray.200"}>
        <HStack spacing={2} align="flex-end">
          <Box flex="1" position="relative">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ketik instruksi atau pertanyaan..."
              style={{
                width: "100%",
                minHeight: "60px",
                maxHeight: "200px",
                padding: "12px",
                borderRadius: "8px",
                border: `1px solid ${colorMode === "dark" ? "#4A5568" : "#E2E8F0"}`,
                backgroundColor: colorMode === "dark" ? "#2D3748" : "white",
                color: colorMode === "dark" ? "white" : "black",
                resize: "vertical",
              }}
            />
          </Box>
          <Button
            colorScheme="blue"
            onClick={() => runTaskWithNewInstructions()}
            isDisabled={isRunningTask || !userInput.trim()}
            height="60px"
            px={6}
          >
            Kirim
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

/**
 * Fungsi untuk mentransformasi riwayat tugas menjadi format tampilan
 */
const transformTaskHistory = (history: BaseTaskHistoryEntry[]): DisplayTaskHistoryEntry[] => {
  const result: DisplayTaskHistoryEntry[] = [];
  
  history.forEach((entry, index) => {
    const timestamp = new Date().toLocaleTimeString();
    
    // Tambahkan prompt pengguna jika ada
    if (entry.prompt) {
      result.push({
        type: "user",
        message: entry.prompt,
        status: ACTION_STATUSES.IDLE,
        metadata: {
          timestamp,
        },
        isNewGroup: true,
      });
    }
    
    // Tambahkan respons AI jika ada
    if (entry.response) {
      result.push({
        type: "assistant",
        message: entry.response,
        status: ACTION_STATUSES.IDLE,
        metadata: {
          timestamp,
        },
        isLastInGroup: !entry.action,
      });
    }
    
    // Tambahkan aksi jika ada
    if (entry.action) {
      const actionName = mapOperationToAction(entry.action.operation);
      const status = (entry.action.status as ActionStatus) || ACTION_STATUSES.IDLE;
      
      result.push({
        type: "assistant",
        message: entry.action.operation.description || "",
        status,
        metadata: {
          timestamp,
          action: actionName,
          details: [],
        },
        isLastInGroup: true,
      });
    }
  });
  
  return result;
};

/**
 * Fungsi untuk memetakan operasi ke nama aksi
 */
const mapOperationToAction = (operation?: { name: string }): ActionName | undefined => {
  if (!operation) return undefined;
  
  switch (operation.name) {
    case "navigate":
      return ACTION_NAMES.NAVIGATE;
    case "click":
      return ACTION_NAMES.CLICK;
    case "type":
      return ACTION_NAMES.TYPE;
    case "scroll":
      return ACTION_NAMES.SCROLL;
    case "wait":
      return ACTION_NAMES.WAIT;
    case "finish":
      return ACTION_NAMES.FINISH;
    case "search":
      return ACTION_NAMES.SEARCH;
    case "extract":
      return ACTION_NAMES.EXTRACT;
    case "fill":
      return ACTION_NAMES.FILL;
    default:
      return undefined;
  }
};

export default TaskUI; 