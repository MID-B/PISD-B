// Retry short-lived network/provider failures without retrying quota or configuration errors.
export async function requestTranslation(url: string, options: RequestInit) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (attempt < 2 && response.status >= 500 && result?.code === 'TRANSLATOR_UNAVAILABLE') {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      return { response, result };
    } catch (error) {
      if (attempt >= 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
