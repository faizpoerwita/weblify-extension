import { UrlData, PlatformData } from '../constants/chatTypes';

/**
 * Memproses URL dan mengembalikan data terstruktur
 */
export const processUrlData = (url: string): UrlData | null => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const pathArray = urlObj.pathname.split('/').filter(Boolean);
    const searchQuery = urlObj.search;
    const protocol = urlObj.protocol;
    
    // Deteksi platform dan jenis konten
    const platformData = detectPlatform(urlObj);
    
    // Mengambil favicon dari domain
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    
    // Mengambil judul untuk platform dengan cara khusus
    const title = getTitle(platformData, domain, pathArray);
    
    return {
      domain,
      path: pathArray,
      searchQuery: searchQuery || undefined,
      protocol,
      platform: platformData.type,
      contentType: determineContentType(platformData, pathArray, searchQuery),
      title,
      fullUrl: url,
      favicon
    };
  } catch (error) {
    console.error("Error processing URL:", error);
    return null;
  }
};

/**
 * Mendeteksi platform dari URL
 */
const detectPlatform = (url: URL): PlatformData => {
  const hostname = url.hostname;
  
  // Google
  if (hostname.includes('google')) {
    const isImage = url.pathname.includes('/images') || url.search.includes('tbm=isch');
    return {
      type: 'search',
      isSearch: true,
      isImage,
      searchParam: new URLSearchParams(url.search).get('q') || '',
      title: 'Google Search'
    };
  }
  
  // YouTube
  if (hostname.includes('youtube.com') || hostname === 'youtu.be') {
    const isVideo = url.pathname.includes('/watch') || hostname === 'youtu.be';
    const isChannel = url.pathname.includes('/channel/') || url.pathname.includes('/c/');
    return {
      type: 'social',
      isVideo,
      isChannel,
      title: 'YouTube'
    };
  }
  
  // Amazon
  if (hostname.includes('amazon')) {
    const isProduct = url.pathname.includes('/dp/') || url.pathname.includes('/gp/product');
    const isCategory = url.pathname.includes('/s');
    return {
      type: 'ecommerce',
      isProduct,
      isCategory,
      title: 'Amazon'
    };
  }

  // Default ketika tidak ada yang cocok
  return {
    type: 'website',
    title: hostname.replace(/^www\./, '')
  };
};

/**
 * Menentukan jenis konten berdasarkan platform dan path
 */
const determineContentType = (platform: PlatformData, path: string[], search: string): UrlData['contentType'] => {
  if (platform.isSearch) return 'search';
  if (platform.isProduct) return 'product';
  if (platform.isCategory) return 'category';
  if (platform.isVideo) return 'video';
  if (platform.isChannel) return 'channel';
  if (platform.isArticle) return 'article';
  
  // Default
  return 'page';
};

/**
 * Mendapatkan judul yang sesuai berdasarkan platform dan path
 */
const getTitle = (platform: PlatformData, domain: string, path: string[]): string => {
  // Untuk situs pencarian
  if (platform.type === 'search' && platform.searchParam) {
    return `Search: ${platform.searchParam}`;
  }
  
  // Untuk produk
  if (platform.isProduct) {
    return `Product on ${platform.title}`;
  }
  
  // Untuk video
  if (platform.isVideo) {
    return `Video on ${platform.title}`;
  }

  // Format domain untuk judul default
  const domainTitle = domain
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|co|id)$/, '')
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  
  // Tampilkan path pertama jika ada
  if (path.length > 0) {
    const firstPath = path[0]
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return `${firstPath} - ${domainTitle}`;
  }
  
  // Default titlenya hanya domain
  return domainTitle;
}; 