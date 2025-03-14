import { useCallback } from 'react';
import { useAppState } from '../../state/store';
import { ActionStatus, ActionType, ACTION_STATUSES } from '../utils/actionUtils';

export const useTaskFunctions = () => {
  const appState = useAppState(state => ({
    instructions: state.ui.instructions,
    setInstructions: state.ui.actions.setInstructions,
    runTask: state.currentTask.actions.runTask,
    interrupt: state.currentTask.actions.interrupt
  }));
  
  /**
   * Menjalankan task dengan instruksi baru
   */
  const runTaskWithNewInstructions = useCallback((newInstructions: string = "") => {
    const instructions = newInstructions.trim().length > 0 
      ? newInstructions 
      : appState.instructions || "";
      
    if (instructions.trim() === "") {
      return;
    }
    
    appState.runTask(instructions);
    appState.setInstructions("");
  }, [appState]);

  /**
   * Menginterupsi task yang sedang berjalan
   */
  const interruptTask = useCallback(() => {
    appState.interrupt();
  }, [appState]);

  /**
   * Transformasi history task untuk tampilan UI
   */
  const transformTaskHistory = useCallback((history: any[]) => {
    if (!history || history.length === 0) {
      return [];
    }

    const displayHistory = [];

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const nextEntry = i < history.length - 1 ? history[i + 1] : null;
      
      // Menambahkan pesan user jika ada
      if (entry.prompt) {
        displayHistory.push({
          type: "user",
          message: entry.prompt,
          status: ACTION_STATUSES.IDLE,
          metadata: {
            timestamp: new Date().toISOString(),
            details: [],
          },
          isNewGroup: true,
          isLastInGroup: !nextEntry || nextEntry.response !== undefined,
        });
      }
      
      // Menambahkan respons asisten jika ada
      if (entry.response) {
        displayHistory.push({
          type: "assistant",
          message: entry.response,
          status: entry.action?.status || ACTION_STATUSES.IDLE,
          metadata: {
            timestamp: new Date().toISOString(),
            action: entry.action?.name,
            details: entry.action?.args?.details || [],
          },
          isNewGroup: true,
          isLastInGroup: !nextEntry || nextEntry.prompt !== undefined,
        });
      }
      
      // Menambahkan tindakan jika ada
      if (entry.action) {
        // Hanya tambahkan jika bukan bagian dari respons
        if (!entry.response) {
          displayHistory.push({
            type: "assistant",
            message: JSON.stringify({ action: entry.action }),
            status: entry.action.status || ACTION_STATUSES.IDLE,
            metadata: {
              timestamp: new Date().toISOString(),
              action: entry.action.name,
              details: entry.action.args?.details || [],
            },
            isNewGroup: true,
            isLastInGroup: !nextEntry || nextEntry.prompt !== undefined,
          });
        }
      }
    }

    return displayHistory;
  }, []);

  return {
    runTaskWithNewInstructions,
    interruptTask,
    transformTaskHistory,
  };
}; 