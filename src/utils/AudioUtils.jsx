// Audio utility functions
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
    return tens[tenDigit] + (oneDigit > 0 ? '-' + ones[oneDigit] : '');
  } else if (num === 100) {
    return 'one hundred';
  }
  
  return num.toString(); // fallback untuk angka di atas 100
};

export const playCountSound = (count) => {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (count <= 20) {
    speechSynthesis.cancel();
    
    setTimeout(() => {
      const countWord = numberToWords(count);
      const utterance = new SpeechSynthesisUtterance(countWord);
      utterance.rate = 1.2;
      utterance.volume = 0.8;
      
      const setupVoice = () => {
        const voices = speechSynthesis.getVoices();
        
        if (voices.length === 0) {
          setTimeout(setupVoice, 100);
          return;
        }
        
        let selectedVoice = null;
        
        if (isMobile) {
          selectedVoice = voices.find(voice => {
            const name = voice.name.toLowerCase();
            const lang = voice.lang.toLowerCase();
            return (lang.includes('en-us') || lang.includes('en-gb')) && 
                   (name.includes('google') || voice.default);
          });
        } else {
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
        
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => {
            const lang = voice.lang.toLowerCase();
            return lang.includes('en-us') || lang.includes('en-gb');
          });
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        console.log('Selected voice:', selectedVoice ? selectedVoice.name : 'default', 'for count:', count);
        speechSynthesis.speak(utterance);
      };
      
      setupVoice();
    }, 50);
  }
};

export const playAnnouncement = (text) => {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  speechSynthesis.cancel();
  
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.volume = 0.9;
    
    const setupVoice = () => {
      const voices = speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        setTimeout(setupVoice, 100);
        return;
      }
      
      let selectedVoice = null;
      
      if (isMobile) {
        selectedVoice = voices.find(voice => {
          const name = voice.name.toLowerCase();
          const lang = voice.lang.toLowerCase();
          return (lang.includes('en-us') || lang.includes('en-gb')) && 
                 (name.includes('google') || voice.default);
        });
      } else {
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
      
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => {
          const lang = voice.lang.toLowerCase();
          return lang.includes('en-us') || lang.includes('en-gb');
        });
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      speechSynthesis.speak(utterance);
    };
    
    setupVoice();
  }, 50);
};