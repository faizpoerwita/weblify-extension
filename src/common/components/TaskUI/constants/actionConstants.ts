// Konstanta untuk status aksi
export const ACTION_STATUSES = {
  IDLE: "idle",
  RUNNING: "running", 
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  WAITING: "waiting",
  DEBUG: "debug",
} as const;

// Konstanta untuk nama aksi
export const ACTION_NAMES = {
  NAVIGATE: "navigate",
  CLICK: "click",
  TYPE: "type",
  SCROLL: "scroll",
  WAIT: "wait",
  FINISH: "finish",
  SEARCH: "search",
  EXTRACT: "extract",
  FILL: "fill",
} as const;

// Konstanta untuk nama operasi
export const OPERATION_NAMES = {
  NAVIGATE: "navigate",
  CLICK: "click",
  TYPE: "type",
  SCROLL: "scroll",
  WAIT: "wait",
  FINISH: "finish",
  SEARCH: "search",
  EXTRACT: "extract",
  PROMPT: "prompt",
  FILL: "fill",
} as const;

// Tipe data untuk status aksi
export type ActionStatus = typeof ACTION_STATUSES[keyof typeof ACTION_STATUSES];

// Tipe data untuk nama aksi
export type ActionName = typeof ACTION_NAMES[keyof typeof ACTION_NAMES];

// Tipe data untuk nama operasi
export type OperationName = typeof OPERATION_NAMES[keyof typeof OPERATION_NAMES];

// Tipe data untuk operasi aksi
export type ActionOperation = {
  name: OperationName | "finish";
  args?: Record<string, any>;
  description?: string;
};

// Tipe data untuk aksi
export interface ActionType {
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
    title?: string;
  };
  status?: ActionStatus;
}

// Konstanta untuk pesan default
export const WELCOME_MESSAGE = `Selamat datang! Saya weblify.id, asisten browser Anda.
Saya dapat membantu Anda melakukan tugas di browser seperti:
- Membuka website
- Mengklik tombol dan link
- Mengisi formulir
- Ekstrak informasi dari halaman web
- Mencari di halaman web

Katakan saja apa yang ingin Anda lakukan!`;

// Default status
export const defaultStatus = ACTION_STATUSES.IDLE; 