import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Target, ArrowLeft } from 'lucide-react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

// Simplified Push-up detection for debugging
class PushUpCounter {
  constructor() {
    this.count = 0;
    this.isDown = false;
    this.stateFrames = 0;
    this.minFrames = 3; // Very responsive for testing
    
    // Simple thresholds for testing
    this.downAngleThreshold = 100;  // Less than 100 degrees for down
    this.upAngleThreshold = 130;    // More than 130 degrees for up
    
    // Speech control
    this.lastSpokenCount = -1;
    this.lastSpeechTime = 0;
    this.speechCooldown = 2000; // 2 seconds between speeches
  }

  calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  }

  // Calculate distance between two points
  calculateDistance(point1, point2) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
  }

  // Simplified process for debugging
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

    // Check if key landmarks are detected
    if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist) {
      return { count: this.count, alert: "Key landmarks missing" };
    }

    // Calculate elbow angles (simplified)
    const leftElbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    let alert = `Angle: ${Math.round(avgElbowAngle)}° - `;
    
    // Very simple state machine for testing
    if (!this.isDown && avgElbowAngle <= this.downAngleThreshold) {
      // Going down
      this.stateFrames++;
      alert += `Going DOWN (${this.stateFrames}/${this.minFrames})`;
      
      if (this.stateFrames >= this.minFrames) {
        this.isDown = true;
        this.stateFrames = 0;
        alert = "✅ DOWN position confirmed!";
      }
    } else if (this.isDown && avgElbowAngle >= this.upAngleThreshold) {
      // Going up
      this.stateFrames++;
      alert += `Going UP (${this.stateFrames}/${this.minFrames})`;
      
      if (this.stateFrames >= this.minFrames) {
        this.isDown = false;
        const previousCount = this.count;
        this.count++;
        this.stateFrames = 0;
        alert = "🎉 PUSH-UP COMPLETED!";
        
        // Return flag to indicate new count for speech
        return { 
          count: this.count, 
          alert: alert,
          angle: Math.round(avgElbowAngle),
          isDown: this.isDown,
          stability: "Testing",
          frames: this.stateFrames,
          newCount: previousCount !== this.count // Flag for new count
        };
      }
    } else {
      // Reset or maintain
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
      newCount: false // Default no new count
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
  // Add state to track last spoken count
  const [lastSpokenCount, setLastSpokenCount] = useState(-1);
  const speakTimeoutRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const pushUpCounterRef = useRef(new PushUpCounter());
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
            delegate: "CPU", // Changed from GPU to CPU for better compatibility
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
        // Fallback: set a flag to indicate MediaPipe failed
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
      // Clear any existing timeout
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
      
      // Stop any ongoing speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      
      if (voice && 'speechSynthesis' in window && (force || !speechSynthesis.speaking)) {
        // Add small delay to prevent rapid firing
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
      alert('Please allow camera access to use the push-up counter');
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
      // Detect pose using MediaPipe
      const startTimeMs = performance.now();
      const results = await poseLandmarkerRef.current.detectForVideo(
        video,
        startTimeMs
      );

      // Clear canvas
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        
        // Create DrawingUtils instance here for each frame
        const drawingUtils = new DrawingUtils(canvasCtx);
        
        // Draw pose landmarks and connections FIRST
        try {
          // Draw connections (skeleton)
          drawingUtils.drawConnectors(
            landmarks,
            PoseLandmarker.POSE_CONNECTIONS,
            { 
              color: '#00FF00', 
              lineWidth: 4,
              visibilityMin: 0.5
            }
          );
          
          // Draw all landmarks as circles
          drawingUtils.drawLandmarks(landmarks, {
            color: '#FF0000',
            radius: 8,
            fillColor: '#FF0000',
            visibilityMin: 0.5
          });
          
          // Draw specific key points for push-up with labels
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
              
              // Draw bigger circle for key points
              canvasCtx.fillStyle = '#FFFF00';
              canvasCtx.beginPath();
              canvasCtx.arc(x, y, 10, 0, 2 * Math.PI);
              canvasCtx.fill();
              
              // Draw label
              canvasCtx.fillStyle = '#FFFFFF';
              canvasCtx.font = '12px Arial';
              canvasCtx.fillText(label, x + 15, y + 5);
            }
          });
          
        } catch (drawError) {
          console.warn("Drawing error:", drawError);
          // Enhanced fallback: draw simple but visible skeleton
          canvasCtx.strokeStyle = '#00FF00';
          canvasCtx.lineWidth = 3;
          canvasCtx.fillStyle = '#FF0000';
          
          // Draw basic skeleton connections
          const connections = [
            [11, 13], [13, 15], // Left arm
            [12, 14], [14, 16], // Right arm
            [11, 12], // Shoulders
            [11, 23], [12, 24], // Shoulder to hip
            [23, 24] // Hips
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
          
          // Draw landmarks as circles
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
        
        // Process pose for push-up counting
        const { count, alert: poseAlert, angle, isDown, stability: angleStability, frames, newCount } = pushUpCounterRef.current.processPose(landmarks);
        
        // Debug: Log key values
        console.log('Pose Data:', {
          angle,
          isDown,
          count,
          frames,
          newCount,
          leftElbow: landmarks[13] ? `(${landmarks[13].x.toFixed(2)}, ${landmarks[13].y.toFixed(2)})` : 'missing',
          rightElbow: landmarks[14] ? `(${landmarks[14].x.toFixed(2)}, ${landmarks[14].y.toFixed(2)})` : 'missing'
        });
        
        // Handle count speech with proper debouncing
        if (newCount && count !== lastSpokenCount && count > 0) {
          setLastSpokenCount(count);
          setPushUpCount(count);
          
          // Speak count with debouncing
          speak(count.toString(), true).catch(() => {});
          
          // Check if target achieved
          if (count >= targetCount) {
            setIsCompleted(true);
            setIsActive(false);
            // Speak completion message after a delay
            setTimeout(() => {
              speak(`Congratulations! You completed ${targetCount} push-ups!`, true).catch(() => {});
            }, 1000);
            return;
          }
        } else if (count !== pushUpCount) {
          // Update count state without speaking if not a new count
          setPushUpCount(count);
        }

        // Draw angle visualization
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
          
          // Draw angle lines
          canvasCtx.strokeStyle = '#FFFF00';
          canvasCtx.lineWidth = 4;
          canvasCtx.beginPath();
          canvasCtx.moveTo(shoulderX, shoulderY);
          canvasCtx.lineTo(elbowX, elbowY);
          canvasCtx.lineTo(wristX, wristY);
          canvasCtx.stroke();
          
          // Draw angle text
          canvasCtx.fillStyle = '#FFFF00';
          canvasCtx.font = 'bold 20px Arial';
          canvasCtx.fillText(`${angle}°`, elbowX + 20, elbowY - 20);
        }

        // Update UI states (don't trigger speech here)
        if (poseAlert) setAlert(poseAlert);
        if (angle) setElbowAngle(angle);
        if (angleStability) setStability(angleStability);
        setIsInDownPosition(isDown);

      } else {
        // No pose detected
        setAlert("Position yourself in front of the camera");
      }

      // Continue detection
      animationFrameRef.current = requestAnimationFrame(detectPose);
    } catch (error) {
      console.error('Error in pose detection:', error);
      setAlert("Pose detection error - retrying...");
      // Continue even on error
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
    setStability('');
    pushUpCounterRef.current.resetCount();
    speak('Workout reset').catch(() => {});
  };

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
            {pushUpCount} / {targetCount}  <span className="text-2xl"> push-ups</span>
          </div>
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
      {/* Status Indicator */}
      <div className="absolute top-4 right-4">
        <div className={`w-3 h-3 rounded-full ${webcamRunning ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
    </div>
  );
};

export default PushUpApp;