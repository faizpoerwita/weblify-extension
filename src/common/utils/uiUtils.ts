import { ActionStatus, ActionType } from "./actionUtils";

/**
 * Mendapatkan warna untuk status tertentu
 */
export const getStatusColor = (status: ActionStatus, action?: ActionType): string => {
  // Warna untuk action navigate
  if (action?.name === 'navigate') {
    switch (status) {
      case 'running':
        return 'blue.400';
      case 'success':
        return 'green.400';
      case 'error':
        return 'red.500';
      case 'warning':
        return 'orange.400';
      default:
        return 'gray.400';
    }
  }

  // Warna untuk action lainnya
  switch (status) {
    case 'running':
      return 'blue.400';
    case 'success':
      return 'green.400';
    case 'error':
      return 'red.500';
    case 'warning':
      return 'orange.400';
    case 'finish':
      return 'purple.400';
    default:
      return 'gray.400';
  }
};

/**
 * Mendapatkan warna untuk status dalam format nilai (bukan variabel Chakra)
 */
export const getStatusColorValue = (status: ActionStatus, action?: ActionType): string => {
  // Warna untuk action navigate
  if (action?.name === 'navigate') {
    switch (status) {
      case 'running':
        return '#63B3ED'; // blue.400
      case 'success':
        return '#48BB78'; // green.400
      case 'error':
        return '#E53E3E'; // red.500
      case 'warning':
        return '#ED8936'; // orange.400
      default:
        return '#A0AEC0'; // gray.400
    }
  }

  // Warna untuk action lainnya
  switch (status) {
    case 'running':
      return '#63B3ED'; // blue.400
    case 'success':
      return '#48BB78'; // green.400
    case 'error':
      return '#E53E3E'; // red.500
    case 'warning':
      return '#ED8936'; // orange.400
    case 'finish':
      return '#B794F4'; // purple.400
    default:
      return '#A0AEC0'; // gray.400
  }
};

/**
 * Gradien warna yang digunakan di seluruh aplikasi
 */
export const gradientColors = {
  light: {
    primary: "linear-gradient(165deg, rgba(230,245,255,1) 0%, rgba(179,229,252,1) 35%, rgba(120,190,240,1) 70%, rgba(80,160,230,1) 100%)", 
    secondary: "linear-gradient(135deg, rgba(220,240,255,1) 0%, rgba(180,225,250,1) 50%, rgba(140,205,245,1) 100%)",
    accent: "radial-gradient(circle, rgba(80,160,230,0.3) 0%, transparent 70%)",
    accentAlt: "radial-gradient(circle, rgba(60,140,220,0.3) 0%, transparent 70%)",
    card: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(240,250,255,0.85) 100%)"
  }
};

/**
 * Memeriksa apakah rasio layar adalah rasio vertikal (19:6)
 * Return true jika rasio besar atau 19:6, false jika lebih kecil
 */
export const isVerticalRatio = (): boolean => {
  // Untuk saat ini, kita anggap viewport width < 500px sebagai rasio vertikal
  return window.innerWidth < 500 || (window.innerWidth / window.innerHeight) < 1.5;
};

/**
 * Mendapatkan format tampilan teks berdasarkan panjang dan breakpoint
 */
export const getTextDisplayFormat = (
  text: string, 
  maxLength: number = 30, 
  isVertical: boolean = false
): string => {
  if (!text) return '';
  
  const length = isVertical ? maxLength * 0.7 : maxLength;
  
  return text.length > length 
    ? `${text.substring(0, length)}...` 
    : text;
}; 