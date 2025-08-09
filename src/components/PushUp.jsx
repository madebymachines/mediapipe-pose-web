import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Target, ArrowLeft, AlertTriangle } from 'lucide-react';
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
    this.maxHistorySize = 30; // 1 second of history at 30fps
    this.minAcceptableFps = 15; // Minimum FPS for good performance
    this.warningFps = 20; // FPS below this shows warning
  }

  update() {
    this.frameCount++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    // Calculate instantaneous FPS
    this.fps = 1000 / deltaTime;
    
    // Add to history
    this.fpsHistory.push(this.fps);
    if (this.fpsHistory.length > this.maxHistorySize) {
      this.fpsHistory.shift();
    }
    
    // Calculate average FPS
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

  getPerformanceStatus() {
    if (this.avgFps >= this.warningFps) {
      return { status: 'good', message: 'Performance: Good', color: 'text-green-400' };
    } else if (this.avgFps >= this.minAcceptableFps) {
      return { status: 'warning', message: 'Performance: Fair', color: 'text-yellow-400' };
    } else {
      return { status: 'poor', message: 'Performance: Poor', color: 'text-red-400' };
    }
  }
}

// Simplified Push-up detection for debugging
class PushUpCounter {
  constructor() {
    this.count = 0;
    this.isDown = false;
    this.stateFrames = 0;
    this.minFrames = 3;
    
    this.downAngleThreshold = 100;
    this.upAngleThreshold = 130;
    
    this.lastSpokenCount = -1;
    this.lastSpeechTime = 0;
    this.speechCooldown = 2000;
  }

  calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  }

  calculateDistance(point1, point2) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
  }

  processPose(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return { count: this.count, alert: "No landmarks detected" };
    }

    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];

    if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist) {
      return { count: this.count, alert: "Key landmarks missing" };
    }

    const leftElbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    let alert = `Angle: ${Math.round(avgElbowAngle)}° - `;
    
    if (!this.isDown && avgElbowAngle <= this.downAngleThreshold) {
      this.stateFrames++;
      alert += `Going DOWN (${this.stateFrames}/${this.minFrames})`;
      
      if (this.stateFrames >= this.minFrames) {
        this.isDown = true;
        this.stateFrames = 0;
        alert = "✅ DOWN position confirmed!";
      }
    } else if (this.isDown && avgElbowAngle >= this.upAngleThreshold) {
      this.stateFrames++;
      alert += `Going UP (${this.stateFrames}/${this.minFrames})`;
      
      if (this.stateFrames >= this.minFrames) {
        this.isDown = false;
        const previousCount = this.count;
        this.count++;
        this.stateFrames = 0;
        alert = "🎉 PUSH-UP COMPLETED!";
        
        return { 
          count: this.count, 
          alert: alert,
          angle: Math.round(avgElbowAngle),
          isDown: this.isDown,
          stability: "Testing",
          frames: this.stateFrames,
          newCount: previousCount !== this.count
        };
      }
    } else {
      this.stateFrames = 0;
      if (this.isDown) {
        alert += "In DOWN - push up to complete";
      } else {
        alert += "Ready - go down to start";
      }
    }

    return { 
      count: this.count, 
      alert: alert,
      angle: Math.round(avgElbowAngle),
      isDown: this.isDown,
      stability: "Testing",
      frames: this.stateFrames,
      newCount: false
    };
  }

  resetCount() {
    this.count = 0;
    this.isDown = false;
    this.stateFrames = 0;
    this.pushUpStarted = false;
    this.lastValidAngle = null;
    this.angleHistory = [];
  }
}

const PushUpApp = ({ onBack }) => {
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isActive, setIsActive] = useState(false);
  const [pushUpCount, setPushUpCount] = useState(0);
  const [targetCount] = useState(20);
  const [isCompleted, setIsCompleted] = useState(false);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [voice, setVoice] = useState(null);
  const [alert, setAlert] = useState('');
  const [elbowAngle, setElbowAngle] = useState(0);
  const [isInDownPosition, setIsInDownPosition] = useState(false);
  const [lastSpokenCount, setLastSpokenCount] = useState(-1);
  
  // FPS monitoring states
  const [fpsData, setFpsData] = useState({
    fps: 0,
    avgFps: 0,
    isLowPerformance: false,
    showWarning: false,
    frameCount: 0
  });
  const [showPerformanceAlert, setShowPerformanceAlert] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const pushUpCounterRef = useRef(new PushUpCounter());
  const animationFrameRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const fpsMonitorRef = useRef(new FPSMonitor());
  const speakTimeoutRef = useRef(null);
  const performanceAlertShownRef = useRef(false);

  // Initialize MediaPipe PoseLandmarker
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
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        
        poseLandmarkerRef.current = poseLandmarker;
        console.log("PoseLandmarker initialized successfully");
      } catch (error) {
        console.error("Error initializing PoseLandmarker:", error);
        poseLandmarkerRef.current = null;
      }
    };

    initializePoseLandmarker();
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.lang.includes('en')) || voices[0];
      setVoice(selectedVoice);
    };

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }, []);

  // Enhanced speak function with debouncing
  const speak = useCallback((text, force = false) => {
    return new Promise((resolve) => {
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
      
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      
      if (voice && 'speechSynthesis' in window && (force || !speechSynthesis.speaking)) {
        speakTimeoutRef.current = setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = voice;
          utterance.rate = 1;
          utterance.pitch = 1;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          speechSynthesis.speak(utterance);
        }, 100);
      } else {
        setTimeout(resolve, 100);
      }
    });
  }, [voice]);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 430, 
          height: 350,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setWebcamRunning(true);
          // Reset FPS monitor when webcam starts
          fpsMonitorRef.current.reset();
          performanceAlertShownRef.current = false;
          setShowPerformanceAlert(false);
        };
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      alert('Please allow camera access to use the push-up counter');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setWebcamRunning(false);
      // Reset FPS data when webcam stops
      setFpsData({
        fps: 0,
        avgFps: 0,
        isLowPerformance: false,
        showWarning: false,
        frameCount: 0
      });
      fpsMonitorRef.current.reset();
    }
  }, []);

  const detectPose = useCallback(async () => {
    if (!videoRef.current || !webcamRunning || !isActive || !poseLandmarkerRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    // Update FPS monitoring
    const currentFpsData = fpsMonitorRef.current.update();
    setFpsData(currentFpsData);

    // Show performance alert if FPS is consistently low
    if (currentFpsData.isLowPerformance && currentFpsData.frameCount > 60 && !performanceAlertShownRef.current) {
      setShowPerformanceAlert(true);
      performanceAlertShownRef.current = true;
      speak("Warning: Low frame rate detected. Video may not be supported for optimal performance.", true).catch(() => {});
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const canvasCtx = canvas.getContext('2d');
    
    try {
      const startTimeMs = performance.now();
      const results = await poseLandmarkerRef.current.detectForVideo(
        video,
        startTimeMs
      );

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        const drawingUtils = new DrawingUtils(canvasCtx);
        
        try {
          drawingUtils.drawConnectors(
            landmarks,
            PoseLandmarker.POSE_CONNECTIONS,
            { 
              color: '#00FF00', 
              lineWidth: 4,
              visibilityMin: 0.5
            }
          );
          
          drawingUtils.drawLandmarks(landmarks, {
            color: '#FF0000',
            radius: 8,
            fillColor: '#FF0000',
            visibilityMin: 0.5
          });
          
          const keyPoints = [
            { landmark: landmarks[11], label: 'L.Shoulder' },
            { landmark: landmarks[12], label: 'R.Shoulder' },
            { landmark: landmarks[13], label: 'L.Elbow' },
            { landmark: landmarks[14], label: 'R.Elbow' },
            { landmark: landmarks[15], label: 'L.Wrist' },
            { landmark: landmarks[16], label: 'R.Wrist' },
          ];
          
          keyPoints.forEach(({ landmark, label }) => {
            if (landmark && landmark.visibility > 0.5) {
              const x = landmark.x * canvas.width;
              const y = landmark.y * canvas.height;
              
              canvasCtx.fillStyle = '#FFFF00';
              canvasCtx.beginPath();
              canvasCtx.arc(x, y, 10, 0, 2 * Math.PI);
              canvasCtx.fill();
              
              canvasCtx.fillStyle = '#FFFFFF';
              canvasCtx.font = '12px Arial';
              canvasCtx.fillText(label, x + 15, y + 5);
            }
          });
          
        } catch (drawError) {
          console.warn("Drawing error:", drawError);
          canvasCtx.strokeStyle = '#00FF00';
          canvasCtx.lineWidth = 3;
          canvasCtx.fillStyle = '#FF0000';
          
          const connections = [
            [11, 13], [13, 15],
            [12, 14], [14, 16],
            [11, 12],
            [11, 23], [12, 24],
            [23, 24]
          ];
          
          connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            if (startPoint && endPoint && startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
              canvasCtx.beginPath();
              canvasCtx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
              canvasCtx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
              canvasCtx.stroke();
            }
          });
          
          landmarks.forEach((landmark, index) => {
            if (landmark && landmark.visibility > 0.5) {
              const x = landmark.x * canvas.width;
              const y = landmark.y * canvas.height;
              canvasCtx.beginPath();
              canvasCtx.arc(x, y, 6, 0, 2 * Math.PI);
              canvasCtx.fill();
            }
          });
        }
        
        const { count, alert: poseAlert, angle, isDown, stability: angleStability, frames, newCount } = pushUpCounterRef.current.processPose(landmarks);
        
        if (newCount && count !== lastSpokenCount && count > 0) {
          setLastSpokenCount(count);
          setPushUpCount(count);
          
          speak(count.toString(), true).catch(() => {});
          
          if (count >= targetCount) {
            setIsCompleted(true);
            setIsActive(false);
            setTimeout(() => {
              speak(`Congratulations! You completed ${targetCount} push-ups!`, true).catch(() => {});
            }, 1000);
            return;
          }
        } else if (count !== pushUpCount) {
          setPushUpCount(count);
        }

        if (landmarks[11] && landmarks[13] && landmarks[15]) {
          const shoulder = landmarks[11];
          const elbow = landmarks[13];
          const wrist = landmarks[15];
          
          const shoulderX = shoulder.x * canvas.width;
          const shoulderY = shoulder.y * canvas.height;
          const elbowX = elbow.x * canvas.width;
          const elbowY = elbow.y * canvas.height;
          const wristX = wrist.x * canvas.width;
          const wristY = wrist.y * canvas.height;
          
          canvasCtx.strokeStyle = '#FFFF00';
          canvasCtx.lineWidth = 4;
          canvasCtx.beginPath();
          canvasCtx.moveTo(shoulderX, shoulderY);
          canvasCtx.lineTo(elbowX, elbowY);
          canvasCtx.lineTo(wristX, wristY);
          canvasCtx.stroke();
          
          canvasCtx.fillStyle = '#FFFF00';
          canvasCtx.font = 'bold 20px Arial';
          canvasCtx.fillText(`${angle}°`, elbowX + 20, elbowY - 20);
        }

        if (poseAlert) setAlert(poseAlert);
        if (angle) setElbowAngle(angle);
        setIsInDownPosition(isDown);

      } else {
        setAlert("Position yourself in front of the camera");
      }

      animationFrameRef.current = requestAnimationFrame(detectPose);
    } catch (error) {
      console.error('Error in pose detection:', error);
      setAlert("Pose detection error - retrying...");
      animationFrameRef.current = requestAnimationFrame(detectPose);
    }
  }, [webcamRunning, isActive, pushUpCount, targetCount, speak]);

  useEffect(() => {
    if (isActive && webcamRunning) {
      detectPose();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, webcamRunning, detectPose]);

  useEffect(() => {
    let timeout;
    
    if (isCountingDown && countdown > 0) {
      timeout = setTimeout(() => {
        const newCount = countdown - 1;
        setCountdown(newCount);
        
        if (newCount === 0) {
          speak('Start!');
        } else {
          speak(newCount.toString());
        }
      }, 1000);
    } else if (isCountingDown && countdown === 0) {
      setTimeout(() => {
        setIsCountingDown(false);
        setIsActive(true);
        setCountdown(5);
      }, 1000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isCountingDown, countdown, speak]);

  const startWorkout = async () => {
    if (!webcamRunning) {
      await startWebcam();
    }
    
    setIsCompleted(false);
    setPushUpCount(0);
    pushUpCounterRef.current.resetCount();
    setCountdown(5);
    setShowPerformanceAlert(false);
    performanceAlertShownRef.current = false;
    fpsMonitorRef.current.reset();
    
    await speak('Get ready! Starting in 5 seconds');
    setIsCountingDown(true);
  };

  const toggleWorkout = () => {
    setIsActive(!isActive);
    speak(isActive ? 'Paused' : 'Resumed').catch(() => {});
  };

  const resetWorkout = () => {
    setIsActive(false);
    setIsCountingDown(false);
    setIsCompleted(false);
    setPushUpCount(0);
    setCountdown(5);
    setAlert('');
    setElbowAngle(0);
    setIsInDownPosition(false);
    setShowPerformanceAlert(false);
    performanceAlertShownRef.current = false;
    pushUpCounterRef.current.resetCount();
    fpsMonitorRef.current.reset();
    speak('Workout reset').catch(() => {});
  };

  const performanceStatus = fpsMonitorRef.current.getPerformanceStatus();

  return (
    <div 
      className="w-full min-h-screen flex flex-col items-center relative"
      style={{
        background: "linear-gradient(180deg, #667eea 0%, #764ba2 100%)",
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div className="w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="bg-black bg-opacity-30 text-white p-2 rounded-full hover:bg-opacity-50 transition-all backdrop-blur-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-white flex-1 text-center mr-10 ml-5">
            Push-Up Counter
          </h1>
        </div>
        <div className="flex items-center justify-center gap-2 text-white">
          <Target size={20} />
          <span className="text-lg">Target: {targetCount} push-ups</span>
        </div>
      </div>

      {/* Performance Alert */}
      {showPerformanceAlert && (
        <div className="w-full max-w-sm mx-4 mb-4">
          <div className="bg-red-500 bg-opacity-90 text-white p-3 rounded-lg flex items-center gap-2">
            <AlertTriangle size={20} />
            <div className="text-sm">
              <div className="font-bold">Low Performance Detected</div>
              <div>Video may not be supported. FPS: {fpsData.avgFps}</div>
            </div>
            <button 
              onClick={() => setShowPerformanceAlert(false)}
              className="ml-auto text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Camera View */}
      <div className="relative w-full max-w-sm mx-4 mb-6">
        <div className="relative aspect-video bg-black overflow-hidden" style={{ aspectRatio: '430/350' }}>
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
          
          {/* FPS Display */}
          {webcamRunning && isActive && (
            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              <div>FPS: {fpsData.fps}</div>
              <div>Avg: {fpsData.avgFps}</div>
              <div className={performanceStatus.color}>{performanceStatus.message}</div>
            </div>
          )}
          
          {/* Countdown Overlay */}
          {isCountingDown && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-6xl font-bold text-white animate-pulse">
                {countdown || 'START!'}
              </div>
            </div>
          )}

          {/* Completion Overlay */}
          {isCompleted && (
            <div className="absolute inset-0 bg-green-500 bg-opacity-80 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-white mb-2">🎉</div>
              <div className="text-2xl font-bold text-white text-center">
                Congratulations!<br />
                Target Achieved!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Counter Display */}
      <div className="bg-opacity-20 rounded-2xl p-6 mx-4 -mt-5 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-4xl text-white opacity-80">
            {pushUpCount} / {targetCount} <span className="text-2xl">push-ups</span>
          </div>
          {alert && (
            <div className="text-sm text-white opacity-70 mt-2">
              {alert}
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 mb-8">
        {!isActive && !isCountingDown && !isCompleted && (
          <button
            onClick={startWorkout}
            className="bg-white cursor-pointer text-purple-600 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 hover:bg-opacity-90 transition-all"
          >
            <Play size={24} />
            Start Workout
          </button>
        )}

        {(isActive || isCountingDown) && !isCompleted && (
          <button
            onClick={toggleWorkout}
            disabled={isCountingDown}
            className="bg-white cursor-pointer text-purple-600 px-6 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all disabled:opacity-50"
          >
            {isActive ? <Pause size={20} /> : <Play size={20} />}
            {isActive ? 'Pause' : 'Resume'}
          </button>
        )}

        <button
          onClick={resetWorkout}
          className="bg-red-500 text-white px-6 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-red-600 transition-all"
        >
          <RotateCcw size={20} />
          Reset
        </button>
      </div>

      {/* Status Indicators */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {/* Webcam Status */}
        <div className={`w-3 h-3 rounded-full ${webcamRunning ? 'bg-green-400' : 'bg-red-400'}`} />
        
        {/* Performance Status */}
        {webcamRunning && isActive && (
          <div className={`w-3 h-3 rounded-full ${
            fpsData.isLowPerformance ? 'bg-red-400' : 
            fpsData.showWarning ? 'bg-yellow-400' : 'bg-green-400'
          }`} />
        )}
      </div>
    </div>
  );
};

export default PushUpApp;