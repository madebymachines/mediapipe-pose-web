import React, { useState, useRef, useEffect } from "react";
import logo from "../assets/logo.png";
import runnerImg from "../assets/Template-Junk-AI-landscape.jpg";
import { 
  ChevronLeftIcon, 
  PlayIcon, 
  PauseIcon,
  ShareIcon,
  ArrowDownTrayIcon 
} from "@heroicons/react/24/outline";
import axios from "axios";

const ResultPage = ({ song, user, onBack, onLogout }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false); 
  const [videoBlob, setVideoBlob] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false); // State untuk deteksi device
  const audioRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const lastRequestTimeRef = useRef(0);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Fungsi untuk deteksi apakah device adalah desktop
  const checkIsDesktop = () => {
    // Method 1: Menggunakan user agent
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Method 2: Menggunakan screen size (opsional, sebagai backup)
    const isLargeScreen = window.innerWidth >= 1024;
    
    // Method 3: Menggunakan touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Kombinasi: desktop jika bukan mobile, screen besar, dan tidak ada touch
    return !isMobile && isLargeScreen && !hasTouch;
  };

  // Effect untuk deteksi device saat component mount dan window resize
  useEffect(() => {
    const updateDeviceType = () => {
      setIsDesktop(checkIsDesktop());
    };

    // Check on mount
    updateDeviceType();

    // Check on window resize
    window.addEventListener('resize', updateDeviceType);
    
    return () => {
      window.removeEventListener('resize', updateDeviceType);
    };
  }, []);

  const handleLogout = () => {
    onLogout();
  };

  // Update time display
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  useEffect(() => {
    const getVideoUrl = async () => {
      if (!song.job_id) return;
      
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTimeRef.current;
      if (timeSinceLastRequest < 2000) {
        console.log('⚠️ Rate limiting protection: waiting before next request');
        return;
      }
      
      try {
        lastRequestTimeRef.current = now;
        console.log('🎬 Fetching video status for job ID:', song.job_id, '(Attempt:', retryCountRef.current + 1, ')');
        
        const response = await axios.get(`${backendUrl}/video-status/${song.job_id}`, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log('📹 Video response:', response.data);
        
        const status = response.data.video?.status;
        setVideoStatus(status);
        
        retryCountRef.current = 0;
        
        if (status === 'COMPLETE' && response.data.video?.downloadUrl) {
          console.log('✅ Video URL found:', response.data.video.downloadUrl);
          setVideoUrl(response.data.video.downloadUrl);
          setIsLoadingVideo(false);
          
          // Auto-download video file when URL is ready
          await downloadVideoFile(response.data.video.downloadUrl);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status === 'PROGRESSING' || status === 'PENDING') {
          console.log('⏳ Video still processing. Status:', status);
          setIsLoadingVideo(true);
          
          if (!pollingIntervalRef.current) {
            const baseInterval = 5000;
            const backoffMultiplier = Math.min(Math.pow(1.5, retryCountRef.current), 8);
            const interval = baseInterval * backoffMultiplier;
            
            console.log(`🔄 Starting polling with ${interval}ms interval`);
            
            pollingIntervalRef.current = setInterval(() => {
              getVideoUrl();
            }, interval);
          }
        } else if (status === 'FAILED') {
          console.log('❌ Video generation failed');
          setIsLoadingVideo(false);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('❌ Error getting video URL:', error);
        
        retryCountRef.current += 1;
        
        if (error.response?.status === 429 || error.message.includes('Too Many Requests')) {
          console.log('⚠️ Rate limited, implementing exponential backoff');
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          const backoffDelay = Math.min(10000 * Math.pow(2, retryCountRef.current - 1), 120000);
          console.log(`⏰ Will retry in ${backoffDelay / 1000} seconds`);
          
          setTimeout(() => {
            if (!pollingIntervalRef.current && !videoUrl) {
              pollingIntervalRef.current = setInterval(() => {
                getVideoUrl();
              }, backoffDelay);
            }
          }, backoffDelay);
          
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.log('⏰ Request timeout, will retry with longer interval');
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setTimeout(() => {
            if (!pollingIntervalRef.current && !videoUrl) {
              pollingIntervalRef.current = setInterval(() => {
                getVideoUrl();
              }, 15000);
            }
          }, 5000);
          
        } else if (retryCountRef.current >= 10) {
          console.log('❌ Max retry attempts reached, stopping polling');
          setIsLoadingVideo(false);
          setVideoStatus('FAILED');
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else {
          const retryDelay = Math.min(3000 * retryCountRef.current, 30000);
          console.log(`🔄 Will retry in ${retryDelay / 1000} seconds (attempt ${retryCountRef.current})`);
          
          setTimeout(() => {
            if (!videoUrl) {
              getVideoUrl();
            }
          }, retryDelay);
        }
      }
    };

    if (!videoUrl && song.job_id) {
      setTimeout(() => {
        getVideoUrl();
      }, 1000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [song.job_id, backendUrl, videoUrl]);

  // Function to download video file as blob
  const downloadVideoFile = async (url) => {
    if (videoBlob || !url) return; // Skip if already downloaded
    
    try {
      setIsDownloading(true);
      console.log('📥 Downloading video file...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      setVideoBlob(blob);
      console.log('✅ Video file downloaded successfully!', blob.size, 'bytes');
      
    } catch (error) {
      console.error('❌ Error downloading video file:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Fungsi untuk download video ke local storage (khusus desktop)
  const handleDownloadVideo = async () => {
    if (!videoBlob) return;
    
    try {
      // Buat URL object dari blob
      const url = URL.createObjectURL(videoBlob);
      
      // Buat element anchor untuk download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${song.title || 'AI-Song'}-video.mp4`;
      
      // Append ke document, klik, dan remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup URL object
      URL.revokeObjectURL(url);
      
      console.log('✅ Video download initiated');
    } catch (error) {
      console.error('❌ Error downloading video:', error);
    }
  };

  // Play/Pause toggle
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Progress bar click handler
  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    const progressBar = e.currentTarget;
    const clickX = e.clientX - progressBar.getBoundingClientRect().left;
    const width = progressBar.offsetWidth;
    const newTime = (clickX / width) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format time display
  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getLoadingText = () => {
    const retryCount = retryCountRef.current;
    
    if (isDownloading) {
      return 'Downloading video...';
    }
    
    switch (videoStatus) {
      case 'PENDING':
        return retryCount > 3 ? 'Still preparing...' : 'Preparing video...';
      case 'PROGRESSING':
        return retryCount > 5 ? 'Almost ready...' : 'Generating video...';
      case 'FAILED':
        return 'Video generation failed';
      default:
        if (retryCount > 7) {
          return 'This may take a while...';
        } else if (retryCount > 3) {
          return 'Processing...';
        }
        return 'Loading...';
    }
  };

  // Share function with file sharing capability
  const handleShare = async () => {
    const shareTitle = `${song.title} - AI Generated Song`;
    const shareText = `Check out my AI-generated song: "${song.title}" written by ${user.name}`;
    
    // Check if Web Share API is supported and we have a video file
    if (navigator.share && videoBlob) {
      try {
        // Create a File object from the blob
        const videoFile = new File([videoBlob], `${song.title}-video.mp4`, { 
          type: 'video/mp4',
          lastModified: new Date().getTime() 
        });
        
        // Share the video file directly
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [videoFile]
        });
        
        console.log('✅ Successfully shared video file');
        return;
        
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('❌ Error sharing video file:', error);
        }
      }
    }
  };

  // Check if video is ready for sharing
  const isVideoReady = videoStatus === 'COMPLETE' && videoBlob && !isDownloading;

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={song.audio?.url || "/demo.mp3"}
        onLoadedMetadata={() => setDuration(audioRef.current.duration)}
      />

      {/* Chevron + Logo */}
      <div className="w-full flex items-center justify-between my-6 px-4">
        <div className="w-16 flex justify-start">
          <button className="p-1" onClick={onBack} aria-label="Back">
            <ChevronLeftIcon className="w-7 h-7 text-white hover:opacity-80" />
          </button>
        </div>
        <div className="flex-1 flex justify-center">
          <img
            src={logo}
            alt="Acer Intel"
            className="w-48 md:w-56"
            draggable="false"
            style={{ objectFit: "contain" }}
          />
        </div>
        <div className="w-16 flex justify-end">
          <button
            onClick={handleLogout}
            className="text-white text-sm font-medium hover:text-white/80 transition-colors hover:bg-white/10 p-2 rounded-lg" 
            title={`Logout ${user.name}`}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Song Cover */}
      <div className="w-[310px] h-[240px] rounded-lg mb-6 flex items-center justify-center bg-black/10 overflow-hidden shadow-md">
        <img
          src={runnerImg}
          alt="song"
          className="object-cover w-full h-full"
          draggable="false"
        />
      </div>

      {/* Song Title & Author */}
      <div className="mb-6 text-white text-left w-full max-w-[310px]">
        <div className="text-2xl font-extrabold leading-tight mb-1 tracking-widest">
          {song.title || "GO! GO! GO!"}
        </div>
        <div className="text-base mb-4 font-medium text-white/80">
          Written by @{song.social_username || user.name}
        </div>
      </div>

      {/* Custom Audio Player */}
      <div className="w-80 mb-8">
        {/* Progress Bar */}
        <div className="mb-4">
          <div 
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ 
                width: duration ? `${(currentTime / duration) * 100}%` : '0%' 
              }}
            />
          </div>
          {/* Time Display */}
          <div className="flex justify-between text-white text-sm mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(duration - currentTime)}</span>
          </div>
        </div>

        {/* Play/Pause Button */}
        <div className="flex justify-center mb-0 -mt-4">
          <button
            onClick={togglePlayPause}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <PauseIcon className="w-8 h-8 text-purple-600 ml-0.5" />
            ) : (
              <PlayIcon className="w-8 h-8 text-purple-600 ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-80 space-y-4 mb-5">
        {/* Video Status indicator */}
        {videoStatus && (
          <div className={`text-center text-sm font-medium ${
            isVideoReady
              ? 'text-green-400' 
              : videoStatus === 'FAILED'
              ? 'text-red-400'
              : 'text-yellow-400'
          }`}>
            {isVideoReady && '✅ Video ready!'}
            {videoStatus === 'FAILED' && '❌ Video generation failed'}
            {(videoStatus === 'PROGRESSING' || videoStatus === 'PENDING' || isDownloading) && `⏳ ${getLoadingText()}`}
            {videoStatus === 'COMPLETE' && !videoBlob && !isDownloading && '📥 Video URL ready (downloading file...)'}
          </div>
        )}

        {/* Download Button - Hanya untuk Desktop */}
        {isDesktop && (
          <button
            onClick={handleDownloadVideo}
            disabled={!isVideoReady}
            className={`w-full border-2 font-bold py-3 rounded-md text-lg tracking-widest uppercase transition flex items-center justify-center gap-2 ${
              isVideoReady
                ? 'border-green-400 text-green-400 bg-transparent active:scale-95 hover:bg-green-400/10'
                : 'border-white/40 text-white/40 bg-transparent cursor-not-allowed opacity-60'
            }`}
            style={{ letterSpacing: ".13em" }}
          >
            {isVideoReady ? (
              <>
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Download Video</span>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/40"></div>
                <span>{getLoadingText()}</span>
              </>
            )}
          </button>
        )}

        {/* Share Button - Untuk semua device */}
        <button
          onClick={handleShare}
          disabled={!isVideoReady}
          className={`w-full border-2 font-bold py-3 rounded-md text-lg tracking-widest uppercase transition flex items-center justify-center gap-2 ${
            isVideoReady
              ? 'border-white text-white bg-transparent active:scale-95 hover:bg-white/10'
              : videoStatus === 'FAILED'
              ? 'border-red-400 text-red-400 bg-transparent cursor-not-allowed opacity-60'
              : 'border-white/40 text-white/40 bg-transparent cursor-not-allowed opacity-60'
          }`}
          style={{ letterSpacing: ".13em" }}
        >
          {isVideoReady ? (
            <>
              <ShareIcon className="w-5 h-5" />
              <span>Share</span>
            </>
          ) : videoStatus === 'FAILED' ? (
            <>
              <span>Video Failed</span>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/40"></div>
              <span>{getLoadingText()}</span>
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default ResultPage;