// Language utility functions for voice recognition

export interface LanguageConfig {
  code: string;
  name: string;
  whisperCode: string;
  googleCode: string;
  browserCode: string;
}

export const supportedLanguages: LanguageConfig[] = [
  {
    code: 'english',
    name: 'English',
    whisperCode: 'en',
    googleCode: 'en-US',
    browserCode: 'en-US'
  },
  {
    code: 'spanish',
    name: 'Spanish',
    whisperCode: 'es',
    googleCode: 'es-ES',
    browserCode: 'es-ES'
  },
  {
    code: 'french',
    name: 'French',
    whisperCode: 'fr',
    googleCode: 'fr-FR',
    browserCode: 'fr-FR'
  },
  {
    code: 'german',
    name: 'German',
    whisperCode: 'de',
    googleCode: 'de-DE',
    browserCode: 'de-DE'
  },
  {
    code: 'italian',
    name: 'Italian',
    whisperCode: 'it',
    googleCode: 'it-IT',
    browserCode: 'it-IT'
  },
  {
    code: 'portuguese',
    name: 'Portuguese',
    whisperCode: 'pt',
    googleCode: 'pt-PT',
    browserCode: 'pt-PT'
  },
  {
    code: 'russian',
    name: 'Russian',
    whisperCode: 'ru',
    googleCode: 'ru-RU',
    browserCode: 'ru-RU'
  },
  {
    code: 'japanese',
    name: 'Japanese',
    whisperCode: 'ja',
    googleCode: 'ja-JP',
    browserCode: 'ja-JP'
  },
  {
    code: 'korean',
    name: 'Korean',
    whisperCode: 'ko',
    googleCode: 'ko-KR',
    browserCode: 'ko-KR'
  },
  {
    code: 'chinese',
    name: 'Chinese',
    whisperCode: 'zh',
    googleCode: 'zh-CN',
    browserCode: 'zh-CN'
  },
  {
    code: 'arabic',
    name: 'Arabic',
    whisperCode: 'ar',
    googleCode: 'ar-SA',
    browserCode: 'ar-SA'
  },
  {
    code: 'hindi',
    name: 'Hindi',
    whisperCode: 'hi',
    googleCode: 'hi-IN',
    browserCode: 'hi-IN'
  }
];

export function getLanguageConfig(selectedLanguage: string): LanguageConfig {
  return supportedLanguages.find(lang => lang.code === selectedLanguage) || supportedLanguages[0];
}

export function getLanguageCodeForMethod(selectedLanguage: string, method: 'whisper' | 'google' | 'browser'): string {
  const config = getLanguageConfig(selectedLanguage);
  
  switch (method) {
    case 'whisper':
      return config.whisperCode;
    case 'google':
      return config.googleCode;
    case 'browser':
      return config.browserCode;
    default:
      return config.browserCode;
  }
}

// Additional languages supported by Whisper but not in the UI
export const whisperOnlyLanguages = [
  'af', 'am', 'as', 'az', 'ba', 'be', 'bg', 'bn', 'bo', 'br', 'bs', 'ca', 
  'cs', 'cy', 'da', 'el', 'et', 'eu', 'fa', 'fi', 'fo', 'gl', 'gu', 'ha', 
  'haw', 'he', 'hr', 'ht', 'hu', 'hy', 'id', 'is', 'jw', 'ka', 'kk', 'km', 
  'kn', 'la', 'lb', 'ln', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 
  'mr', 'ms', 'mt', 'my', 'ne', 'nl', 'nn', 'no', 'oc', 'pa', 'pl', 'ps', 
  'ro', 'sa', 'sd', 'si', 'sk', 'sl', 'sn', 'so', 'sq', 'sr', 'su', 'sv', 
  'sw', 'ta', 'te', 'tg', 'th', 'tk', 'tl', 'tr', 'tt', 'uk', 'ur', 'uz', 
  'vi', 'yi', 'yo', 'yue'
];

export function isLanguageSupportedByWhisper(languageCode: string): boolean {
  const whisperCodes = supportedLanguages.map(lang => lang.whisperCode);
  return whisperCodes.includes(languageCode) || whisperOnlyLanguages.includes(languageCode);
}

// Map Whisper language codes to human-readable names
export const whisperLanguageNames: { [key: string]: string } = {
  'en': 'English',
  'es': 'Spanish', 
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'ur': 'Urdu',
  'bn': 'Bengali',
  'te': 'Telugu',
  'ta': 'Tamil',
  'mr': 'Marathi',
  'gu': 'Gujarati',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'pa': 'Punjabi',
  'ne': 'Nepali',
  'si': 'Sinhala',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Filipino',
  'tr': 'Turkish',
  'fa': 'Persian',
  'he': 'Hebrew',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'pl': 'Polish',
  'cs': 'Czech',
  'sk': 'Slovak',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'sr': 'Serbian',
  'sl': 'Slovenian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian',
  'uk': 'Ukrainian',
  'be': 'Belarusian',
  'mk': 'Macedonian',
  'mt': 'Maltese',
  'cy': 'Welsh',
  'ga': 'Irish',
  'is': 'Icelandic',
  'fo': 'Faroese',
  'eu': 'Basque',
  'ca': 'Catalan',
  'gl': 'Galician',
  'el': 'Greek',
  'sq': 'Albanian',
  'bs': 'Bosnian',
  'me': 'Montenegrin',
  'af': 'Afrikaans',
  'sw': 'Swahili',
  'yo': 'Yoruba',
  'ha': 'Hausa',
  'am': 'Amharic',
  'so': 'Somali',
  'mg': 'Malagasy'
};

export function getLanguageDisplayName(languageCode: string): string {
  return whisperLanguageNames[languageCode] || languageCode.toUpperCase();
}