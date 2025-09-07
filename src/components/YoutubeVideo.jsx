import React, { useState, useEffect, useRef } from 'react';
import { Play, VolumeX, Volume2, RotateCcw } from 'lucide-react';

// YouTube Video Component with thumbnail background
const YouTubeVideo = ({ videoId, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const iframeRef = useRef(null);

  // Fallback video ID
  const fallbackVideoId = "dQw4w9WgXcQ";
  const safeVideoId = videoId || fallbackVideoId;

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setShowPlayButton(true);
    setIsMuted(true);
    setThumbnailLoaded(false);
    setThumbnailError(false);
  }, [videoId]);

  // Generate thumbnail URLs (YouTube provides multiple quality options)
  const getThumbnailUrls = (videoId) => {
    return [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // Best quality
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,     // High quality
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,     // Medium quality
      `https://img.youtube.com/vi/${videoId}/default.jpg`        // Standard quality
    ];
  };

  const createEmbedUrl = (withAudio = false) => {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: withAudio ? '0' : '1',
      loop: '1',
      playlist: safeVideoId,
      controls: withAudio ? '1' : '0',
      showinfo: '0',
      rel: '0',
      iv_load_policy: '3',
      modestbranding: '1',
      playsinline: '1',
      enablejsapi: '1',
      origin: window.location.origin,
      start: '0',
      end: '60'
    });

    return `https://www.youtube.com/embed/${safeVideoId}?${params.toString()}`;
  };

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  const handlePlayWithAudio = () => {
    setIsMuted(false);
    setShowPlayButton(false);
    
    // Reload iframe with audio enabled
    if (iframeRef.current) {
      iframeRef.current.src = createEmbedUrl(true);
    }
  };

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    // Reload iframe with new audio state
    if (iframeRef.current) {
      iframeRef.current.src = createEmbedUrl(!newMuteState);
    }
  };

  const restartVideo = () => {
    if (iframeRef.current) {
      iframeRef.current.src = createEmbedUrl(!isMuted);
    }
  };

  // Component for thumbnail with fallback
  const ThumbnailBackground = () => {
    const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(0);
    const thumbnailUrls = getThumbnailUrls(safeVideoId);

    const handleThumbnailError = () => {
      if (currentThumbnailIndex < thumbnailUrls.length - 1) {
        setCurrentThumbnailIndex(prev => prev + 1);
      } else {
        setThumbnailError(true);
      }
    };

    const handleThumbnailLoad = () => {
      setThumbnailLoaded(true);
      setThumbnailError(false);
    };

    if (thumbnailError) {
      // Fallback gradient background
      return (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-red-700"
          style={{ borderRadius: '8px' }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-2xl font-bold mb-2">YouTube Video</div>
              <div className="text-sm opacity-80">Click to play</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <img
        src={thumbnailUrls[currentThumbnailIndex]}
        alt="Video thumbnail"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ borderRadius: '8px' }}
        onLoad={handleThumbnailLoad}
        onError={handleThumbnailError}
      />
    );
  };

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Thumbnail Background - Show when play button is visible */}
      {showPlayButton && (
        <div className="absolute inset-0 z-5">
          <ThumbnailBackground />
          {/* Subtle overlay for better button visibility */}
          <div className="absolute inset-0 bg-black bg-opacity-20" style={{ borderRadius: '8px' }}></div>
        </div>
      )}

      {/* Loading placeholder - only show if no thumbnail */}
      {!isLoaded && !hasError && !thumbnailLoaded && showPlayButton && (
        <div 
          className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10"
          style={{ borderRadius: '8px' }}
        >
          <div className="text-white text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <div className="text-sm">Loading preview...</div>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div 
          className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10"
          style={{ borderRadius: '8px' }}
        >
          <div className="text-white text-center p-4">
            <div className="text-red-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm">Video unavailable</div>
            <div className="text-xs text-gray-400 mt-1">Please check your connection</div>
          </div>
        </div>
      )}

      {/* Main iframe - hidden when showing thumbnail */}
      <iframe
        ref={iframeRef}
        width="100%"
        height="100%"
        src={showPlayButton ? 'about:blank' : createEmbedUrl(!isMuted)}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={handleLoad}
        onError={handleError}
        style={{ 
          borderRadius: '8px',
          display: hasError ? 'none' : 'block',
          opacity: showPlayButton ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />

      {/* Play Button Overlay - Over thumbnail */}
      {showPlayButton && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          {/* Main Play Button */}
          <button
            onClick={handlePlayWithAudio}
            className="bg-red-600 hover:bg-red-700 rounded-full p-6 transition-all duration-300 transform hover:scale-110 shadow-2xl mb-4 group"
            aria-label="Play video with sound"
          >
            <Play className="w-12 h-12 text-white ml-1 group-hover:scale-110 transition-transform duration-200" fill="currentColor" />
          </button>
          
          {/* Play Text */}
          <div className="text-white text-center">
            <div className="text-lg font-urw-geometric font-regular mb-1 drop-shadow-lg">Watch with Sound</div>
            <div className="text-sm font-urw-geometric font-regular bg-black bg-opacity-50 px-4 py-2 rounded-full backdrop-blur-sm">
              Tap to enable audio
            </div>
          </div>
        </div>
      )}

      {/* Control Panel - Show after playing */}
      {!showPlayButton && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={toggleMute}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 rounded-full p-3 transition-all duration-200 shadow-lg backdrop-blur-sm"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
          
          <button
            onClick={restartVideo}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 rounded-full p-3 transition-all duration-200 shadow-lg backdrop-blur-sm"
            aria-label="Restart video"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Audio Status Indicator */}
      {!showPlayButton && (
        <div className="absolute bottom-4 left-4 z-20">
          <div className={`text-xs px-3 py-2 rounded-full backdrop-blur-sm transition-all duration-200 ${
            isMuted 
              ? 'bg-red-600 bg-opacity-80 text-white' 
              : 'bg-green-600 bg-opacity-80 text-white'
          }`}>
            <div className="flex items-center gap-2 font-urw-geometric font-regular">
              {isMuted ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
              <span>{isMuted ? 'Muted' : 'Audio On'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Video Info Overlay on Thumbnail */}
      {showPlayButton && thumbnailLoaded && (
        <div className="absolute bottom-4 left-4 z-15">
          <div className="bg-black bg-opacity-60 text-white text-xs px-3 py-2 rounded-full backdrop-blur-sm">
            <div className="flex items-center gap-2 font-urw-geometric font-regular">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>YouTube Video</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouTubeVideo;