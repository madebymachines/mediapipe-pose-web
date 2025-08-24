import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, X, Share2, Download } from 'lucide-react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

// FPS Monitor Class
class FPSMonitor {
  constructor() {
    this.frameCount = 0;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.fps = 0;
    this.avgFps = 0;
    this.fpsHistory = [];
    this.maxHistorySize = 30;
    this.minAcceptableFps = 15;
    this.warningFps = 20;
  }

  update() {
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    this.fps = 1000 / deltaTime;
    
    this.fpsHistory.push(this.fps);
    if (this.fpsHistory.length > this.maxHistorySize) {
      this.fpsHistory.shift();
    }
    
    this.avgFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    
    this.lastTime = currentTime;
    
    return {
      fps: Math.round(this.fps),
      avgFps: Math.round(this.avgFps),
      isLowPerformance: this.avgFps < this.minAcceptableFps,
      showWarning: this.avgFps < this.warningFps,
      frameCount: this.frameCount
    };
  }

  reset() {
    this.frameCount = 0;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.fps = 0;
    this.avgFps = 0;
    this.fpsHistory = [];
  }
}

// Simplified Squat Counter Class with Better Validation
class SquatCounter {
  constructor() {
    this.count = 0;
    this.isDown = false;
    this.stateFrames = 0;
    this.minFrames = 2;
    
    this.downKneeAngleThreshold = 135;
    this.upKneeAngleThreshold = 160;
    
    this.maxKneeAngleDifference = 25;
    this.minKneeBend = 30;
    
    this.standingKneeAngle = null;
  }

  calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  }

  isValidSquatPosition(leftKneeAngle, rightKneeAngle, avgKneeAngle, landmarks) {
    const kneeDifference = Math.abs(leftKneeAngle - rightKneeAngle);
    if (kneeDifference > this.maxKneeAngleDifference) {
      return false;
    }

    if (this.standingKneeAngle === null) {
      if (avgKneeAngle >= 165) {
        this.standingKneeAngle = avgKneeAngle;
      }
      return false;
    }

    const kneeBend = this.standingKneeAngle - avgKneeAngle;
    if (avgKneeAngle <= this.downKneeAngleThreshold && kneeBend < this.minKneeBend) {
      return false;
    }

    // Check if knees are visible and properly positioned
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    // Ensure knees are visible with good confidence
    if (leftKnee.visibility < 0.5 || rightKnee.visibility < 0.5) {
      return false;
    }
    
    // Check if knees are positioned below hips (proper squat form)
    if (leftKnee.y <= leftHip.y || rightKnee.y <= rightHip.y) {
      return false;
    }
    
    // Check if person is just bending forward (knees should be significantly bent)
    const leftHorizontalDistance = Math.abs(leftKnee.x - leftHip.x);
    const rightHorizontalDistance = Math.abs(rightKnee.x - rightHip.x);
    const minHorizontalDistance = 0.05;
    
    if (leftHorizontalDistance < minHorizontalDistance || rightHorizontalDistance < minHorizontalDistance) {
      return false;
    }

    // Check if body is facing forward (not sideways)
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    
    // If shoulders or hips are too narrow, person might be sideways
    const minBodyWidth = 0.08;
    if (shoulderWidth < minBodyWidth || hipWidth < minBodyWidth) {
      return false;
    }
    
    // Check if shoulders and hips are roughly aligned (not twisted)
    const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
    const hipCenter = (leftHip.x + rightHip.x) / 2;
    const bodyAlignment = Math.abs(shoulderCenter - hipCenter);
    
    // If body is too twisted/misaligned, reject
    const maxBodyMisalignment = 0.1;
    if (bodyAlignment > maxBodyMisalignment) {
      return false;
    }
    
    // Check if both knees are roughly at same horizontal level
    const kneeHeightDifference = Math.abs(leftKnee.y - rightKnee.y);
    const maxKneeHeightDiff = 0.05;
    if (kneeHeightDifference > maxKneeHeightDiff) {
      return false;
    }

    return true;
  }

  processPose(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return { count: this.count, alert: "No landmarks detected" };
    }

    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];

    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) {
      return { count: this.count, alert: "Key landmarks missing" };
    }

    const minVisibility = 0.2;
    if (leftHip.visibility < minVisibility || leftKnee.visibility < minVisibility || 
        leftAnkle.visibility < minVisibility || rightHip.visibility < minVisibility || 
        rightKnee.visibility < minVisibility || rightAnkle.visibility < minVisibility) {
      return { count: this.count, alert: "Low landmark visibility" };
    }

    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    const kneeDifference = Math.abs(leftKneeAngle - rightKneeAngle);

    if (avgKneeAngle >= 165 && kneeDifference < 15) {
      this.standingKneeAngle = avgKneeAngle;
    }

    if (!this.isDown && avgKneeAngle <= this.downKneeAngleThreshold) {
      if (this.isValidSquatPosition(leftKneeAngle, rightKneeAngle, avgKneeAngle, landmarks)) {
        this.stateFrames++;
        if (this.stateFrames >= this.minFrames) {
          this.isDown = true;
          this.stateFrames = 0;
          return { count: this.count, isSquatDown: true };
        }
      } else {
        this.stateFrames = 0;
      }
    } 
    else if (this.isDown && avgKneeAngle >= this.upKneeAngleThreshold) {
      if (kneeDifference <= this.maxKneeAngleDifference) {
        this.stateFrames++;
        if (this.stateFrames >= this.minFrames) {
          this.isDown = false;
          this.count++;
          this.stateFrames = 0;
          return { count: this.count, newCount: true };
        }
      } else {
        this.stateFrames = 0;
      }
    } else {
      this.stateFrames = 0;
    }

    return { count: this.count, newCount: false, isSquatDown: this.isDown };
  }

  resetCount() {
    this.count = 0;
    this.isDown = false;
    this.stateFrames = 0;
    this.standingKneeAngle = null;
  }
}

// Grid Photo Component
const GridPhotoPage = ({ photos, totalSquats, round1Count, round2Count, onBack, onShare, currentRound, squatCount, progressPercent }) => {
  const canvasRef = useRef(null);
  const [gridImage, setGridImage] = useState(null);

  useEffect(() => {
    generateGridImage();
  }, [photos]);

  const generateGridImage = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 400;
    canvas.height = 780;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const logoHeight = 80;
    const logoY = 10;
    
    const gridStartY = logoHeight + 20;
    const gridHeight = (canvas.height - gridStartY) * 0.75;
    const photoWidth = canvas.width / 2;
    const photoHeight = gridHeight / 2;
    
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };
    
    try {
      try {
        const logoImg = await loadImage('./assets/LOGO2 1.png');
        
        const logoAspectRatio = logoImg.width / logoImg.height;
        let logoDisplayWidth = canvas.width * 0.6;
        let logoDisplayHeight = logoDisplayWidth / logoAspectRatio;
        
        if (logoDisplayHeight > logoHeight - 20) {
          logoDisplayHeight = logoHeight - 20;
          logoDisplayWidth = logoDisplayHeight * logoAspectRatio;
        }
        
        const logoX = (canvas.width - logoDisplayWidth) / 2;
        const logoYPos = logoY + (logoHeight - logoDisplayHeight) / 2;
        
        ctx.drawImage(logoImg, logoX, logoYPos, logoDisplayWidth, logoDisplayHeight);
      } catch (logoError) {
        console.error('Error loading logo:', logoError);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('UNLOCK YOUR 100', canvas.width / 2, logoY + logoHeight / 2);
      }

      for (let i = 0; i < 4; i++) {
        if (photos[i]) {
          const img = await loadImage(photos[i]);
          const x = (i % 2) * photoWidth;
          const y = gridStartY + Math.floor(i / 2) * photoHeight;
          
          ctx.drawImage(img, x, y, photoWidth, photoHeight);
          
          if (i === 0) {
            const bannerWidth = photoWidth * 0.85;
            const bannerX = x + (photoWidth - bannerWidth) / 2;
            const bannerHeight = 35;
            const bannerY = y + photoHeight * 0.55;
            
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8);
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('HYDRATE AND ENERGIZE', x + photoWidth/2, bannerY + 20);
            
            const gap = 5;
            const blackBannerY = bannerY + bannerHeight + gap;
            const blackBannerHeight = 25;
            const blackBannerWidth = photoWidth * 0.75;
            const blackBannerX = x + (photoWidth - blackBannerWidth) / 2;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.roundRect(blackBannerX, blackBannerY, blackBannerWidth, blackBannerHeight, 8);
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('BEFORE UNLOCK YOUR 100', x + photoWidth/2, blackBannerY + 15);
          } 
          else if (i === 1) {
            const counterAreaY = y + photoHeight * 0.55;
            const counterAreaHeight = photoHeight * 0.40;
            
            const actualCount = round1Count;
            
            const centerY = counterAreaY + counterAreaHeight/2;
            
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.translate(x + 45, centerY - 20);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('ROUND 1', 0, 0);
            ctx.restore();
            
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(actualCount.toString(), x + photoWidth/2 - 10, centerY - 8);
            
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('REP', x + photoWidth/2 + 25, centerY - 15);
          }
          else if (i === 2) {
            const bannerWidth = photoWidth * 0.85;
            const bannerX = x + (photoWidth - bannerWidth) / 2;
            const bannerHeight = 35;
            const bannerY = y + photoHeight * 0.55;
            
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8);
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('RECOVER & REPEAT STRONGER', x + photoWidth/2, bannerY + 20);
            
            const gap = 5;
            const blackBannerY = bannerY + bannerHeight + gap;
            const blackBannerHeight = 25;
            const blackBannerWidth = photoWidth * 0.75;
            const blackBannerX = x + (photoWidth - blackBannerWidth) / 2;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.roundRect(blackBannerX, blackBannerY, blackBannerWidth, blackBannerHeight, 8);
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("IT'S TIME TO", x + photoWidth/2, blackBannerY + 15);
          }
          else if (i === 3) {
            const counterAreaY = y + photoHeight * 0.55;
            const counterAreaHeight = photoHeight * 0.40;
            
            const actualCount = round2Count;
            
            const centerY = counterAreaY + counterAreaHeight/2;
            
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.translate(x + 45, centerY - 20);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('ROUND 2', 0, 0);
            ctx.restore();
            
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(actualCount.toString(), x + photoWidth/2 - 10, centerY - 8);
            
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('REP', x + photoWidth/2 + 25, centerY - 15);
          }
        }
      }
      
      const statsStartY = gridStartY + gridHeight;
      const statsHeight = canvas.height - statsStartY;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, statsStartY, canvas.width, statsHeight);
      
      const statsCenterX = canvas.width / 2;
      const statsCenterY = statsStartY + statsHeight / 2;
      
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'right';
      const countText = totalSquats.toString();
      ctx.fillText(countText, statsCenterX - 80, statsCenterY);

      ctx.save();
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'left';
      ctx.translate(statsCenterX - 60, statsCenterY + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('SQUATS', 0, 0);
      ctx.restore();

      ctx.fillStyle = '#636363';
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('/', statsCenterX - 10, statsCenterY);

      ctx.fillStyle = '#636363';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('100', statsCenterX + 20, statsCenterY);

      ctx.save();
      ctx.fillStyle = '#636363';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'left';
      ctx.translate(statsCenterX + 200, statsCenterY + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('SECONDS', 0, 0);
      ctx.restore();
      
      const dataURL = canvas.toDataURL('image/png');
      setGridImage(dataURL);
      
    } catch (error) {
      console.error('Error generating grid image:', error);
    }
  };

  const handleShare = async () => {
    if (gridImage) {
      try {
        const response = await fetch(gridImage);
        const blob = await response.blob();
        
        const fileName = Math.random().toString(36).substring(2) + ".png";
        const filesArray = [new File([blob], fileName, { type: 'image/png' })];
        
        if (navigator.canShare && navigator.canShare({ files: filesArray })) {
          await navigator.share({
            files: filesArray,
          });
          console.log("Image shared successfully");
        } else {
          console.log("Web Share API not supported, falling back to download");
          const link = document.createElement('a');
          link.href = gridImage;
          link.download = fileName;
          link.click();
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing the image:', error);
          const fileName = Math.random().toString(36).substring(2) + ".png";
          const link = document.createElement('a');
          link.href = gridImage;
          link.download = fileName;
          link.click();
        }
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      <div className="flex items-center justify-between py-4 px-4">
        <button onClick={onBack} className="text-white">
          <ArrowLeft size={24} />
        </button>
        <div className="text-white text-lg font-bold">CHALLENGE COMPLETED</div>
        <div className="w-6"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-6">
          <canvas 
            ref={canvasRef} 
            className="max-w-full h-auto border border-gray-600 rounded-lg"
            style={{ display: 'none' }}
          />
          {gridImage && (
            <img 
              src={gridImage} 
              alt="Squat Challenge Grid" 
              className="max-w-full h-auto"
            />
          )}
        </div>

        <button
          onClick={handleShare}
          className="bg-[#FF0000] w-full text-white py-3 px-8 rounded-lg font-bold hover:bg-red-600 transition-colors flex items-center justify-center"
        >
          <span className="text-white">SHARE TO SOCIAL MEDIA</span>
        </button>
      </div>
    </div>
  );
};

const SquatChallengeApp = ({ onBack }) => {
  const [phase, setPhase] = useState('setup');
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [squatCount, setSquatCount] = useState(0);
  const [totalSquats, setTotalSquats] = useState(0);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [fpsData, setFpsData] = useState({ fps: 0, avgFps: 0, isLowPerformance: false, frameCount: 0 });
  const [isFpsCompatible, setIsFpsCompatible] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [screenshots, setScreenshots] = useState({});
  const [hasSquatPhoto, setHasSquatPhoto] = useState({ round1: false, round2: false });
  const [hasSpokenHydrate, setHasSpokenHydrate] = useState(false);
  const [hasSpokenRecovery, setHasSpokenRecovery] = useState(false);
  const [hasSpokenCongratulations, setHasSpokenCongratulations] = useState(false);

  // Audio functions
  const playCountSound = (count) => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
                    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
    
    if (count <= 20) {
      speechSynthesis.cancel();
      
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(numbers[count]);
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

  const playAnnouncement = (text) => {
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

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const squatCounterRef = useRef(new SquatCounter());
  const fpsMonitorRef = useRef(new FPSMonitor());
  const poseLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);

  // Screenshot function
  const takeScreenshot = useCallback((photoType) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    
    tempCtx.drawImage(video, 0, 0);
    
    tempCtx.drawImage(canvas, 0, 0);
    
    const dataURL = tempCanvas.toDataURL('image/png');
    
    setScreenshots(prev => ({
      ...prev,
      [photoType]: dataURL
    }));
    
    console.log(`Screenshot taken for: ${photoType}`);
  }, []);

  // Initialize MediaPipe
  useEffect(() => {
    const initializePoseLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.3,
          minPosePresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });
        
        poseLandmarkerRef.current = poseLandmarker;
      } catch (error) {
        console.error("Error initializing PoseLandmarker:", error);
      }
    };

    initializePoseLandmarker();
  }, []);

  // Start webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { min: 320, ideal: 480, max: 640 },
          height: { min: 240, ideal: 640, max: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setWebcamRunning(true);
          fpsMonitorRef.current.reset();
        };
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  }, []);

  useEffect(() => {
    if (webcamRunning && videoRef.current && !videoRef.current.srcObject) {
      console.log('Video lost srcObject, restarting...');
      setWebcamRunning(false);
    }
  }, [phase, webcamRunning]);

  useEffect(() => {
    startWebcam();
  }, [startWebcam]);

  useEffect(() => {
    if (!webcamRunning) {
      startWebcam();
    }
  }, [webcamRunning, startWebcam]);

  // FIXED: Pose detection with proper canvas sizing and positioning
  const detectPose = useCallback(async () => {
    if (!videoRef.current || !webcamRunning || !poseLandmarkerRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    if (phase === 'setup') {
      const currentFpsData = fpsMonitorRef.current.update();
      setFpsData(currentFpsData);

      if (currentFpsData.frameCount > 60 && currentFpsData.isLowPerformance) {
        setIsFpsCompatible(false);
      }
    }

    // FIXED: Proper canvas sizing to match video exactly
    const videoRect = video.getBoundingClientRect();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.style.width = `${videoRect.width}px`;
    canvas.style.height = `${videoRect.height}px`;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    
    const canvasCtx = canvas.getContext('2d');
    
    try {
      const startTimeMs = performance.now();
      const results = await poseLandmarkerRef.current.detectForVideo(video, startTimeMs);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        if (phase === 'exercise') {
          // FIXED: Draw skeleton with proper scaling to video dimensions
          const drawingUtils = new DrawingUtils(canvasCtx);
          drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#FFFFFF', lineWidth: 2 });
          drawingUtils.drawLandmarks(landmarks, { color: '#FFFFFF', radius: 4 });
          
          // // FIXED: Debug info positioning - moved to bottom area to avoid overlap
          // const leftHip = landmarks[23];
          // const leftKnee = landmarks[25];
          // const leftAnkle = landmarks[27];
          // const rightHip = landmarks[24];
          // const rightKnee = landmarks[26];
          // const rightAnkle = landmarks[28];
          
          // if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
          //   const leftKneeAngle = squatCounterRef.current.calculateAngle(leftHip, leftKnee, leftAnkle);
          //   const rightKneeAngle = squatCounterRef.current.calculateAngle(rightHip, rightKnee, rightAnkle);
          //   const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
          //   const kneeDifference = Math.abs(leftKneeAngle - rightKneeAngle);
          //   const standingAngle = squatCounterRef.current.standingKneeAngle || 0;
          //   const kneeBend = standingAngle - avgKneeAngle;
            
          //   // FIXED: Position debug text at bottom of canvas, smaller font
          //   const fontSize = Math.max(10, canvas.width * 0.02); // Smaller responsive font
          //   canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          //   const debugBoxHeight = fontSize * 10; // Enough space for all debug lines
          //   canvasCtx.fillRect(0, canvas.height - debugBoxHeight, canvas.width, debugBoxHeight);
            
          //   canvasCtx.fillStyle = '#FFFFFF';
          //   canvasCtx.font = `${fontSize}px Arial`;
            
          //   const textX = 10;
          //   const lineHeight = fontSize + 2;
          //   let currentY = canvas.height - debugBoxHeight + lineHeight; // Start from bottom area
            
          //   canvasCtx.fillText(`L Knee: ${leftKneeAngle.toFixed(1)}°`, textX, currentY);
          //   currentY += lineHeight;
          //   canvasCtx.fillText(`R Knee: ${rightKneeAngle.toFixed(1)}°`, textX, currentY);
          //   currentY += lineHeight;
          //   canvasCtx.fillText(`Avg: ${avgKneeAngle.toFixed(1)}°`, textX, currentY);
          //   currentY += lineHeight;
          //   canvasCtx.fillText(`Difference: ${kneeDifference.toFixed(1)}°`, textX, currentY);
          //   currentY += lineHeight;
          //   canvasCtx.fillText(`Standing: ${standingAngle.toFixed(1)}°`, textX, currentY);
          //   currentY += lineHeight;
          //   canvasCtx.fillText(`Knee Bend: ${kneeBend.toFixed(1)}°`, textX, currentY);
          //   currentY += lineHeight;
          //   canvasCtx.fillText(`State: ${squatCounterRef.current.isDown ? 'DOWN' : 'UP'}`, textX, currentY);
            
          //   // FIXED: Draw angle indicators properly scaled to video
          //   canvasCtx.fillStyle = '#FF0000';
          //   canvasCtx.font = `${fontSize + 2}px Arial`;
            
          //   const leftKneeX = leftKnee.x * canvas.width;
          //   const leftKneeY = leftKnee.y * canvas.height;
          //   canvasCtx.fillText(`${leftKneeAngle.toFixed(1)}°`, leftKneeX + 5, leftKneeY);
            
          //   const rightKneeX = rightKnee.x * canvas.width;
          //   const rightKneeY = rightKnee.y * canvas.height;
          //   canvasCtx.fillText(`${rightKneeAngle.toFixed(1)}°`, rightKneeX - 50, rightKneeY);
            
          //   // Validation indicators in the debug area
          //   currentY += lineHeight;
          //   canvasCtx.fillStyle = kneeDifference <= 25 ? '#00FF00' : '#FF0000';
          //   canvasCtx.fillText(`Both Knees: ${kneeDifference <= 25 ? 'OK' : 'NO'}`, textX, currentY);
          //   currentY += lineHeight;
            
          //   if (standingAngle > 0) {
          //     canvasCtx.fillStyle = kneeBend >= 30 ? '#00FF00' : '#FF0000';
          //     canvasCtx.fillText(`Knee Bend: ≥30° (${kneeBend >= 30 ? 'OK' : 'NO'})`, textX, currentY);
          //   }
          // }
          
          // Process squat counting
          const result = squatCounterRef.current.processPose(landmarks);
          
          // Take screenshot when squat down is detected
          if (result.isSquatDown && !hasSquatPhoto[`round${currentRound}`]) {
            const photoType = currentRound === 1 ? 'round1Squat' : 'round2Squat';
            takeScreenshot(photoType);
            setHasSquatPhoto(prev => ({ ...prev, [`round${currentRound}`]: true }));
          }
          
          if (result.newCount) {
            setSquatCount(result.count);
            setTotalSquats(prev => prev + 1);
            playCountSound(result.count);
            sessionStorage.setItem(`squats_round_${currentRound}`, result.count.toString());
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectPose);
    } catch (error) {
      console.error('Error in pose detection:', error);
      animationFrameRef.current = requestAnimationFrame(detectPose);
    }
  }, [webcamRunning, phase, currentRound, takeScreenshot, hasSquatPhoto]);

  useEffect(() => {
    if (webcamRunning) {
      detectPose();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [webcamRunning, detectPose]);

  // Timer logic with screenshot taking and audio announcements
  useEffect(() => {
    if (phase === 'hydrate' || phase === 'exercise' || phase === 'recovery') {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if ((phase === 'hydrate' || phase === 'recovery') && prev === 5) {
            const message = phase === 'hydrate' ? 'Your First Round Begin in' : 'Your Second Round Begin in';
            playAnnouncement(message);
          }
          
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [phase]);

  // Audio announcements at start of hydrate and recovery phases
  useEffect(() => {
    if (phase === 'hydrate' && timeRemaining === 10 && !hasSpokenHydrate) {
      playAnnouncement('Hydrate and Energize your body');
      setHasSpokenHydrate(true);
    }
  }, [phase, timeRemaining, hasSpokenHydrate]);

  useEffect(() => {
    if (phase === 'recovery' && timeRemaining === 10 && !hasSpokenRecovery) {
      playAnnouncement('Time to Recover and Repeat Stronger your body');
      setHasSpokenRecovery(true);
    }
  }, [phase, timeRemaining, hasSpokenRecovery]);

  useEffect(() => {
    if (phase === 'go') {
      playAnnouncement('GO!');
    }
  }, [phase]);

  // Progress bar calculation
  useEffect(() => {
    let totalTime;
    if (phase === 'hydrate' || phase === 'recovery') totalTime = 10;
    else if (phase === 'exercise') totalTime = 50;
    else return;

    const progress = ((totalTime - timeRemaining) / totalTime) * 100;
    setProgressPercent(Math.min(100, Math.max(0, progress)));
  }, [timeRemaining, phase]);

  const handlePhaseComplete = () => {
    if (phase === 'hydrate') {
      takeScreenshot('hydrate');
      setProgressPercent(100);
      setTimeout(() => {
        setPhase('go');
        setTimeout(() => {
          setPhase('exercise');
          setTimeRemaining(50);
          setProgressPercent(0);
          squatCounterRef.current.resetCount();
          setSquatCount(0);
          setHasSquatPhoto(prev => ({ ...prev, [`round${currentRound}`]: false }));
        }, 2000);
      }, 1000);
    } else if (phase === 'exercise') {
      setProgressPercent(100);
      if (currentRound === 1) {
        setPhase('recovery');
        setTimeRemaining(10);
        setProgressPercent(0);
      } else {
        if (!hasSpokenCongratulations) {
          playAnnouncement('Congratulations! You finished your challenge!');
          setHasSpokenCongratulations(true);
        }
        setTimeout(() => {
          setPhase('grid');
        }, 3000);
      }
    } else if (phase === 'recovery') {
      takeScreenshot('recovery');
      setProgressPercent(100);
      setTimeout(() => {
        setPhase('go');
        setCurrentRound(2);
        setTimeout(() => {
          setPhase('exercise');
          setTimeRemaining(50);
          setProgressPercent(0);
          squatCounterRef.current.resetCount();
          setSquatCount(0);
          setHasSquatPhoto(prev => ({ ...prev, [`round${currentRound}`]: false }));
        }, 2000);
      }, 1000);
    }
  };

  const handleContinue = () => {
    if (isFpsCompatible) {
      setPhase('hydrate');
      setTimeRemaining(10);
      if (videoRef.current) {
        videoRef.current.play().catch(e => console.log('Video play error:', e));
      }
    }
  };

  // Show grid page
  if (phase === 'grid') {
    const round1Count = parseInt(sessionStorage.getItem('squats_round_1') || '0');
    const round2Count = parseInt(sessionStorage.getItem('squats_round_2') || '0');
    const photosArray = [
      screenshots.hydrate,
      screenshots.round1Squat,
      screenshots.recovery,
      screenshots.round2Squat
    ];
    
    return (
      <GridPhotoPage
        photos={photosArray}
        totalSquats={totalSquats}
        round1Count={round1Count}
        round2Count={round2Count}
        onBack={onBack}
        onShare={() => {}}
      />
    );
  }

  return (
    <div className="w-full bg-black text-white flex flex-col" style={{ 
      maxWidth: '430px', 
      margin: "0 auto",
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div className="flex items-center justify-center py-2 relative flex-shrink-0">
        <img 
          src="./assets/LOGO2 1.png" 
          alt="Unlock Your 100 Logo" 
          className="h-12 object-contain"
        />
      </div>

      {phase === 'setup' && (
        <div className="flex-1 flex flex-col">
          {/* FIXED: Video Container with proper relative positioning for canvas overlay */}
          <div className="relative mx-4 mb-4 bg-transparent overflow-hidden" style={{ 
            aspectRatio: '3/4',
            maxHeight: 'calc(100vh - 200px)',
          }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* Status Checks */}
          <div className="mx-4 mb-4">
            <div className="flex items-center justify-between gap-8 mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${webcamRunning ? 'border-[#00FF51]' : 'border-[#FF0000]'}`}>
                  {webcamRunning ? <Check size={12} className="text-[#00FF51]" /> : <X size={12} className="text-[#FF0000]" />}
                </div>
                <span className={`text-lg font-semibold ${webcamRunning ? 'text-[#00FF51]' : 'text-[#FF0000]'}`}>CAMERA</span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isFpsCompatible ? 'border-[#00FF51]' : 'border-[#FF0000]'}`}>
                  {isFpsCompatible ? <Check size={12} className="text-[#00FF51]" /> : <X size={12} className="text-[#FF0000]" />}
                </div>
                <span className={`text-lg font-semibold ${isFpsCompatible ? 'text-[#00FF51]' : 'text-[#FF0000]'}`}>FPS CHECK</span>
              </div>
            </div>
            
            {!isFpsCompatible && (
              <div className="text-white text-sm text-center">
                Sorry, Your device is not compatible. Please find other device to do the challenge!
              </div>
            )}
          </div>

          <div className="mx-4 mb-4 flex gap-4">
            <button
              onClick={onBack}
              className="flex-1 bg-transparent border border-gray-600 text-white py-3 px-6 rounded font-bold hover:bg-gray-800 transition-colors"
            >
              BACK
            </button>
            <button
              onClick={handleContinue}
              disabled={!isFpsCompatible || !webcamRunning}
              className={`flex-1 py-3 px-6 rounded font-bold transition-colors ${
                isFpsCompatible && webcamRunning
                  ? 'bg-[#FF0000] text-white hover:bg-[#FF0000]'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}

      {(phase === 'hydrate' || phase === 'exercise' || phase === 'recovery' || phase === 'go') && (
        <div className="flex-1 flex flex-col">
          {/* FIXED: Video Container with proper relative positioning */}
          <div className="relative mx-4 mb-4 bg-transparent overflow-hidden" style={{ 
            aspectRatio: '3/4',
            maxHeight: 'calc(100vh - 180px)', 
          }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {phase === 'go' && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                <div className="text-6xl font-bold text-[#FF0000] animate-pulse">GO!</div>
              </div>
            )}

            {/* Phase overlays - positioned properly */}
            {phase === 'hydrate' && (
              <div className="absolute inset-0 flex flex-col justify-end items-center pb-16">
                <div className="text-center relative">
                  <div className="absolute -top-10 left-0 w-10 h-10 transform transition-transform duration-1000 ease-linear"
                       style={{ 
                         transform: `translateX(${progressPercent * 1.8}px)` 
                       }}>
                    <img 
                      src="./assets/BOTTLE 2.png" 
                      alt="Bottle" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-gray-600 rounded-lg flex items-center justify-center" style={{ display: 'none' }}>
                      <div className="w-3 h-6 bg-white rounded-sm relative">
                        <div className="w-1.5 h-1.5 bg-gray-400 absolute -top-0.5 left-1/2 transform -translate-x-1/2 rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  <div className="relative bg-gray-800 text-white px-4 py-2 rounded mb-2 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-[#FF0000] transition-all duration-1000 ease-linear"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <span className="relative z-10 text-sm font-bold">HYDRATE AND ENERGIZE</span>
                  </div>
                  <div className="bg-black bg-opacity-80 text-white px-4 py-1 rounded inline-block">
                    <span className="text-xs font-medium">BEFORE UNLOCK YOUR 100</span>
                  </div>
                </div>
              </div>
            )}

            {phase === 'recovery' && (
              <div className="absolute inset-0 flex flex-col justify-end items-center pb-16">
                <div className="text-center relative">
                  <div className="absolute -top-10 left-0 w-10 h-10 transform transition-transform duration-1000 ease-linear"
                       style={{ 
                         transform: `translateX(${progressPercent * 2.2}px)` 
                       }}>
                    <img 
                      src="./assets/BOTTLE 2.png" 
                      alt="Bottle" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-gray-600 rounded-lg flex items-center justify-center" style={{ display: 'none' }}>
                      <div className="w-3 h-6 bg-white rounded-sm relative">
                        <div className="w-1.5 h-1.5 bg-gray-400 absolute -top-0.5 left-1/2 transform -translate-x-1/2 rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  <div className="relative bg-gray-800 text-white px-4 py-2 rounded mb-2 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-[#FF0000] transition-all duration-1000 ease-linear"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <span className="relative z-10 text-sm font-bold">RECOVER &amp; REPEAT STRONGER</span>
                  </div>
                  <div className="bg-black bg-opacity-80 text-white px-4 py-1 rounded inline-block">
                    <span className="text-xs font-medium">IT'S TIME TO</span>
                  </div>
                </div>
              </div>
            )}

            {phase === 'exercise' && (
              <div className="absolute inset-0 flex flex-col justify-end items-center pb-20">
                <div className="text-center relative -ml-3">
                  <div className="flex items-center justify-center gap-1">
                    <div className="flex items-center">
                      <span className="text-white text-lg font-bold tracking-wider transform -rotate-90 whitespace-nowrap origin-center">
                        ROUND {currentRound}
                      </span>
                    </div>
                    
                    <div className="text-6xl font-bold text-[#FF0000] leading-none mx-1">
                      {squatCount}
                    </div>
                    
                    <div className="flex items-end pb-1 ml-1">
                      <span className="text-[#FF0000] text-2xl font-bold leading-none">REP</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mx-4 mb-2">
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF0000] transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Timer */}
          <div className="mb-6 mx-4">
            {phase === 'hydrate' && (
              <div className="flex items-center justify-end gap-2">
                <div className="text-white text-right">
                  <div className="text-sm text-[#636363] font-bold">YOUR FIRST SET</div>
                  <div className="text-sm text-[#636363] font-bold">BEGINS IN</div>
                </div>
                <div className="text-5xl font-bold text-[#636363]">{timeRemaining}</div>
              </div>
            )}
            
            {phase === 'recovery' && (
              <div className="flex items-center justify-end gap-2">
                <div className="text-white text-right">
                  <div className="text-sm text-[#636363] font-bold">YOUR 2nd SET</div>
                  <div className="text-sm text-[#636363] font-bold">BEGINS IN</div>
                </div>
                <div className="text-5xl font-bold text-[#636363]">{timeRemaining}</div>
              </div>
            )}
            
            {phase === 'exercise' && (
              <div className="flex items-center justify-end gap-2">
                <div className="text-white text-right">
                  <div className="text-sm text-[#636363] font-bold">TIME</div>
                  <div className="text-sm text-[#636363] font-bold">REMAINING</div>
                </div>
                <div className="text-5xl font-bold text-[#636363]">{timeRemaining}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'completed' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <div className="text-2xl font-bold text-green-500 mb-4">CHALLENGE COMPLETED!</div>
            <div className="text-lg">Total Squats: {totalSquats}</div>
            <div className="text-sm text-gray-400 mt-2">
              Round 1: {sessionStorage.getItem('squats_round_1') || 0} squats
            </div>
            <div className="text-sm text-gray-400">
              Round 2: {sessionStorage.getItem('squats_round_2') || 0} squats
            </div>
          </div>
          
          <button
            onClick={onBack}
            className="bg-red-500 text-white py-3 px-8 rounded font-bold hover:bg-red-600 transition-colors"
          >
            FINISH
          </button>
        </div>
      )}
    </div>
  );
};

export default SquatChallengeApp;