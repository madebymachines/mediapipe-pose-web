import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

// Import utility classes
import { FPSMonitor } from '../utils/FPSMonitor';
import { PositionValidator } from '../utils/PositionValidator';
import { SquatCounter } from '../utils/SquatCounter';
import { playCountSound, playAnnouncement } from '../utils/AudioUtils';

// Import components
import SetupPage from '../components/SetupPage';
import { PositionBeforeHydrate, PositionBeforeRecovery } from '../components/PositionPhase';
import { HydratePhase, RecoveryPhase, ExercisePhase, GoPhase } from '../components/ExercisePhase';
import { HydrateTimer, RecoveryTimer, ExerciseTimer } from '../components/TimerDisplay';
import GridPhotoPage from '../components/GridPhotoResult';

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
  const [positionValidation, setPositionValidation] = useState({ isValid: false, message: "" });
  const [isPositionConfirmed, setIsPositionConfirmed] = useState(false);
  const [bodyOutlineKey, setBodyOutlineKey] = useState(0);

  // YouTube video ID for shorts
  const YOUTUBE_VIDEO_ID = "eFEVKmp3M4g"; // Replace with your YouTube Shorts ID

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const squatCounterRef = useRef(new SquatCounter());
  const fpsMonitorRef = useRef(new FPSMonitor());
  const positionValidatorRef = useRef(new PositionValidator());
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

  // Pose detection with proper canvas sizing and positioning
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

    // Proper canvas sizing to match video exactly
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
        
        // Handle position validation phase
        // if (phase === 'position-before-hydrate' || phase === 'position-before-recovery') {
        //   const validation = positionValidatorRef.current.validatePosition(landmarks);
        //   setPositionValidation(validation);
          
        //   if (validation.isValid && !isPositionConfirmed) {
        //     setIsPositionConfirmed(true);
        //     const delay = 3000
        //     setTimeout(() => {
        //       handlePhaseComplete(); 
        //     }, delay);
        //   }
        // }
        
        if (phase === 'exercise') {
          // Draw skeleton with proper scaling to video dimensions
          const drawingUtils = new DrawingUtils(canvasCtx);
          drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#FFFFFF', lineWidth: 2 });
          drawingUtils.drawLandmarks(landmarks, { color: '#FFFFFF', radius: 4 });
          
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
  }, [webcamRunning, phase, currentRound, takeScreenshot, hasSquatPhoto, isPositionConfirmed]);

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

  // useEffect(() => {
  //   if (phase === 'position-before-hydrate' || phase === 'position-before-recovery') {
  //     setIsPositionConfirmed(false);
  //     positionValidatorRef.current.reset();
  //     setBodyOutlineKey(prev => prev + 1);
  //   }
  // }, [phase]);

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

  // const handlePhaseComplete = () => {
  //   if (phase === 'position-before-hydrate') {
  //     // Setelah validasi posisi sebelum hydrate, lanjut ke hydrate
  //     setPhase('hydrate');
  //     setTimeRemaining(10);
  //     setProgressPercent(0);
  //   } else if (phase === 'hydrate') {
  //     takeScreenshot('hydrate');
  //     setProgressPercent(100);
  //     setTimeout(() => {
  //       setPhase('go');
  //       setTimeout(() => {
  //         setPhase('exercise');
  //         setTimeRemaining(50);
  //         setProgressPercent(0);
  //         squatCounterRef.current.resetCount();
  //         setSquatCount(0);
  //         setHasSquatPhoto(prev => ({ ...prev, [`round${currentRound}`]: false }));
  //       }, 2000);
  //     }, 1000);
  //   } else if (phase === 'exercise') {
  //     setProgressPercent(100);
  //     if (currentRound === 1) {
  //       // Setelah exercise round 1, langsung ke recovery (bukan position validation)
  //       setPhase('recovery');
  //       setTimeRemaining(10);
  //       setProgressPercent(0);
  //     } else {
  //       if (!hasSpokenCongratulations) {
  //         playAnnouncement('Congratulations! You finished your challenge!');
  //         setHasSpokenCongratulations(true);
  //       }
  //       setTimeout(() => {
  //         setPhase('grid');
  //       }, 3000);
  //     }
  //   } else if (phase === 'recovery') {
  //     takeScreenshot('recovery');
  //     setProgressPercent(100);
  //     setTimeout(() => {
  //       // Setelah recovery selesai, BARU masuk ke position validation untuk round 2
  //       setPhase('position-before-recovery');
  //       setProgressPercent(0);
  //       // Reset position validator untuk round 2
  //       positionValidatorRef.current.reset();
  //       setIsPositionConfirmed(false);
  //     }, 1000);
  //   } else if (phase === 'position-before-recovery') {
  //     // Setelah validasi posisi sebelum round 2, langsung ke GO dan exercise round 2
  //     setTimeout(() => {
  //       setPhase('go');
  //       setCurrentRound(2);
  //       setTimeout(() => {
  //         setPhase('exercise');
  //         setTimeRemaining(50);
  //         setProgressPercent(0);
  //         squatCounterRef.current.resetCount();
  //         setSquatCount(0);
  //         setHasSquatPhoto(prev => ({ ...prev, [`round${currentRound}`]: false }));
  //       }, 2000);
  //     }, 3000);
  //   }
  // };

  const handlePhaseComplete = () => {
    if (phase === 'setup') {
      // Langsung ke hydrate, skip position-before-hydrate
      setPhase('hydrate');
      setTimeRemaining(10);
      setProgressPercent(0);
    } else if (phase === 'hydrate') {
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
        // Langsung ke recovery, skip position validation
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
        // Langsung ke GO untuk round 2, skip position-before-recovery
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
      // setPhase('position-before-hydrate'); 
      setPhase('hydrate');
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
    <div 
      className="w-full bg-black text-white flex flex-col" 
      style={{ 
        maxWidth: '430px', 
        margin: "0 auto",
        minHeight: '100vh',
        height: '100vh', // Tambahkan height eksplisit untuk konsistensi Safari
        overflow: 'hidden' // Cegah scrolling yang tidak diinginkan
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-center py-2 relative flex-shrink-0">
        <img 
          src="./assets/LOGO2 1.png" 
          alt="Unlock Your 100 Logo" 
          className="h-12 object-contain"
        />
      </div>

      {phase === 'setup' && (
        <SetupPage
          videoRef={videoRef}
          canvasRef={canvasRef}
          webcamRunning={webcamRunning}
          isFpsCompatible={isFpsCompatible}
          onBack={onBack}
          onContinue={handleContinue}
          YOUTUBE_VIDEO_ID={YOUTUBE_VIDEO_ID}
        />
      )}

      {phase === 'position-before-hydrate' && (
        <div className="flex-1 flex flex-col">
          <PositionBeforeHydrate
            videoRef={videoRef}
            canvasRef={canvasRef}
            positionValidation={positionValidation}
            bodyOutlineKey={bodyOutlineKey}
            phase={phase}
          />
        </div>
      )}

      {phase === 'position-before-recovery' && (
        <div className="flex-1 flex flex-col">
          <PositionBeforeRecovery
            videoRef={videoRef}
            canvasRef={canvasRef}
            positionValidation={positionValidation}
            bodyOutlineKey={bodyOutlineKey}
            phase={phase}
          />
        </div>
      )}

      {phase === 'hydrate' && (
        <>
          <HydratePhase
            videoRef={videoRef}
            canvasRef={canvasRef}
            progressPercent={progressPercent}
          />
          
          {/* Progress Bar */}
          <div className="mx-4 flex-shrink-0">
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF0000] transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <HydrateTimer timeRemaining={timeRemaining} />
        </>
      )}

      {phase === 'recovery' && (
        <>
          <RecoveryPhase
            videoRef={videoRef}
            canvasRef={canvasRef}
            progressPercent={progressPercent}
          />
          
          {/* Progress Bar */}
          <div className="mx-4 flex-shrink-0">
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF0000] transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <RecoveryTimer timeRemaining={timeRemaining} />
        </>
      )}

      {phase === 'exercise' && (
        <>
          <ExercisePhase
            videoRef={videoRef}
            canvasRef={canvasRef}
            currentRound={currentRound}
            squatCount={squatCount}
          />
          
          {/* Progress Bar */}
          <div className="mx-4 flex-shrink-0">
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF0000] transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <ExerciseTimer timeRemaining={timeRemaining} />
        </>
      )}

      {phase === 'go' && (
        <GoPhase
          videoRef={videoRef}
          canvasRef={canvasRef}
        />
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