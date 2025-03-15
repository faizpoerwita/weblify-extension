import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { debugMode } from "../constants";

// returns true if the error is recoverable by retrying the query
export default function errorChecker(
  err: Error,
  notifyError?: (errMsg: string) => void,
): boolean {
  const log = (msg: string, e: Error) => {
    if (debugMode) {
      console.error(msg, e);
    }
    if (notifyError) {
      notifyError(msg);
    }
  };
  if (err instanceof OpenAI.APIError) {
    if (err instanceof OpenAI.InternalServerError) {
      log(
        "There is a problem with the OpenAI API server. Please check its status page https://status.openai.com/ and try again later.",
        err,
      );
      return false;
    }
    if (
      err instanceof OpenAI.AuthenticationError ||
      err instanceof OpenAI.PermissionDeniedError
    ) {
      log("The OpenAI API key you provided might not be valid", err);
      return false;
    }
    if (err instanceof OpenAI.APIConnectionError) {
      log(
        "There is a problem with the network connection to the OpenAI API. Please check your network connection and try again later.",
        err,
      );
      return true;
    }
    // other API errors are not recoverable
    return false;
  } else if (err instanceof Anthropic.APIError) {
    if (err instanceof Anthropic.InternalServerError) {
      log(
        "There is a problem with the Anthropic API server. Please check its status page https://status.anthropic.com/ and try again later.",
        err,
      );
      return false;
    }
    if (
      err instanceof Anthropic.AuthenticationError ||
      err instanceof Anthropic.PermissionDeniedError
    ) {
      log("The Anthropic API key you provided might not be valid", err);
      return false;
    }
    if (err instanceof Anthropic.APIConnectionError) {
      log(
        "There is a problem with the network connection to the Anthropic API. Please check your network connection and try again later.",
        err,
      );
      return true;
    }
    // other API errors are not recoverable
    return false;
  }
  log("Error: " + err.message, err);
  // retry everything else (e.g. network errors, syntax error, timeout)
  return true;
}

/**
 * Sistem logger dan monitoring error untuk weblify.id extension
 */

// Tipe-tipe error yang mungkin terjadi
export const ERROR_TYPES = {
  API_CONNECTION: 'api_connection',
  MESSAGE_PORT: 'message_port',
  DOM_STABILITY: 'dom_stability',
  RPC_COMMUNICATION: 'rpc_communication',
  DEBUGGER: 'debugger',
  GENERAL: 'general'
};

// Interface untuk struktur error log
interface ErrorLog {
  timestamp: string;
  type: string;
  message: string;
  details: any;
  url?: string;
  stackTrace?: string;
}

/**
 * Mencatat error ke konsol dan storage lokal
 * @param type Tipe error dari ERROR_TYPES
 * @param message Pesan error
 * @param details Detail tambahan tentang error
 */
export function logError(type: string, message: string, details: any = {}) {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    type,
    message,
    details,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    stackTrace: new Error().stack
  };
  
  // Log ke konsol dengan format yang konsisten
  console.error(`[weblify-error] ${type}:`, message, details);
  
  // Simpan error log untuk analisis
  chrome.storage.local.get('errorLogs', ({errorLogs = []}) => {
    errorLogs.push(errorLog);
    // Batasi jumlah log tersimpan
    if (errorLogs.length > 50) errorLogs = errorLogs.slice(-50);
    chrome.storage.local.set({errorLogs});
  });

  // Tambahkan event untuk analytics jika dibutuhkan
  if (type === ERROR_TYPES.API_CONNECTION) {
    // Tracking kesalahan API sebagai event
    try {
      const eventData = {
        category: 'Error',
        action: 'API Connection Failure',
        label: message
      };
      // sendAnalyticsEvent(eventData); // Fungsi ini tergantung implementasi analytics
    } catch (e) {
      // Silent fail untuk analytics
    }
  }
}

/**
 * Mengambil semua log error yang tersimpan
 * @returns Promise yang mengembalikan array error logs
 */
export function getErrorLogs(): Promise<ErrorLog[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('errorLogs', ({errorLogs = []}) => {
      resolve(errorLogs);
    });
  });
}

/**
 * Membersihkan semua log error
 */
export function clearErrorLogs(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({errorLogs: []}, () => {
      resolve();
    });
  });
}

/**
 * Mengecek apakah error termasuk kategori tertentu
 * @param error Object error
 * @param type Tipe error yang dicek
 */
export function isErrorType(error: any, type: string): boolean {
  if (!error) return false;
  
  if (type === ERROR_TYPES.API_CONNECTION) {
    return (
      error.status === 503 || 
      error.message?.includes('network') ||
      error.message?.includes('API key') ||
      error.message?.includes('generativelanguage')
    );
  }
  
  if (type === ERROR_TYPES.MESSAGE_PORT) {
    return error.message?.includes('message port closed');
  }
  
  if (type === ERROR_TYPES.DEBUGGER) {
    return (
      error.message?.includes('debugger') || 
      error.message?.includes('Cannot access') ||
      error.message?.includes('already attached')
    );
  }
  
  return false;
}
