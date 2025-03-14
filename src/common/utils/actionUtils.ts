import { FaGlobe, FaMousePointer, FaKeyboard, FaArrowsAlt, FaClock, FaCheckCircle, FaSearch, FaFileExport, FaPen, FaCircle } from "react-icons/fa";

// Constants
export const ACTION_STATUSES = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  FINISH: 'finish'
} as const;

export const ACTION_NAMES = {
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

export const OPERATION_NAMES = {
  CLICK: 'click',
  SET_VALUE: 'setValue',
  SET_VALUE_AND_ENTER: 'setValueAndEnter',
  NAVIGATE: 'navigate',
  SCROLL: 'scroll',
  WAIT: 'wait',
  FAIL: 'fail',
  PROCESSING: 'processing'
} as const;

export type ActionStatus = typeof ACTION_STATUSES[keyof typeof ACTION_STATUSES];
export type ActionName = typeof ACTION_NAMES[keyof typeof ACTION_NAMES];
export type OperationName = typeof OPERATION_NAMES[keyof typeof OPERATION_NAMES];

export type ActionOperation = {
  name: OperationName | "finish";
  args?: Record<string, any>;
  description?: string;
};

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
    title?: string; // Properti untuk menyimpan judul website
  };
  status?: ActionStatus;
}

export const ACTION_TITLES: Record<string, string> = {
  [ACTION_NAMES.NAVIGATE]: 'Navigasi',
  [ACTION_NAMES.CLICK]: 'Klik',
  [ACTION_NAMES.TYPE]: 'Ketik',
  [ACTION_NAMES.SCROLL]: 'Gulir',
  [ACTION_NAMES.WAIT]: 'Tunggu',
  [ACTION_NAMES.FINISH]: 'Selesai',
  [ACTION_NAMES.SEARCH]: 'Cari',
  [ACTION_NAMES.EXTRACT]: 'Ekstrak',
  [ACTION_NAMES.FILL]: 'Isi'
};

export const ACTION_DISPLAY_TITLES: Record<string, string> = {
  [ACTION_NAMES.NAVIGATE]: 'Navigasi ke Website',
  [ACTION_NAMES.CLICK]: 'Klik Elemen',
  [ACTION_NAMES.TYPE]: 'Ketik Teks',
  [ACTION_NAMES.SCROLL]: 'Scroll Halaman',
  [ACTION_NAMES.WAIT]: 'Tunggu',
  [ACTION_NAMES.FINISH]: 'Selesai',
  [ACTION_NAMES.SEARCH]: 'Pencarian',
  [ACTION_NAMES.EXTRACT]: 'Ekstrak Data',
  [ACTION_NAMES.FILL]: 'Isi Form'
};

/**
 * Format tampilan tindakan
 */
export const formatActionDisplay = (action: ActionType): { title: string; description: string } => {
  let title = "Tindakan";
  let description = "";

  const { name, args } = action;

  title = ACTION_TITLES[name] || name;

  switch (name) {
    case ACTION_NAMES.NAVIGATE:
      if (args?.url) {
        description = args.title ? 
          `${args.url} (${args.title})` : 
          args.url;
      }
      break;
    case ACTION_NAMES.CLICK:
      if (args?.selector) {
        description = `pada elemen ${args.selector}`;
      }
      break;
    case ACTION_NAMES.EXTRACT:
      if (args?.selector) {
        description = `informasi dari ${args.selector}`;
      }
      break;
    case ACTION_NAMES.SCROLL:
      if (args?.direction) {
        description = `${args.direction === "up" ? "ke atas" : "ke bawah"}`;
      }
      break;
    case ACTION_NAMES.WAIT:
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

/**
 * Format nama tindakan
 */
export const formatActionName = (name: string): string => {
  return ACTION_TITLES[name as ActionName] || name;
};

/**
 * Mendapatkan nama tindakan dari konten
 */
export const getActionName = (content: string): string => {
  try {
    const actionDetails = getActionDetails(content);
    return actionDetails ? actionDetails.name : "";
  } catch (error) {
    console.error("Error getting action name:", error);
    return "";
  }
};

/**
 * Ekstrak detail tindakan dari konten
 */
export const getActionDetails = (content: string): ActionType | undefined => {
  try {
    // Coba ekstrak JSON object dari konten
    const match = content.match(/{[\s\S]*}/);
    if (match) {
      const jsonStr = match[0];
      const data = JSON.parse(jsonStr);
      if (data.action) {
        return data.action;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Error parsing action details:", error);
    return undefined;
  }
};

/**
 * Mendapatkan icon untuk tindakan tertentu
 */
export const getActionIconComponent = (actionName: string): React.ComponentType | null => {
  switch (actionName) {
    case ACTION_NAMES.NAVIGATE:
      return FaGlobe;
    case ACTION_NAMES.CLICK:
      return FaMousePointer;
    case ACTION_NAMES.TYPE:
      return FaKeyboard;
    case ACTION_NAMES.SCROLL:
      return FaArrowsAlt;
    case ACTION_NAMES.WAIT:
      return FaClock;
    case ACTION_NAMES.FINISH:
      return FaCheckCircle;
    case ACTION_NAMES.SEARCH:
      return FaSearch;
    case ACTION_NAMES.EXTRACT:
      return FaFileExport;
    case ACTION_NAMES.FILL:
      return FaPen;
    default:
      return FaCircle;
  }
};

/**
 * Format deskripsi tindakan
 */
export const formatActionDescription = (action: ActionType): string => {
  if (!action || !action.name) return '';
  
  switch (action.name) {
    case ACTION_NAMES.NAVIGATE:
      return action.args?.url 
        ? `Membuka ${action.args.url.substring(0, 50)}${action.args.url.length > 50 ? '...' : ''}` 
        : 'Membuka website';
    case ACTION_NAMES.CLICK:
      return action.args?.selector 
        ? `Mengklik elemen ${action.args.selector.substring(0, 30)}${action.args.selector.length > 30 ? '...' : ''}` 
        : 'Mengklik elemen';
    case ACTION_NAMES.TYPE:
      return action.args?.text 
        ? `Mengetik "${action.args.text.substring(0, 30)}${action.args.text.length > 30 ? '...' : ''}"` 
        : 'Mengetik teks';
    case ACTION_NAMES.SCROLL:
      return action.args?.direction 
        ? `Menggulir ${action.args.direction === 'down' ? 'ke bawah' : 'ke atas'}` 
        : 'Menggulir halaman';
    case ACTION_NAMES.WAIT:
      return action.args?.duration 
        ? `Menunggu selama ${action.args.duration} detik` 
        : 'Menunggu';
    case ACTION_NAMES.FINISH:
      return 'Menyelesaikan tugas';
    case ACTION_NAMES.SEARCH:
      return action.args?.text 
        ? `Mencari "${action.args.text.substring(0, 30)}${action.args.text.length > 30 ? '...' : ''}"` 
        : 'Melakukan pencarian';
    case ACTION_NAMES.EXTRACT:
      return action.args?.selector 
        ? `Mengekstrak data dari ${action.args.selector.substring(0, 30)}${action.args.selector.length > 30 ? '...' : ''}` 
        : 'Mengekstrak data';
    case ACTION_NAMES.FILL:
      return (action.args?.selector && action.args?.text) 
        ? `Mengisi ${action.args.selector} dengan "${action.args.text.substring(0, 20)}${action.args.text.length > 20 ? '...' : ''}"` 
        : 'Mengisi form';
    default:
      return 'Melakukan tindakan';
  }
};

/**
 * Format teks status dari status tindakan
 */
export const getStatusDisplay = (status: ActionStatus, action?: ActionType): string => {
  if (action?.name === ACTION_NAMES.NAVIGATE) {
    switch (status) {
      case ACTION_STATUSES.RUNNING:
        return 'NAVIGASI';
      case ACTION_STATUSES.SUCCESS:
        return 'BERHASIL';
      case ACTION_STATUSES.ERROR:
        return 'GAGAL';
      default:
        return 'IDLE';
    }
  }

  switch (status) {
    case ACTION_STATUSES.RUNNING:
      return 'BERJALAN';
    case ACTION_STATUSES.SUCCESS:
      return 'BERHASIL';
    case ACTION_STATUSES.ERROR:
      return 'GAGAL';
    case ACTION_STATUSES.WARNING:
      return 'PERINGATAN';
    case ACTION_STATUSES.FINISH:
      return 'SELESAI';
    default:
      return 'IDLE';
  }
}; 