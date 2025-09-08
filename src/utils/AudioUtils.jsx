// Audio utility functions - Fixed for mobile browsers
let audioContext = null;
let isAudioEnabled = false;

// Initialize audio context after user interaction
const initAudioContext = () => {
  if (!audioContext) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContext();
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      isAudioEnabled = true;
      console.log('Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }
};

// Function to enable audio after user interaction
export const enableAudio = () => {
  initAudioContext();
  
  // Test speech synthesis availability
  if ('speechSynthesis' in window) {
    // Load voices if not already loaded
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('Voices loaded:', voices.length);
        return true;
      }
      return false;
    };
    
    if (!loadVoices()) {
      speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
    }
  }
};

// Complete number to words conversion for 1-100
const numberToWords = (num) => {
  if (num === 0) return 'zero';
  
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 
                'seventeen', 'eighteen', 'nineteen'];
  
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  if (num < 20) {
    return ones[num];
  } else if (num < 100) {
    const tenDigit = Math.floor(num / 10);
    const oneDigit = num % 10;
    return tens[tenDigit] + (oneDigit > 0 ? ' ' + ones[oneDigit] : '');
  } else if (num === 100) {
    return 'one hundred';
  }
  
  return num.toString(); // fallback untuk angka di atas 100
};

// Alternative: Direct mapping for better pronunciation
const englishNumbers = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
  6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
  16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
  21: 'twenty one', 22: 'twenty two', 23: 'twenty three', 24: 'twenty four', 25: 'twenty five',
  26: 'twenty six', 27: 'twenty seven', 28: 'twenty eight', 29: 'twenty nine', 30: 'thirty',
  31: 'thirty one', 32: 'thirty two', 33: 'thirty three', 34: 'thirty four', 35: 'thirty five',
  36: 'thirty six', 37: 'thirty seven', 38: 'thirty eight', 39: 'thirty nine', 40: 'forty',
  41: 'forty one', 42: 'forty two', 43: 'forty three', 44: 'forty four', 45: 'forty five',
  46: 'forty six', 47: 'forty seven', 48: 'forty eight', 49: 'forty nine', 50: 'fifty',
  51: 'fifty one', 52: 'fifty two', 53: 'fifty three', 54: 'fifty four', 55: 'fifty five',
  56: 'fifty six', 57: 'fifty seven', 58: 'fifty eight', 59: 'fifty nine', 60: 'sixty',
  61: 'sixty one', 62: 'sixty two', 63: 'sixty three', 64: 'sixty four', 65: 'sixty five',
  66: 'sixty six', 67: 'sixty seven', 68: 'sixty eight', 69: 'sixty nine', 70: 'seventy',
  71: 'seventy one', 72: 'seventy two', 73: 'seventy three', 74: 'seventy four', 75: 'seventy five',
  76: 'seventy six', 77: 'seventy seven', 78: 'seventy eight', 79: 'seventy nine', 80: 'eighty',
  81: 'eighty one', 82: 'eighty two', 83: 'eighty three', 84: 'eighty four', 85: 'eighty five',
  86: 'eighty six', 87: 'eighty seven', 88: 'eighty eight', 89: 'eighty nine', 90: 'ninety',
  91: 'ninety one', 92: 'ninety two', 93: 'ninety three', 94: 'ninety four', 95: 'ninety five',
  96: 'ninety six', 97: 'ninety seven', 98: 'ninety eight', 99: 'ninety nine', 100: 'one hundred'
};

const selectVoice = () => {
  const voices = speechSynthesis.getVoices();
  
  if (voices.length === 0) {
    return null;
  }
  
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  let selectedVoice = null;
  
  if (isIOS) {
    // For iOS, prefer built-in voices
    selectedVoice = voices.find(voice => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      return (lang.includes('en-us') || lang.includes('en-gb')) && 
             (name.includes('samantha') || name.includes('alex') || voice.default);
    });
  } else if (isMobile) {
    // For Android, prefer Google voices
    selectedVoice = voices.find(voice => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      return (lang.includes('en-us') || lang.includes('en-gb')) && 
             (name.includes('google') || voice.default);
    });
  } else {
    // For desktop
    selectedVoice = voices.find(voice => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      return (name.includes('male') || 
              name.includes('david') || 
              name.includes('mark') || 
              name.includes('alex')) && 
            (lang.includes('en') || lang.includes('id'));
    });
  }
  
  // Fallback to any English voice
  if (!selectedVoice) {
    selectedVoice = voices.find(voice => {
      const lang = voice.lang.toLowerCase();
      return lang.includes('en-us') || lang.includes('en-gb') || lang.includes('en');
    });
  }
  
  // Final fallback to default voice
  if (!selectedVoice && voices.length > 0) {
    selectedVoice = voices[0];
  }
  
  return selectedVoice;
};

const speakText = (text, rate = 1.0, volume = 0.8) => {
  return new Promise((resolve, reject) => {
    // Check if speech synthesis is available
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      resolve();
      return;
    }
    
    // Enable audio context if not already enabled
    if (!isAudioEnabled) {
      initAudioContext();
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Small delay to ensure cancellation is processed
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.volume = volume;
      utterance.pitch = 1.0;
      
      // Set voice
      const voice = selectVoice();
      if (voice) {
        utterance.voice = voice;
        console.log('Using voice:', voice.name, voice.lang);
      } else {
        console.warn('No suitable voice found');
      }
      
      // Add event listeners
      utterance.onstart = () => {
        console.log('Speech started:', text);
      };
      
      utterance.onend = () => {
        console.log('Speech ended:', text);
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech error:', event.error, text);
        resolve(); // Resolve instead of reject to continue app flow
      };
      
      utterance.onpause = () => {
        console.log('Speech paused');
      };
      
      utterance.onresume = () => {
        console.log('Speech resumed');
      };
      
      try {
        speechSynthesis.speak(utterance);
        
        // Fallback timeout in case speech doesn't work
        setTimeout(() => {
          if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
          }
          resolve();
        }, 5000); // 5 second timeout
        
      } catch (error) {
        console.error('Error speaking text:', error);
        resolve();
      }
    }, 100);
  });
};

// Updated function to support all numbers 1-100
export const playCountSound = async (count) => {
  if (count >= 1 && count <= 100) {
    try {
      // Use direct mapping for better pronunciation
      const countWord = englishNumbers[count] || numberToWords(count);
      await speakText(countWord, 1.2, 0.8);
    } catch (error) {
      console.error('Error playing count sound:', error);
    }
  } else {
    console.warn('Count out of range (1-100):', count);
  }
};

export const playAnnouncement = async (text) => {
  try {
    await speakText(text, 1.0, 0.9);
  } catch (error) {
    console.error('Error playing announcement:', error);
  }
};

// Function to test audio
export const testAudio = async () => {
  try {
    enableAudio();
    await speakText('', 1.0, 0.8);
    return true;
  } catch (error) {
    console.error('Audio test failed:', error);
    return false;
  }
};