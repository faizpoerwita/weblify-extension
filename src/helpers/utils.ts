export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truthyFilter<T>(value: T | null | undefined): value is T {
  return Boolean(value);
}

export async function waitFor(
  predicate: () => Promise<boolean>,
  interval: number,
  _maxChecks: number,
  rejectOnTimeout = true,
): Promise<void> {
  // special case for 0 maxChecks (wait forever)
  const maxChecks = _maxChecks === 0 ? Infinity : _maxChecks;
  let checkCount = 0;
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      if (await predicate()) {
        clearInterval(intervalId);
        resolve();
      } else {
        checkCount++;
        if (checkCount >= maxChecks) {
          clearInterval(intervalId);
          if (rejectOnTimeout) {
            reject(new Error("Timed out waiting for condition"));
          } else {
            resolve();
          }
        }
      }
    }, interval);
  });
}

export async function waitTillStable(
  getSize: () => Promise<number>,
  interval: number,
  timeout: number,
  rejectOnTimeout = false, // default to assuming stable after timeout
): Promise<void> {
  let lastSize = 0;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;
  const stabilityThreshold = 100; // Toleransi perubahan ukuran yang diizinkan

  return waitFor(
    async () => {
      const currentSize = await getSize();

      console.log("last: ", lastSize, " <> curr: ", currentSize);

      // Cek apakah ukuran stabil dengan toleransi threshold
      const isStable = Math.abs(currentSize - lastSize) <= stabilityThreshold;
      
      if (lastSize != 0 && isStable) {
        countStableSizeIterations++;
        console.log(`DOM stabil iterasi ${countStableSizeIterations}/${minStableSizeIterations}`);
      } else {
        if (countStableSizeIterations > 0) {
          console.log("Perubahan DOM terdeteksi, reset counter stabilitas");
        }
        countStableSizeIterations = 0; // reset counter
      }

      if (countStableSizeIterations >= minStableSizeIterations) {
        console.log("Size stable! Assume fully rendered..");
        return true;
      }

      lastSize = currentSize;
      return false;
    },
    interval,
    timeout / interval,
    rejectOnTimeout,
  );
}

export function enumKeys<O extends object, K extends keyof O = keyof O>(
  obj: O,
): K[] {
  return Object.keys(obj) as K[];
}

export function enumValues<O extends object>(obj: O): O[keyof O][] {
  return enumKeys(obj).map((key) => obj[key]);
}

// Fungsi helper baru dengan timeout yang lebih baik
export async function isDOMRendered(
  maxAttempts = 10, 
  interval = 300
): Promise<boolean> {
  let previousDOMSize = 0;
  let stableCount = 0;
  const requiredStability = 3;
  const allowedDiff = 100; // Toleransi perbedaan ukuran

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentSize = document.documentElement.innerHTML.length;
    console.log(`DOM size check ${attempt+1}/${maxAttempts}: ${previousDOMSize} -> ${currentSize}`);
    
    if (previousDOMSize > 0) {
      const diff = Math.abs(currentSize - previousDOMSize);
      if (diff <= allowedDiff) {
        stableCount++;
        if (stableCount >= requiredStability) {
          console.log("DOM stabil setelah", attempt + 1, "percobaan");
          return true;
        }
      } else {
        stableCount = 0; // Reset jika terjadi perubahan besar
      }
    }
    
    previousDOMSize = currentSize;
    
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  console.log("Batas waktu terlampaui, menganggap DOM stabil");
  return true;
}
