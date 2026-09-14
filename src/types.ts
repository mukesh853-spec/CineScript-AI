export type LanguageMode =
  | 'auto'
  | 'tamil'
  | 'english'
  | 'tanglish'
  | 'hindi'
  | 'telugu'
  | 'malayalam'
  | 'kannada'
  | 'bengali'
  | 'marathi'
  | 'gujarati'
  | 'punjabi'
  | 'urdu'
  | 'odia'
  | 'assamese'
  | 'nepali'
  | 'sinhala'
  | 'arabic'
  | 'chinese_simplified'
  | 'chinese_traditional'
  | 'japanese'
  | 'korean'
  | 'spanish'
  | 'french'
  | 'german'
  | 'portuguese'
  | 'italian'
  | 'russian'
  | 'turkish'
  | 'indonesian'
  | 'vietnamese'
  | 'thai'
  | 'dutch'
  | 'polish'
  | 'ukrainian'
  | string;

export interface LanguageOption {
  id: LanguageMode;
  label: string;
  nativeLabel?: string;
  category: 'auto' | 'indian' | 'international' | 'special';
  description?: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'auto', label: 'Auto Detect', category: 'auto', description: 'Detects input language automatically' },
  
  // Indian Languages
  { id: 'tamil', label: 'Tamil', nativeLabel: 'தமிழ்', category: 'indian', description: 'முழு தமிழ் திரைக்கதை' },
  { id: 'english', label: 'English', nativeLabel: 'English', category: 'indian', description: 'Standard professional English screenplay' },
  { id: 'hindi', label: 'Hindi', nativeLabel: 'हिन्दी', category: 'indian', description: 'पूर्ण हिन्दी पटकथा' },
  { id: 'telugu', label: 'Telugu', nativeLabel: 'తెలుగు', category: 'indian', description: 'సంపూర్ణ తెలుగు స్క్రీన్‌ప్లే' },
  { id: 'malayalam', label: 'Malayalam', nativeLabel: 'മലയാളം', category: 'indian', description: 'പൂർണ്ണ മലയാളം തിരക്കഥ' },
  { id: 'kannada', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', category: 'indian', description: 'ಸಂಪೂರ್ಣ ಕನ್ನಡ ಚಿತ್ರಕಥೆ' },
  { id: 'bengali', label: 'Bengali', nativeLabel: 'বাংলা', category: 'indian', description: 'সম্পূর্ণ বাংলা চিত্রনাট্য' },
  { id: 'marathi', label: 'Marathi', nativeLabel: 'मराठी', category: 'indian', description: 'संपूर्ण मराठी पटकथा' },
  { id: 'gujarati', label: 'Gujarati', nativeLabel: 'ગુજરાતી', category: 'indian', description: 'સંપૂર્ણ ગુજરાતી પટકથા' },
  { id: 'punjabi', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', category: 'indian', description: 'ਪੂਰੀ ਪੰਜਾਬੀ ਸਕ੍ਰਿਪਟ' },
  { id: 'urdu', label: 'Urdu', nativeLabel: 'اردو', category: 'indian', description: 'مکمل اردو اسکرین پلے' },
  { id: 'odia', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ', category: 'indian', description: 'ସମ୍ପୂର୍ଣ୍ଣ ଓଡ଼ିଆ ସ୍କ୍ରିପ୍ଟ' },
  { id: 'assamese', label: 'Assamese', nativeLabel: 'অসমীয়া', category: 'indian', description: 'সম্পূৰ্ণ অসমীয়া চিত্ৰনাট্য' },
  { id: 'nepali', label: 'Nepali', nativeLabel: 'नेपाली', category: 'indian', description: 'पूर्ण नेपाली पटकथा' },
  { id: 'sinhala', label: 'Sinhala', nativeLabel: 'සිංහල', category: 'indian', description: 'සම්පූර්ණ සිංහල තිර රචනය' },

  // International Languages
  { id: 'arabic', label: 'Arabic', nativeLabel: 'العربية', category: 'international', description: 'سيناريو سينمائي كامل باللغة العربية' },
  { id: 'chinese_simplified', label: 'Chinese (Simplified)', nativeLabel: '简体中文', category: 'international', description: '完整简体中文电影剧本' },
  { id: 'chinese_traditional', label: 'Chinese (Traditional)', nativeLabel: '繁體中文', category: 'international', description: '完整繁體中文電影劇本' },
  { id: 'japanese', label: 'Japanese', nativeLabel: '日本語', category: 'international', description: '日本語の本格的な映画脚本' },
  { id: 'korean', label: 'Korean', nativeLabel: '한국어', category: 'international', description: '완전한 한국어 영화 시나리오' },
  { id: 'spanish', label: 'Spanish', nativeLabel: 'Español', category: 'international', description: 'Guion cinematográfico completo en español' },
  { id: 'french', label: 'French', nativeLabel: 'Français', category: 'international', description: 'Scénario complet en français' },
  { id: 'german', label: 'German', nativeLabel: 'Deutsch', category: 'international', description: 'Vollständiges Drehbuch auf Deutsch' },
  { id: 'portuguese', label: 'Portuguese', nativeLabel: 'Português', category: 'international', description: 'Roteiro de cinema completo em português' },
  { id: 'italian', label: 'Italian', nativeLabel: 'Italiano', category: 'international', description: 'Sceneggiatura cinematografica in italiano' },
  { id: 'russian', label: 'Russian', nativeLabel: 'Русский', category: 'international', description: 'Полноценный сценарий на русском языке' },
  { id: 'turkish', label: 'Turkish', nativeLabel: 'Türkçe', category: 'international', description: 'Türkçe sinema senaryosu' },
  { id: 'indonesian', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia', category: 'international', description: 'Naskah skenario film lengkap Bahasa Indonesia' },
  { id: 'vietnamese', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', category: 'international', description: 'Kịch bản phim hoàn chỉnh bằng tiếng Việt' },
  { id: 'thai', label: 'Thai', nativeLabel: 'ไทย', category: 'international', description: 'บทภาพยนตร์ภาษาไทยฉบับสมบูรณ์' },
  { id: 'dutch', label: 'Dutch', nativeLabel: 'Nederlands', category: 'international', description: 'Volledig filmscenario in het Nederlands' },
  { id: 'polish', label: 'Polish', nativeLabel: 'Polski', category: 'international', description: 'Pełny scenariusz filmowy w języku polskim' },
  { id: 'ukrainian', label: 'Ukrainian', nativeLabel: 'Українська', category: 'international', description: 'Повний кіносценарій українською мовою' },

  // Special Writing Style
  { id: 'tanglish', label: 'Tanglish', nativeLabel: 'Tamil in English Script', category: 'special', description: 'English sluglines + Spoken Tamil in English alphabet' },
];

export type GenerationMode = 'fast' | 'compare';

export interface StoryOutline {
  beginning: string;
  conflict: string;
  escalation: string;
  climax: string;
  ending: string;
}

export interface Character {
  id: string;
  name: string;
  age: string;
  gender: string;
  role: string;
  personality: string;
  description: string;
  relationship: string;
  goal: string;
  conflict: string;
}

export interface StorySettings {
  genre: string;
  tone: string;
  length: string;
  languageMode: LanguageMode;
  generationMode?: GenerationMode;
}

export type ElementType = 
  | 'scene_heading' 
  | 'action' 
  | 'character' 
  | 'parenthetical' 
  | 'dialogue' 
  | 'transition' 
  | 'note';

export interface ScreenplayElement {
  id: string;
  type: ElementType;
  content: string;
  characterName?: string;
}

export interface ScreenplayScene {
  id: string;
  sceneNumber: number;
  heading: string;
  location: string;
  time: string;
  elements: ScreenplayElement[];
}

export interface ScriptVersion {
  id: string;
  versionNumber: number;
  versionLabel: string;
  description: string;
  createdAt: string;
  scenes: ScreenplayScene[];
  title: string;
  storyOutline?: StoryOutline;
}

export interface Screenplay {
  id: string;
  title: string;
  oneLineConcept: string;
  detectedLanguage: 'Tamil' | 'English' | 'Tanglish' | 'Mixed';
  languageMode: LanguageMode;
  genre: string;
  tone: string;
  length: string;
  characters: Character[];
  versionName: string;
  creativeAngle: string;
  storyOutline?: StoryOutline;
  scenes: ScreenplayScene[];
  versions?: ScriptVersion[];
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface EvaluationCriterion {
  name: string;
  scoreA: number; // 1-10
  scoreB: number; // 1-10
}

export interface AIEvaluation {
  recommendation: 'Version A' | 'Version B';
  reasoning: string;
  criteria: EvaluationCriterion[];
  summaryA: string;
  summaryB: string;
}

export interface GenerationResult {
  detectedLanguage: 'Tamil' | 'English' | 'Tanglish' | 'Mixed';
  title: string;
  storyOutline?: StoryOutline;
  versionA: Screenplay;
  versionB: Screenplay;
  evaluation: AIEvaluation;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}
