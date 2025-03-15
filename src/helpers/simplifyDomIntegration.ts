import { getSimplifiedDom } from "./simplifyDom";
import { callRPC } from "./rpc/pageRPC";

/**
 * Fungsi yang mengambil dan memproses DOM untuk digunakan dalam mode Vision Enhanced
 * yang sudah ditingkatkan. Ini menggabungkan kemampuan mode Text dengan Vision.
 */
export async function getEnhancedDomForVision(): Promise<string> {
  try {
    // Gunakan getSimplifiedDom dari mode Text untuk mendapatkan struktur DOM
    const simplifiedDom = await getSimplifiedDom();
    
    // Konversi SimplifiedDom menjadi format teks yang bisa digunakan di prompt
    const domTextContent = formatDomForEnhancedVision(simplifiedDom);
    
    return domTextContent;
  } catch (error) {
    console.error("Error saat mendapatkan DOM terstruktur:", error);
    return "Tidak bisa mendapatkan struktur DOM (terjadi kesalahan).";
  }
}

/**
 * Memformat SimplifiedDom menjadi representasi teks yang lebih mudah dibaca
 * untuk dimasukkan ke dalam prompt Vision Enhanced.
 */
function formatDomForEnhancedVision(simplifiedDom: any): string {
  if (!simplifiedDom) return "Tidak ada data DOM tersedia.";
  
  let formattedContent = "";
  
  // Fungsi rekursif untuk memproses node DOM dan childrennya
  function processNode(node: any, depth = 0) {
    if (!node) return;
    
    const indent = " ".repeat(depth * 2);
    const tagName = node.tagName || "TEXT";
    
    // Buat representasi node saat ini
    let nodeRepresentation = `${indent}[${tagName}`;
    
    // Tambahkan atribut penting
    if (node.id) nodeRepresentation += ` id="${node.id}"`;
    if (node.className) nodeRepresentation += ` class="${node.className}"`;
    if (node.href) nodeRepresentation += ` href="${node.href}"`;
    if (node.value) nodeRepresentation += ` value="${node.value}"`;
    if (node.placeholder) nodeRepresentation += ` placeholder="${node.placeholder}"`;
    if (node.type) nodeRepresentation += ` type="${node.type}"`;
    if (node.name) nodeRepresentation += ` name="${node.name}"`;
    if (node.ariaLabel) nodeRepresentation += ` aria-label="${node.ariaLabel}"`;
    
    // Info tentang interaktivitas
    if (node.isInteractive) nodeRepresentation += " interactive";
    if (node.isVisible) nodeRepresentation += " visible";

    // Tambahkan UID jika ada (penting untuk aksi seperti click)
    if (node.uid) nodeRepresentation += ` uid="${node.uid}"`;
    
    nodeRepresentation += "]";
    
    // Tambahkan text content jika ada
    if (node.textContent && node.textContent.trim() !== "") {
      const trimmedText = node.textContent.trim().replace(/\s+/g, " ");
      nodeRepresentation += `: "${trimmedText}"`;
    }
    
    formattedContent += nodeRepresentation + "\n";
    
    // Proses children secara rekursif
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => {
        processNode(child, depth + 1);
      });
    }
  }
  
  // Mulai pemrosesan dari root node
  processNode(simplifiedDom);
  
  return formattedContent;
}

/**
 * Fungsi yang memanggil RPC untuk mendapatkan DOM terstruktur
 * langsung dari halaman web
 */
export async function getStructuredDomFromPage(): Promise<string> {
  try {
    // Menggunakan getAnnotatedDOM yang sudah tersedia sebagai RPC method
    const fullDom = await callRPC("getAnnotatedDOM", [], 5);
    if (fullDom) {
      // Konversi DOM menjadi format teks yang mudah dibaca
      const domTextRepresentation = JSON.stringify(fullDom, null, 2);
      return domTextRepresentation.length > 30000 
        ? domTextRepresentation.substring(0, 30000) + "... (truncated for brevity)" 
        : domTextRepresentation;
    }
    return "Tidak bisa mendapatkan DOM terstruktur.";
  } catch (error) {
    console.error("Error saat mengambil DOM terstruktur:", error);
    return "Tidak bisa mendapatkan DOM terstruktur (terjadi kesalahan).";
  }
} 