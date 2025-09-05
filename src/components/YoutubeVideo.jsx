import React, { useState, useEffect } from 'react';

// YouTube Video Component with enhanced compatibility
const YouTubeVideo = ({ videoId, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Fallback video ID jika videoId tidak valid
  const fallbackVideoId = "dQw4w9WgXcQ";
  const safeVideoId = videoId || fallbackVideoId;

  useEffect(() => {
    // Reset states when videoId changes
    setIsLoaded(false);
    setHasError(false);
  }, [videoId]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  // Enhanced embed URL with better compatibility parameters
  const embedUrl = `https://www.youtube.com/embed/${safeVideoId}?` + new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: safeVideoId,
    controls: '0',
    showinfo: '0',
    rel: '0',
    iv_load_policy: '3',
    modestbranding: '1',
    playsinline: '1', // Important for iOS Safari
    enablejsapi: '1',
    origin: window.location.origin,
    widget_referrer: window.location.origin,
    start: '0',
    end: '60'
  }).toString();

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-gray-900 flex items-center justify-center"
          style={{ borderRadius: '8px' }}
        >
          <div className="text-white text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <div className="text-sm">Loading video...</div>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div 
          className="absolute inset-0 bg-gray-800 flex items-center justify-center"
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

      {/* Main iframe with enhanced compatibility */}
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
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
          aspectRatio: '9/16',
          display: hasError ? 'none' : 'block'
        }}
      />
    </div>
  );
};

export default YouTubeVideo;