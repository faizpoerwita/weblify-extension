import { sleep } from "../utils";
import type { RPCMethods } from "../../pages/content/domOperations";

// Konstanta untuk timeout dan reconnect
const COMMUNICATION_TIMEOUT = 30000; // 30 detik timeout
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 detik

// Call these functions to execute code in the content script

function sendMessage<K extends keyof RPCMethods>(
  tabId: number,
  method: K,
  payload: Parameters<RPCMethods[K]>,
): Promise<ReturnType<RPCMethods[K]>> {
  // Send a message to the other world
  // Ensure that the method and arguments are correct according to RpcMethods
  return new Promise((resolve, reject) => {
    // Implementasi timeout untuk mencegah menunggu terlalu lama
    const timeoutId = setTimeout(() => {
      reject(new Error(`Komunikasi timeout setelah ${COMMUNICATION_TIMEOUT}ms`));
    }, COMMUNICATION_TIMEOUT);

    chrome.tabs.sendMessage(tabId, { method, payload }, (response) => {
      clearTimeout(timeoutId); // Clear timeout jika respon diterima
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export const callRPC = async <K extends keyof RPCMethods>(
  method: K,
  payload: Parameters<RPCMethods[K]>,
  maxTries = 1,
): Promise<ReturnType<RPCMethods[K]>> => {
  let queryOptions = { active: true, currentWindow: true };
  let activeTab = (await chrome.tabs.query(queryOptions))[0];

  // If the active tab is a chrome-extension:// page, then we need to get some random other tab for testing
  if (activeTab.url?.startsWith("chrome")) {
    queryOptions = { active: false, currentWindow: true };
    activeTab = (await chrome.tabs.query(queryOptions))[0];
  }

  if (!activeTab?.id) throw new Error("No active tab found");
  return callRPCWithTab(activeTab.id, method, payload, maxTries);
};

// Fungsi pembantu untuk reattach debugger
async function tryReattachDebugger(tabId: number): Promise<boolean> {
  try {
    // Hanya contoh - implementasi sesuai dengan cara reattach debugger yang digunakan di aplikasi
    await chrome.debugger.attach({ tabId }, "1.3");
    await chrome.debugger.sendCommand({ tabId }, "DOM.enable");
    await chrome.debugger.sendCommand({ tabId }, "Runtime.enable");
    console.log("Berhasil reattach debugger");
    return true;
  } catch (error) {
    console.error("Gagal reattach debugger:", error);
    return false;
  }
}

export const callRPCWithTab = async <K extends keyof RPCMethods>(
  tabId: number,
  method: K,
  payload: Parameters<RPCMethods[K]>,
  maxTries = 3, // Meningkatkan default retries
): Promise<ReturnType<RPCMethods[K]>> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let err: any;
  let reconnectAttempt = 0;
  const maxReconnects = 2; // Batas percobaan reconnect

  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await sendMessage(tabId, method, payload);
      return response;
    } catch (e: any) {
      console.error(`Error saat memanggil RPC (percobaan ${i+1}/${maxTries}):`, e);
      
      // Jika error adalah "message port closed", coba reconnect debugger
      if (e.message?.includes("message port closed") && reconnectAttempt < maxReconnects) {
        reconnectAttempt++;
        console.log(`Mencoba reconnect debugger (${reconnectAttempt}/${maxReconnects})...`);
        
        const reconnected = await tryReattachDebugger(tabId);
        if (reconnected) {
          console.log("Debugger reconnected, mencoba kembali RPC call...");
          await sleep(500); // Berikan waktu untuk debugger siap
          continue; // Langsung coba lagi tanpa mengurangi i
        }
      }
      
      if (i === maxTries - 1) {
        // Last try, throw the error
        err = e;
      } else {
        // Content script may not have loaded, retry with longer delay
        console.log(`Mencoba ulang dalam ${RETRY_DELAY * (i+1)}ms...`);
        await sleep(RETRY_DELAY * (i+1)); // Exponential backoff
      }
    }
  }
  throw err;
};
