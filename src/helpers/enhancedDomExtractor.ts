import { getSimplifiedDom } from "./simplifyDom";

/**
 * Ekstrak dan format DOM untuk digunakan dalam Vision Enhanced Mode yang memprioritaskan DOM
 * @returns String representasi DOM yang dapat digunakan untuk memahami struktur halaman
 */
export async function getEnhancedDomForVision(): Promise<string> {
  try {
    const simplifiedDom = await getSimplifiedDom();
    if (!simplifiedDom) {
      console.warn("Tidak dapat memperoleh simplified DOM");
      return "DOM structure not available";
    }
    
    // Format DOM sebagai teks terstruktur yang lebih mudah dibaca
    const domText = formatDomToStructuredText(simplifiedDom);
    return domText;
  } catch (error) {
    console.error("Error saat mendapatkan enhanced DOM:", error);
    return "Error retrieving DOM structure";
  }
}

/**
 * Mengubah DOM menjadi representasi teks terstruktur yang lebih mudah dibaca oleh model AI
 */
function formatDomToStructuredText(element: HTMLElement, depth = 0, maxElements = 500): string {
  const indentation = "  ".repeat(depth);
  let result = "";
  
  // Batasi jumlah elemen untuk menghindari teks yang terlalu panjang
  let elementCount = 0;
  
  // Fungsi rekursif untuk memproses elemen dan anak-anaknya
  function processElement(el: HTMLElement, currentDepth: number, path = ""): void {
    if (elementCount >= maxElements) return;
    
    elementCount++;
    
    // Tambahkan tag dengan atribut penting
    const tagName = el.tagName.toLowerCase();
    let elementInfo = `${indentation}[${path}${tagName}`;
    
    // Tambahkan informasi tentang ID jika ada
    if (el.id) {
      elementInfo += ` id="${el.id}"`;
    }
    
    // Tambahkan atribut interaktif penting
    const importantAttrs = ["role", "aria-label", "placeholder", "name", "type", "value"];
    importantAttrs.forEach(attr => {
      if (el.hasAttribute(attr)) {
        elementInfo += ` ${attr}="${el.getAttribute(attr)}"`;
      }
    });
    
    // Tutup tag pembuka
    elementInfo += "]";
    
    // Tambahkan teks konten jika ini adalah elemen dengan teks
    if (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE && el.firstChild.textContent?.trim()) {
      elementInfo += `: "${el.firstChild.textContent.trim()}"`;
    }
    
    result += elementInfo + "\n";
    
    // Proses semua anak dari elemen ini
    if (el.children.length > 0) {
      Array.from(el.children).forEach((child, index) => {
        if (child instanceof HTMLElement) {
          processElement(child, currentDepth + 1, `${path}${index+1}.`);
        }
      });
    }
  }
  
  processElement(element, depth);
  
  if (elementCount >= maxElements) {
    result += `\n... (hanya ${maxElements} elemen pertama yang ditampilkan untuk efisiensi) ...`;
  }
  
  return result;
} 