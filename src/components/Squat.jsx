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
    this.minFrames = 2; // Very responsive - only 2 frames
    
    // Lenient but balanced thresholds
    this.downKneeAngleThreshold = 135; // Must bend knees significantly
    this.upKneeAngleThreshold = 160; // Standing position
    
    // Validation thresholds
    this.maxKneeAngleDifference = 25; // Both knees must bend similarly
    this.minKneeBend = 30; // Minimum bend from standing (from ~170° to ~140°)
    
    // Track standing position
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

  isValidSquatPosition(leftKneeAngle, rightKneeAngle, avgKneeAngle) {
    // Check 1: Both knees must bend similarly (not just one leg)
    const kneeDifference = Math.abs(leftKneeAngle - rightKneeAngle);
    if (kneeDifference > this.maxKneeAngleDifference) {
      console.log(`Invalid: Knee difference too large: ${kneeDifference.toFixed(1)}°`);
      return false;
    }

    // Check 2: Must have significant knee bend from standing position
    if (this.standingKneeAngle === null) {
      // Set standing angle reference when upright
      if (avgKneeAngle >= 165) {
        this.standingKneeAngle = avgKneeAngle;
        console.log(`Standing angle set: ${this.standingKneeAngle.toFixed(1)}°`);
      }
      return false; // Need to establish standing position first
    }

    const kneeBend = this.standingKneeAngle - avgKneeAngle;
    if (avgKneeAngle <= this.downKneeAngleThreshold && kneeBend < this.minKneeBend) {
      console.log(`Invalid: Not enough knee bend: ${kneeBend.toFixed(1)}° (need ${this.minKneeBend}°)`);
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

    // Very lenient visibility check
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

    console.log(`L: ${leftKneeAngle.toFixed(1)}° R: ${rightKneeAngle.toFixed(1)}° Avg: ${avgKneeAngle.toFixed(1)}° Diff: ${kneeDifference.toFixed(1)}° IsDown: ${this.isDown}`);

    // Update standing angle when clearly upright
    if (avgKneeAngle >= 165 && kneeDifference < 15) {
      this.standingKneeAngle = avgKneeAngle;
    }

    // Simple logic: Based on knee angle with validation
    if (!this.isDown && avgKneeAngle <= this.downKneeAngleThreshold) {
      // Validate squat position before counting down
      if (this.isValidSquatPosition(leftKneeAngle, rightKneeAngle, avgKneeAngle)) {
        this.stateFrames++;
        console.log(`Going DOWN - Frames: ${this.stateFrames}/${this.minFrames}`);
        if (this.stateFrames >= this.minFrames) {
          this.isDown = true;
          this.stateFrames = 0;
          console.log("SQUAT DOWN detected");
          return { count: this.count, isSquatDown: true };
        }
      } else {
        this.stateFrames = 0; // Reset if invalid
      }
    } 
    else if (this.isDown && avgKneeAngle >= this.upKneeAngleThreshold) {
      // For going up, just check both knees are reasonably similar
      if (kneeDifference <= this.maxKneeAngleDifference) {
        this.stateFrames++;
        console.log(`Going UP - Frames: ${this.stateFrames}/${this.minFrames}`);
        if (this.stateFrames >= this.minFrames) {
          this.isDown = false;
          this.count++;
          this.stateFrames = 0;
          console.log("SQUAT UP detected - Count:", this.count);
          return { count: this.count, newCount: true };
        }
      } else {
        this.stateFrames = 0; // Reset if one leg not following
      }
    } else {
      // Reset frames if not progressing towards target
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
    
    // Set canvas size for portrait grid (taller aspect ratio)
    canvas.width = 400;
    canvas.height = 700;
    
    // Fill background with black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid area (top 75% of canvas) - portrait photos
    const gridHeight = canvas.height * 0.75;
    const photoWidth = canvas.width / 2;
    const photoHeight = gridHeight / 2;
    
    // Load and draw photos
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };
    
    try {
      // Draw photos in grid with overlays
      for (let i = 0; i < 4; i++) {
        if (photos[i]) {
          const img = await loadImage(photos[i]);
          const x = (i % 2) * photoWidth;
          const y = Math.floor(i / 2) * photoHeight;
          
          // Draw photo filling the entire cell
          ctx.drawImage(img, x, y, photoWidth, photoHeight);
          
          // Add overlay based on photo position
          if (i === 0) {
            // Foto pertama - overlay dengan banner yang tidak mentok tepi
            const bannerWidth = photoWidth * 0.85; // 85% dari lebar foto
            const bannerX = x + (photoWidth - bannerWidth) / 2; // Center the banner
            const bannerHeight = 35;
            const bannerY = y + photoHeight * 0.55;
            
            // Red banner dengan lebar terbatas dan rounded
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8);
            ctx.fill();
            
            // Text "HYDRATE AND ENERGIZE"
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('HYDRATE AND ENERGIZE', x + photoWidth/2, bannerY + 20);
            
            // Gap antara banner (5px)
            const gap = 5;
            const blackBannerY = bannerY + bannerHeight + gap;
            const blackBannerHeight = 25;
            const blackBannerWidth = photoWidth * 0.75; // Sedikit lebih kecil
            const blackBannerX = x + (photoWidth - blackBannerWidth) / 2;
            
            // Black banner dengan lebar terbatas dan rounded
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.roundRect(blackBannerX, blackBannerY, blackBannerWidth, blackBannerHeight, 8);
            ctx.fill();
            
            // Text "BEFORE UNLOCK YOUR 100"
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('BEFORE UNLOCK YOUR 100', x + photoWidth/2, blackBannerY + 15);
          } 
          else if (i === 1) {
            // Foto kedua (atas kanan) - HANYA ROUND 1 + count + REP
            const counterAreaY = y + photoHeight * 0.65; // Dipindah dari 0.75 ke 0.65 untuk memberi jarak bottom
            const counterAreaHeight = photoHeight * 0.30; // Diperbesar area untuk memberi ruang
            
            // Get actual count
            const actualCount = round1Count;
            
            // Layout horizontal yang compact
            const centerY = counterAreaY + counterAreaHeight/2;
            
            // "ROUND 1" text (rotated) - di kiri, posisi lebih ke atas
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.translate(x + 50, centerY - 10);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('ROUND 1', 0, 0);
            ctx.restore();
            
            // Large squat count (center)
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(actualCount.toString(), x + photoWidth/2 - 10, centerY + 2);
            
            // "REP" text - di kanan
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('REP', x + photoWidth/2 + 25, centerY - 5);
          }
          else if (i === 2) {
            // Foto ketiga (bawah kiri) - HANYA RECOVERY & REPEAT STRONGER
            const bannerWidth = photoWidth * 0.85;
            const bannerX = x + (photoWidth - bannerWidth) / 2;
            const bannerHeight = 35;
            const bannerY = y + photoHeight * 0.55;
            
            // Red banner dengan lebar terbatas dan rounded
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8);
            ctx.fill();
            
            // Text "RECOVER & REPEAT STRONGER"
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('RECOVER & REPEAT STRONGER', x + photoWidth/2, bannerY + 20);
            
            // Gap antara banner
            const gap = 5;
            const blackBannerY = bannerY + bannerHeight + gap;
            const blackBannerHeight = 25;
            const blackBannerWidth = photoWidth * 0.75;
            const blackBannerX = x + (photoWidth - blackBannerWidth) / 2;
            
            // Black banner dengan lebar terbatas dan rounded
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.roundRect(blackBannerX, blackBannerY, blackBannerWidth, blackBannerHeight, 8);
            ctx.fill();
            
            // Text "IT'S TIME TO"
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("IT'S TIME TO", x + photoWidth/2, blackBannerY + 15);
          }
          else if (i === 3) {
            // Foto keempat (bawah kanan) - ROUND 2 + count + REP
            const counterAreaY = y + photoHeight * 0.65; // Dipindah dari 0.75 ke 0.65 untuk memberi jarak bottom
            const counterAreaHeight = photoHeight * 0.30; // Diperbesar area untuk memberi ruang
            
            // Get actual count
            const actualCount = round2Count;
            
            // Layout horizontal yang compact
            const centerY = counterAreaY + counterAreaHeight/2;
            
            // "ROUND 2" text (rotated) - di kiri, posisi lebih ke atas
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.translate(x + 50, centerY - 10);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('ROUND 2', 0, 0);
            ctx.restore();
            
            // Large squat count (center)
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(actualCount.toString(), x + photoWidth/2 - 10, centerY + 2);
            
            // "REP" text - di kanan
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('REP', x + photoWidth/2 + 25, centerY - 5);
          }
        }
      }
      
      // Bottom stats section (bottom 25%) - exactly like the reference image, seamlessly connected
      const statsStartY = gridHeight;
      const statsHeight = canvas.height * 0.25;
      
      // Stats background (seamless with grid - no border)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, statsStartY, canvas.width, statsHeight);
      
      // Center everything horizontally and vertically
      const statsCenterX = canvas.width / 2;
      const statsCenterY = statsStartY + statsHeight / 2;
      
      // Large red squat count
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'right';
      const countText = totalSquats.toString();
      ctx.fillText(countText, statsCenterX - 80, statsCenterY);

      // "SQUATS" text dengan rotasi -90 derajat - posisi diperbaiki dengan jarak yang cukup dari grid
      ctx.save();
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'left';
      ctx.translate(statsCenterX - 60, statsCenterY + 2); // Posisi dipindah lebih jauh dari grid dan lebih ke tengah
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('SQUATS', 0, 0);
      ctx.restore();

      // "/" symbol - dengan jarak yang lebih proporsional
      ctx.fillStyle = '#636363';
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('/', statsCenterX - 10, statsCenterY);

      // "100" text
      ctx.fillStyle = '#636363';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('100', statsCenterX + 20, statsCenterY);

      // "SECONDS" text dengan rotasi -90 derajat - posisi diperbaiki di samping kanan angka 100
      ctx.save();
      ctx.fillStyle = '#636363';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'left';
      ctx.translate(statsCenterX + 200, statsCenterY + 2); // Posisi dipindah ke kanan angka 100 dan lebih ke tengah
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('SECONDS', 0, 0);
      ctx.restore();
      
      // Generate final image
      const dataURL = canvas.toDataURL('image/png');
      setGridImage(dataURL);
      
    } catch (error) {
      console.error('Error generating grid image:', error);
    }
  };

  const handleShare = async () => {
    if (gridImage) {
      try {
        // Convert data URL to blob
        const response = await fetch(gridImage);
        const blob = await response.blob();
        
        // Generate random filename
        const fileName = Math.random().toString(36).substring(2) + ".png";
        const filesArray = [new File([blob], fileName, { type: 'image/png' })];
        
        // Check if Web Share API is available and can share files
        if (navigator.canShare && navigator.canShare({ files: filesArray })) {
          await navigator.share({
            files: filesArray,
            // Hapus title dan text untuk kompatibilitas maksimal
          });
          console.log("Image shared successfully");
        } else {
          console.log("Web Share API not supported, falling back to download");
          // Fallback: download the image
          const link = document.createElement('a');
          link.href = gridImage;
          link.download = fileName;
          link.click();
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing the image:', error);
          // Fallback: download the image
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
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-4">
        <button onClick={onBack} className="text-white">
          <ArrowLeft size={24} />
        </button>
        <img 
          src="./assets/LOGO2 1.png" 
          alt="Unlock Your 100 Logo" 
          className="h-12 object-contain"
        />
        <div className="w-6"></div>
      </div>

      {/* Grid Display */}
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

        {/* Share Button - Fixed center alignment */}
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
  // States
  const [phase, setPhase] = useState('setup'); // 'setup', 'hydrate', 'exercise', 'recovery', 'go', 'completed', 'grid'
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

  // Audio functions
  const playCountSound = (count) => {
    const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
                     'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
    
    if (count <= 20) {
      const utterance = new SpeechSynthesisUtterance(numbers[count]);
      utterance.rate = 1.2;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    } else if (count <= 99) {
      const utterance = new SpeechSynthesisUtterance(count.toString());
      utterance.rate = 1.2;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const playAnnouncement = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.volume = 0.9;
    speechSynthesis.speak(utterance);
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
    
    // Create a temporary canvas to combine video and overlay
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    
    // Draw video frame
    tempCtx.drawImage(video, 0, 0);
    
    // Draw the pose overlay from the main canvas
    tempCtx.drawImage(canvas, 0, 0);
    
    // Convert to data URL
    const dataURL = tempCanvas.toDataURL('image/png');
    
    // Store in memory (not localStorage due to size limits)
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
          width: 480,
          height: 640,
          facingMode: 'user'
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

  // FPS monitoring and pose detection
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const canvasCtx = canvas.getContext('2d');
    
    try {
      const startTimeMs = performance.now();
      const results = await poseLandmarkerRef.current.detectForVideo(video, startTimeMs);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        if (phase === 'exercise') {
          // Draw skeleton WITHOUT flipping - this will make it follow body movement correctly
          const drawingUtils = new DrawingUtils(canvasCtx);
          drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#FFFFFF', lineWidth: 2 });
          drawingUtils.drawLandmarks(landmarks, { color: '#FFFFFF', radius: 4 });
          
          // Debug info drawing (keeping existing debug code)
          const leftHip = landmarks[23];
          const leftKnee = landmarks[25];
          const leftAnkle = landmarks[27];
          const rightHip = landmarks[24];
          const rightKnee = landmarks[26];
          const rightAnkle = landmarks[28];
          
          if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
            const leftKneeAngle = squatCounterRef.current.calculateAngle(leftHip, leftKnee, leftAnkle);
            const rightKneeAngle = squatCounterRef.current.calculateAngle(rightHip, rightKnee, rightAnkle);
            const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
            const kneeDifference = Math.abs(leftKneeAngle - rightKneeAngle);
            const standingAngle = squatCounterRef.current.standingKneeAngle || 0;
            const kneeBend = standingAngle - avgKneeAngle;
            
            // Draw debug info (existing code)
            canvasCtx.fillStyle = '#FFFFFF';
            canvasCtx.font = '14px Arial';
            canvasCtx.fillText(`L Knee: ${leftKneeAngle.toFixed(1)}°`, 10, 25);
            canvasCtx.fillText(`R Knee: ${rightKneeAngle.toFixed(1)}°`, 10, 45);
            canvasCtx.fillText(`Avg: ${avgKneeAngle.toFixed(1)}°`, 10, 65);
            canvasCtx.fillText(`Difference: ${kneeDifference.toFixed(1)}°`, 10, 85);
            canvasCtx.fillText(`Standing: ${standingAngle.toFixed(1)}°`, 10, 105);
            canvasCtx.fillText(`Knee Bend: ${kneeBend.toFixed(1)}°`, 10, 125);
            canvasCtx.fillText(`State: ${squatCounterRef.current.isDown ? 'DOWN' : 'UP'}`, 10, 145);
            
            // Draw angle indicators
            canvasCtx.fillStyle = '#FF0000';
            canvasCtx.font = '12px Arial';
            
            const leftKneeX = leftKnee.x * canvas.width;
            const leftKneeY = leftKnee.y * canvas.height;
            canvasCtx.fillText(`${leftKneeAngle.toFixed(1)}°`, leftKneeX + 10, leftKneeY);
            
            const rightKneeX = rightKnee.x * canvas.width;
            const rightKneeY = rightKnee.y * canvas.height;
            canvasCtx.fillText(`${rightKneeAngle.toFixed(1)}°`, rightKneeX - 50, rightKneeY);
            
            // Validation indicators
            canvasCtx.fillStyle = kneeDifference <= 25 ? '#FFFFFF' : '#FF0000';
            canvasCtx.fillText(`Both Knees: ${kneeDifference <= 25 ? 'OK' : 'NO'}`, 10, 175);
            
            canvasCtx.fillStyle = avgKneeAngle <= 135 ? '#FFFFFF' : '#FFFF00';
            canvasCtx.fillText(`Down: ≤135° (${avgKneeAngle <= 135 ? 'OK' : 'NO'})`, 10, 195);
            
            canvasCtx.fillStyle = avgKneeAngle >= 160 ? '#FFFFFF' : '#FFFF00';
            canvasCtx.fillText(`Up: ≥160° (${avgKneeAngle >= 160 ? 'OK' : 'NO'})`, 10, 215);
            
            if (standingAngle > 0) {
              canvasCtx.fillStyle = kneeBend >= 30 ? '#FFFFFF' : '#FF0000';
              canvasCtx.fillText(`Knee Bend: ≥30° (${kneeBend >= 30 ? 'OK' : 'NO'})`, 10, 235);
            }
            
            if (!squatCounterRef.current.isDown) {
              canvasCtx.fillStyle = '#FFFFFF';
              canvasCtx.fillText(`Need: Both knees squat to ≤135°`, 10, 260);
            } else {
              canvasCtx.fillStyle = '#FFFFFF';
              canvasCtx.fillText(`Need: Both knees stand to ≥160°`, 10, 260);
            }
          }
          
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
          // Audio announcements at specific times
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

  // Separate effect for GO announcement to avoid double speak
  useEffect(() => {
    if (phase === 'go') {
      // Announce GO immediately when GO phase starts
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
    // Take screenshot at phase completion
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
        // Round 2 completed - play congratulations speech
        playAnnouncement('Congratulations! You finished your challenge!');
        setTimeout(() => {
          setPhase('grid'); // Go to grid after speech
        }, 3000); // Wait 3 seconds for speech to complete
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
    <div className="w-full min-h-screen bg-black text-white flex flex-col" style={{ maxWidth: 430, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center justify-center py-4 relative">
        <img 
          src="./assets/LOGO2 1.png" 
          alt="Unlock Your 100 Logo" 
          className="h-16 object-contain"
        />
      </div>

      {phase === 'setup' && (
        <div className="flex-1 flex flex-col">
          {/* Video Container - Portrait */}
          <div className="relative mx-4 mb-6 bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>

          {/* Status Checks */}
          <div className="mx-4 mb-6">
            {/* Camera and FPS Check - Side by Side */}
            <div className="flex items-center justify-between gap-8 mb-4">
              {/* Camera Check */}
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${webcamRunning ? 'border-[#00FF51]' : 'border-[#FF0000]'}`}>
                  {webcamRunning ? <Check size={60} className="text-[#00FF51]" /> : <X size={60} className="text-[#FF0000]" />}
                </div>
                <span className={`text-[30px] font-semibold ${webcamRunning ? 'text-[#00FF51]' : 'text-[#FF0000]'}`}>CAMERA</span>
              </div>

              {/* FPS Check */}
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isFpsCompatible ? 'border-[#00FF51]' : 'border-[#FF0000]'}`}>
                  {isFpsCompatible ? <Check size={60} className="text-[#00FF51]" /> : <X size={60} className="text-[#FF0000]" />}
                </div>
                <span className={`text-[30px] font-semibold ${isFpsCompatible ? 'text-[#00FF51]' : 'text-[#FF0000]'}`}>FPS CHECK</span>
              </div>
            </div>
            
            {/* Error Message for FPS */}
            {!isFpsCompatible && (
              <div className="text-white text-sm text-center">
                Sorry, Your device is not compatible. Please find other device to do the challenge!
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mx-4 mb-8 flex gap-4">
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
          {/* Video Container - Portrait */}
          <div className="relative mx-4 mb-6 bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />

            {phase === 'go' && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                <div className="text-[100px] font-bold text-[#FF0000] animate-pulse">GO!</div>
              </div>
            )}

            {/* Hydrate Phase Overlay - positioned lower */}
            {phase === 'hydrate' && (
              <div className="absolute inset-0 flex flex-col justify-end items-center pb-20">
                {/* Main Title with Progress Fill */}
                <div className="text-center relative">
                  {/* Animated Bottle Icon - positioned above the box */}
                  <div className="absolute -top-12 left-0 w-12 h-12 transform transition-transform duration-1000 ease-linear"
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
                      <div className="w-4 h-8 bg-white rounded-sm relative">
                        <div className="w-2 h-2 bg-gray-400 absolute -top-0.5 left-1/2 transform -translate-x-1/2 rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  <div className="relative bg-gray-800 text-white px-6 py-2 rounded mb-2 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-[#FF0000] transition-all duration-1000 ease-linear"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <span className="relative z-10 text-[20px] font-bold">HYDRATE AND ENERGIZE</span>
                  </div>
                  <div className="bg-black bg-opacity-80 text-white px-6 py-1 rounded inline-block">
                    <span className="text-[20px] font-medium">BEFORE UNLOCK YOUR 100</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recovery Phase Overlay - positioned lower with bottle animation */}
            {phase === 'recovery' && (
              <div className="absolute inset-0 flex flex-col justify-end items-center pb-20">
                <div className="text-center relative">
                  <div className="absolute -top-12 left-0 w-12 h-12 transform transition-transform duration-1000 ease-linear"
                       style={{ 
                         transform: `translateX(${progressPercent * 2.8}px)` 
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
                      <div className="w-4 h-8 bg-white rounded-sm relative">
                        <div className="w-2 h-2 bg-gray-400 absolute -top-0.5 left-1/2 transform -translate-x-1/2 rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  <div className="relative bg-gray-800 text-white px-6 py-2 rounded mb-2 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-[#FF0000] transition-all duration-1000 ease-linear"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <span className="relative z-10 text-[20px] font-bold">RECOVER &amp; REPEAT STRONGER</span>
                  </div>
                  <div className="bg-black bg-opacity-80 text-white px-6 py-1 rounded inline-block">
                    <span className="text-[20px] font-medium">IT'S TIME TO</span>
                  </div>
                </div>
              </div>
            )}

            {phase === 'exercise' && (
              <div className="absolute inset-0 flex flex-col justify-end items-center pb-20">
                <div className="text-center relative -ml-5">
                  <div className="flex items-center justify-center gap-1">
                    <div className="flex items-center">
                      <span className="text-white text-[28px] font-bold tracking-wider transform -rotate-90 whitespace-nowrap origin-center">
                        ROUND {currentRound}
                      </span>
                    </div>
                    
                    <div className="text-[150px] font-bold text-[#FF0000] leading-none mx-1">
                      {squatCount}
                    </div>
                    
                    <div className="flex items-end pb-1 ml-1">
                      <span className="text-[#FF0000] text-5xl font-bold leading-none">REP</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mx-4 mb-4">
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF0000] transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Timer */}
          <div className="mb-8 mx-4">
            {phase === 'hydrate' && (
              <div className="flex items-center justify-end gap-4">
                <div className="text-white text-right">
                  <div className="text-[20px] text-[#636363] font-bold">YOUR FIRST SET</div>
                  <div className="text-[20px] text-[#636363] font-bold">BEGINS IN</div>
                </div>
                <div className="text-8xl font-bold text-[#636363]">{timeRemaining}</div>
              </div>
            )}
            
            {phase === 'recovery' && (
              <div className="flex items-center justify-end gap-4">
                <div className="text-white text-right">
                  <div className="text-[20px] text-[#636363] font-bold">YOUR 2nd SET</div>
                  <div className="text-[20px] text-[#636363] font-bold">BEGINS IN</div>
                </div>
                <div className="text-8xl font-bold text-[#636363]">{timeRemaining}</div>
              </div>
            )}
            
            {phase === 'exercise' && (
              <div className="flex items-center justify-end gap-4">
                <div className="text-white text-right">
                  <div className="text-[20px] text-[#636363] font-bold">TIME</div>
                  <div className="text-[20px] text-[#636363] font-bold">REMAINING</div>
                </div>
                <div className="text-8xl font-bold text-[#636363]">{timeRemaining}</div>
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