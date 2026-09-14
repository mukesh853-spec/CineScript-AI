import { GenerationResult, LanguageMode, GenerationMode, Character, StorySettings, Screenplay } from '../types';

export async function detectLanguage(concept: string): Promise<'Tamil' | 'English' | 'Tanglish' | 'Mixed'> {
  try {
    const res = await fetch('/api/detect-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept }),
    });
    if (!res.ok) throw new Error('Failed to detect language');
    const data = await res.json();
    return data.detectedLanguage || 'English';
  } catch (err) {
    console.warn('Language detection fallback:', err);
    // Simple heuristic fallback
    const hasTamilScript = /[\u0B80-\u0BFF]/.test(concept);
    if (hasTamilScript) return 'Tamil';
    const lower = concept.toLowerCase();
    const tanglishKeywords = ['oru', 'naan', 'avan', 'avanga', 'pannala', 'panna', 'kulla', 'solla', 'nu', 'da', 'di', 'irukku', 'theriyuthu', 'therila'];
    const containsTanglish = tanglishKeywords.some(kw => new RegExp(`\\b${kw}\\b`).test(lower));
    if (containsTanglish) return 'Tanglish';
    return 'English';
  }
}

export async function generateScreenplay(params: {
  title?: string;
  concept: string;
  languageMode: LanguageMode;
  characters: Character[];
  genre: string;
  tone: string;
  length: string;
  generationMode?: GenerationMode;
}): Promise<GenerationResult> {
  const res = await fetch('/api/generate-screenplay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to generate screenplay. Please try again.');
  }

  const data: GenerationResult = await res.json();
  return data;
}

export async function aiRewriteScript(params: {
  actionType: string;
  currentScreenplay: Screenplay;
  targetSceneIndex?: number;
  targetElementIndex?: number;
  instruction?: string;
}): Promise<{ updatedScenes: any[]; newScenes?: any[]; changeSummary: string }> {
  const res = await fetch('/api/ai-rewrite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'AI Rewrite operation failed.');
  }

  return await res.json();
}
