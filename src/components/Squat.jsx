import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Target, ArrowLeft } from 'lucide-react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

// Improved Squat detection class
class SquatCounter {
  constructor() {
    this.count = 0;
    this.isDown = false;
    this.stateFrames = 0;
    this.minFrames = 3; // Reduced for more responsive detection
    
    // More lenient thresholds for squat detection
    this.downKneeAngleThreshold = 120; // More lenient for squat down
    this.upKneeAngleThreshold = 150;   // More lenient for standing up
    
    // Remove hip drop validation as it's causing issues
    this.hipDropThreshold = -0.5; // Very lenient or disabled
    
    // Debug mode
    this.debugMode = true;
  }

  calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  }

  processPose(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return { count: this.count, alert: "No landmarks detected" };
    }

    // Key landmarks for squat detection
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];

    // Check if key landmarks are detected
    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle) {
      return { count: this.count, alert: "Key landmarks missing - please ensure full body is visible" };
    }

    // Check visibility
    const minVisibility = 0.3; // More lenient visibility
    if (leftHip.visibility < minVisibility || leftKnee.visibility < minVisibility || 
        leftAnkle.visibility < minVisibility || rightHip.visibility < minVisibility || 
        rightKnee.visibility < minVisibility || rightAnkle.visibility < minVisibility) {
      return { count: this.count, alert: "Low landmark visibility - adjust camera position" };
    }

    // Calculate knee angles
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // Simplified hip position check (optional)
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
    const hipDropRatio = avgHipY - avgKneeY;

    let alert = `Knee: ${Math.round(avgKneeAngle)}° | Hip: ${hipDropRatio.toFixed(2)} - `;
    
    if (this.debugMode) {
      console.log('Squat Debug:', {
        leftKneeAngle: leftKneeAngle.toFixed(1),
        rightKneeAngle: rightKneeAngle.toFixed(1),
        avgKneeAngle: avgKneeAngle.toFixed(1),
        hipDropRatio: hipDropRatio.toFixed(3),
        isDown: this.isDown,
        stateFrames: this.stateFrames,
        downThreshold: this.downKneeAngleThreshold,
        upThreshold: this.upKneeAngleThreshold
      });
    }

    // Simplified state machine - focus only on knee angle
    if (!this.isDown && avgKneeAngle <= this.downKneeAngleThreshold) {
      // Going down into squat - removed hip validation for now
      this.stateFrames++;
      alert += `Squatting DOWN (${this.stateFrames}/${this.minFrames})`;
      
      if (this.stateFrames >= this.minFrames) {
        this.isDown = true;
        this.stateFrames = 0;
        alert = "✅ SQUAT position confirmed!";
      }
    } else if (this.isDown && avgKneeAngle >= this.upKneeAngleThreshold) {
      // Standing up from squat
      this.stateFrames++;
      alert += `Standing UP (${this.stateFrames}/${this.minFrames})`;
      
      if (this.stateFrames >= this.minFrames) {
        this.isDown = false;
        const previousCount = this.count;
        this.count++;
        this.stateFrames = 0;
        alert = "🎉 SQUAT COMPLETED!";
        
        return { 
          count: this.count, 
          alert: alert,
          angle: Math.round(avgKneeAngle),
          isDown: this.isDown,
          stability: "Good",
          frames: this.stateFrames,
          hipPosition: hipDropRatio.toFixed(3),
          newCount: previousCount !== this.count,
          leftAngle: Math.round(leftKneeAngle),
          rightAngle: Math.round(rightKneeAngle)
        };
      }
    } else {
      // Reset or maintain
      this.stateFrames = 0;
      if (this.isDown) {
        alert += "In SQUAT - stand up to complete";
      } else {
        alert += "Ready - squat down to start";
      }
    }

    return { 
      count: this.count, 
      alert: alert,
      angle: Math.round(avgKneeAngle),
      isDown: this.isDown,
      stability: "Tracking",
      frames: this.stateFrames,
      hipPosition: hipDropRatio.toFixed(3),
      newCount: false,
      leftAngle: Math.round(leftKneeAngle),
      rightAngle: Math.round(rightKneeAngle)
    };
  }

  resetCount() {
    this.count = 0;
    this.isDown = false;
    this.stateFrames = 0;
  }

  // Method to adjust thresholds dynamically
  adjustThresholds(downThreshold, upThreshold) {
    this.downKneeAngleThreshold = downThreshold;
    this.upKneeAngleThreshold = upThreshold;
  }
}

const SquatApp = ({ onBack }) => {
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isActive, setIsActive] = useState(false);
  const [squatCount, setSquatCount] = useState(0);
  const [targetCount] = useState(20);
  const [isCompleted, setIsCompleted] = useState(false);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [voice, setVoice] = useState(null);
  const [alert, setAlert] = useState('');
  const [kneeAngle, setKneeAngle] = useState(0);
  const [isInDownPosition, setIsInDownPosition] = useState(false);
  const [stability, setStability] = useState('');
  const [lastSpokenCount, setLastSpokenCount] = useState(-1);
  const [debugInfo, setDebugInfo] = useState('');
  const speakTimeoutRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const squatCounterRef = useRef(new SquatCounter());
  const animationFrameRef = useRef(null);
  const poseLandmarkerRef = useRef(null);

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
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.3, // Lower confidence for better detection
          minPosePresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
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
        };
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      alert('Please allow camera access to use the squat counter');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setWebcamRunning(false);
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
          // Draw connections
          drawingUtils.drawConnectors(
            landmarks,
            PoseLandmarker.POSE_CONNECTIONS,
            { 
              color: '#00FF00', 
              lineWidth: 3,
              visibilityMin: 0.3
            }
          );
          
          // Draw all landmarks
          drawingUtils.drawLandmarks(landmarks, {
            color: '#FF0000',
            radius: 6,
            fillColor: '#FF0000',
            visibilityMin: 0.3
          });
          
          // Highlight squat key points with better visibility
          const keyPoints = [
            { landmark: landmarks[23], label: 'L.Hip', color: '#FF00FF' },
            { landmark: landmarks[24], label: 'R.Hip', color: '#FF00FF' },
            { landmark: landmarks[25], label: 'L.Knee', color: '#FFFF00' },
            { landmark: landmarks[26], label: 'R.Knee', color: '#FFFF00' },
            { landmark: landmarks[27], label: 'L.Ankle', color: '#00FFFF' },
            { landmark: landmarks[28], label: 'R.Ankle', color: '#00FFFF' },
          ];
          
          keyPoints.forEach(({ landmark, label, color }) => {
            if (landmark && landmark.visibility > 0.3) {
              const x = landmark.x * canvas.width;
              const y = landmark.y * canvas.height;
              
              canvasCtx.fillStyle = color;
              canvasCtx.beginPath();
              canvasCtx.arc(x, y, 10, 0, 2 * Math.PI);
              canvasCtx.fill();
              
              canvasCtx.fillStyle = '#FFFFFF';
              canvasCtx.font = 'bold 11px Arial';
              canvasCtx.strokeStyle = '#000000';
              canvasCtx.lineWidth = 2;
              canvasCtx.strokeText(label, x + 12, y + 4);
              canvasCtx.fillText(label, x + 12, y + 4);
            }
          });
          
        } catch (drawError) {
          console.warn("Drawing error:", drawError);
        }
        
        // Process pose for squat counting
        const result = squatCounterRef.current.processPose(landmarks);
        const { count, alert: poseAlert, angle, isDown, stability: angleStability, frames, newCount, hipPosition, leftAngle, rightAngle } = result;
        
        // Enhanced debugging
        const debugString = `L:${leftAngle}° R:${rightAngle}° Avg:${angle}° | Hip:${hipPosition} | Down:${isDown} | Frames:${frames}`;
        setDebugInfo(debugString);
        
        // Handle count speech
        if (newCount && count !== lastSpokenCount && count > 0) {
          setLastSpokenCount(count);
          setSquatCount(count);
          
          speak(count.toString(), true).catch(() => {});
          
          if (count >= targetCount) {
            setIsCompleted(true);
            setIsActive(false);
            setTimeout(() => {
              speak(`Excellent! You completed ${targetCount} squats!`, true).catch(() => {});
            }, 1000);
            return;
          }
        } else if (count !== squatCount) {
          setSquatCount(count);
        }

        // Draw knee angle visualization for both legs
        const drawKneeAngle = (hip, knee, ankle, side, offsetX = 0) => {
          if (hip && knee && ankle && hip.visibility > 0.3 && knee.visibility > 0.3 && ankle.visibility > 0.3) {
            const hipX = hip.x * canvas.width;
            const hipY = hip.y * canvas.height;
            const kneeX = knee.x * canvas.width;
            const kneeY = knee.y * canvas.height;
            const ankleX = ankle.x * canvas.width;
            const ankleY = ankle.y * canvas.height;
            
            // Draw angle lines
            canvasCtx.strokeStyle = '#FFFF00';
            canvasCtx.lineWidth = 3;
            canvasCtx.beginPath();
            canvasCtx.moveTo(hipX, hipY);
            canvasCtx.lineTo(kneeX, kneeY);
            canvasCtx.lineTo(ankleX, ankleY);
            canvasCtx.stroke();
            
            // Draw angle text
            const angleValue = side === 'L' ? leftAngle : rightAngle;
            canvasCtx.fillStyle = '#FFFF00';
            canvasCtx.font = 'bold 16px Arial';
            canvasCtx.strokeStyle = '#000000';
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeText(`${side}:${angleValue}°`, kneeX + offsetX, kneeY - 25);
            canvasCtx.fillText(`${side}:${angleValue}°`, kneeX + offsetX, kneeY - 25);
          }
        };

        // Draw angles for both legs
        drawKneeAngle(landmarks[23], landmarks[25], landmarks[27], 'L', -50);
        drawKneeAngle(landmarks[24], landmarks[26], landmarks[28], 'R', 20);

        if (poseAlert) setAlert(poseAlert);
        if (angle) setKneeAngle(angle);
        if (angleStability) setStability(angleStability);
        setIsInDownPosition(isDown);

      } else {
        setAlert("Position yourself in front of the camera - ensure full body is visible");
      }

      animationFrameRef.current = requestAnimationFrame(detectPose);
    } catch (error) {
      console.error('Error in pose detection:', error);
      setAlert("Pose detection error - retrying...");
      animationFrameRef.current = requestAnimationFrame(detectPose);
    }
  }, [webcamRunning, isActive, squatCount, targetCount, speak]);

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
          speak('Start squatting!');
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
    setSquatCount(0);
    squatCounterRef.current.resetCount();
    setCountdown(5);
    
    await speak('Get ready for squats! Starting in 5 seconds');
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
    setSquatCount(0);
    setCountdown(5);
    setAlert('');
    setKneeAngle(0);
    setIsInDownPosition(false);
    setStability('');
    squatCounterRef.current.resetCount();
    speak('Workout reset').catch(() => {});
  };

  return (
    <div 
      className="w-full min-h-screen flex flex-col items-center relative"
      style={{
        background: "linear-gradient(180deg, #ff6b6b 0%, #feca57 100%)",
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
            Squat Counter
          </h1>
        </div>
        <div className="flex items-center justify-center gap-2 text-white">
          <Target size={20} />
          <span className="text-lg">Target: {targetCount} squats</span>
        </div>
      </div>

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
              <div className="text-4xl font-bold text-white mb-2">🏆</div>
              <div className="text-2xl font-bold text-white text-center">
                Excellent!<br />
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
            {squatCount} / {targetCount} <span className="text-2xl">squats</span>
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
            className="bg-white text-orange-600 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 hover:bg-opacity-90 transition-all"
          >
            <Play size={24} />
            Start Squats
          </button>
        )}

        {(isActive || isCountingDown) && !isCompleted && (
          <button
            onClick={toggleWorkout}
            disabled={isCountingDown}
            className="bg-white text-orange-600 px-6 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all disabled:opacity-50"
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

      {/* Status Indicator */}
      <div className="absolute top-4 right-4">
        <div className={`w-3 h-3 rounded-full ${webcamRunning ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
    </div>
  );
};

export default SquatApp;