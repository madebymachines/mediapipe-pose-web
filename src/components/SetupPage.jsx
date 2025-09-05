import React from 'react';
import { Check, X } from 'lucide-react';
import YouTubeVideo from './YoutubeVideo';

// Setup Page Component
const SetupPage = ({ 
  videoRef, 
  canvasRef, 
  webcamRunning, 
  isFpsCompatible, 
  onBack, 
  onContinue, 
  YOUTUBE_VIDEO_ID 
}) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Video Container - Show YouTube video instead of webcam for setup */}
      <div className="relative mx-4 mb-4 bg-gray-900 overflow-hidden rounded-lg" style={{ 
        aspectRatio: '3/4',
        maxHeight: 'calc(100vh - 200px)',
        minHeight: '300px'
      }}>
        <YouTubeVideo
          videoId={YOUTUBE_VIDEO_ID}
          className="w-full h-full"
        />
        
        {/* Hidden webcam for initialization */}
        <video
          ref={videoRef}
          className="hidden"
          autoPlay
          playsInline
          muted
          preload="metadata"
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>

      {/* Status Checks */}
      <div className="mx-4 mb-4">
        <div className="flex items-center justify-between gap-8 mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${webcamRunning ? 'border-[#00FF51]' : 'border-[#FF0000]'}`}>
              {webcamRunning ? <Check size={12} className="text-[#00FF51]" /> : <X size={12} className="text-[#FF0000]" />}
            </div>
            <span className={`text-[20px] sm:text-[24px] md:text-[30px] font-semibold ${webcamRunning ? 'text-[#00FF51]' : 'text-[#FF0000]'}`}>CAMERA</span>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isFpsCompatible ? 'border-[#00FF51]' : 'border-[#FF0000]'}`}>
              {isFpsCompatible ? <Check size={12} className="text-[#00FF51]" /> : <X size={12} className="text-[#FF0000]" />}
            </div>
            <span className={`text-[20px] sm:text-[24px] md:text-[30px] font-semibold ${isFpsCompatible ? 'text-[#00FF51]' : 'text-[#FF0000]'}`}>FPS CHECK</span>
          </div>
        </div>
        
        {!isFpsCompatible && (
          <div className="text-white text-center bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="text-lg font-semibold mb-2">Sorry, Your device is not compatible.</div>
            <div className="text-sm">Please find other device to do the challenge!</div>
          </div>
        )}
      </div>

      {/* Conditional Button Layout */}
      {!isFpsCompatible ? (
        // Show only BACK TO HOME button when device is not compatible
        <div className="mx-4 mb-2">
          <button
            onClick={onBack}
            className="w-full bg-transparent border-2 border-white text-white py-4 px-6 rounded-[5px] font-bold text-lg hover:bg-white hover:text-black transition-colors"
          >
            BACK TO HOME
          </button>
        </div>
      ) : (
        // Show normal BACK and CONTINUE buttons when device is compatible
        <div className="mx-4 -mt-4 mb-2 flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 bg-transparent border border-gray-600 text-white py-3 px-6 rounded font-bold hover:bg-gray-800 transition-colors"
          >
            BACK
          </button>
          <button
            onClick={onContinue}
            disabled={!isFpsCompatible || !webcamRunning}
            className={`flex-1 py-3 px-6 rounded font-bold transition-colors ${
              isFpsCompatible && webcamRunning
                ? 'bg-[#FF0000] text-white hover:bg-[#CC0000]'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            CONTINUE
          </button>
        </div>
      )}
    </div>
  );
};

export default SetupPage;