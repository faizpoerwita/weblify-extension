// Definisi tipe platform data
export interface PlatformData {
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

export interface UrlData {
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

// Data platform yang didukung
export const platformData: Record<string, PlatformData> = {
  'google.com': {
    type: 'search',
    isSearch: true,
    isImage: true,
    searchParam: 'q',
    title: 'Google'
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

/**
 * Memproses URL menjadi data terstruktur
 */
export const processUrlData = (url: string): UrlData | null => {
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

    // Tentukan content type berdasarkan path dan search parameters
    let contentType: UrlData['contentType'] = 'page';
    
    // Jika ada search parameter yang cocok, anggap ini adalah search
    if (platform.searchParam && searchParams[platform.searchParam]) {
      contentType = 'search';
    } 
    // Logic spesifik per platform
    else if (platform.type === 'ecommerce') {
      if (path.length > 0 && path[0] === 'p') contentType = 'product';
      else if (path.length > 0 && (path[0] === 'c' || path[0] === 'category')) contentType = 'category';
    }
    else if (platform.type === 'social' && domain === 'youtube.com') {
      if (searchParams.v) contentType = 'video';
      else if (path.length > 0 && path[0] === 'channel') contentType = 'channel';
    }
    else if (platform.type === 'news') {
      if (path.length > 1) contentType = 'article';
      else if (path.length === 1) contentType = 'category';
    }

    // Dapatkan title
    const getTitle = () => {
      // Gunakan title dari platform data terlebih dahulu
      if (platform.title) return platform.title;
      
      // Buat title dari domain
      return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    };

    // Data URL lengkap
    return {
      domain,
      path,
      searchQuery: platform.searchParam ? searchParams[platform.searchParam] : undefined,
      protocol,
      platform: platform.type,
      contentType,
      title: getTitle(),
      fullUrl: url,
      favicon: `${protocol}//${urlObj.hostname}/favicon.ico`
    };
  } catch (error) {
    console.error("Error processing URL:", error);
    return null;
  }
};

/**
 * Format URL untuk tampilan yang lebih pendek berdasarkan rasio
 */
export const formatUrl = (url: string, displayFormat: 'full' | 'medium' | 'short' = 'full'): string => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    switch (displayFormat) {
      case 'full':
        return url;
      case 'medium':
        return `${domain}${urlObj.pathname.substring(0, 20)}${urlObj.pathname.length > 20 ? '...' : ''}`;
      case 'short':
        return domain;
      default:
        return url;
    }
  } catch {
    return url;
  }
}; 