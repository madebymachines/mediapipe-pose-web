import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import YouTubeVideo from './YoutubeVideo';
import { enableAudio, testAudio } from '../utils/AudioUtils';

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
  
  // Enable audio when component mounts
  useEffect(() => {
    enableAudio();
  }, []);

  const handleContinue = async () => {
    // Test audio before continuing
    console.log('Testing audio before starting challenge...');
    await testAudio();
    onContinue();
  };

  const handleBack = () => {
    // Enable audio on any user interaction
    enableAudio();
    onBack();
  };

  return (
    <div 
      className="w-full bg-black text-white flex flex-col"
      style={{ 
        maxWidth: '430px', 
        margin: "0 auto",
        minHeight: '100vh',
        height: '100vh', // Tambahkan height eksplisit
        overflow: 'hidden' // Cegah scrolling
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

      {/* Video Container - Gunakan flex-1 dan remove margin bottom */}
      <div 
        className="relative mx-4 bg-gray-900 overflow-hidden rounded-lg flex-1"
        style={{ 
          aspectRatio: '3/4',
          maxHeight: 'calc(100vh - 200px)',
          minHeight: '300px',
          marginBottom: 0 // Eksplisit set margin bottom ke 0
        }}
      >
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

      {/* Status Checks - Remove margin top/bottom dan gunakan padding */}
      <div 
        className="mx-4 flex-shrink-0"
        style={{ 
          paddingTop: '16px',
          paddingBottom: '16px',
          marginTop: 0,
          marginBottom: 0
        }}
      >
        <div className="flex items-center justify-between gap-8">
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
          <div 
            className="text-white text-center bg-red-900/20 border border-red-500/30 rounded-lg p-4"
            style={{ marginTop: '16px' }}
          >
            <div className="text-lg font-semibold mb-2">Sorry, Your device is not compatible.</div>
            <div className="text-sm">Please find other device to do the challenge!</div>
          </div>
        )}
      </div>

      {/* Conditional Button Layout */}
      {!isFpsCompatible ? (
        // Show only BACK TO HOME button when device is not compatible
        <div 
          className="mx-4 flex-shrink-0"
          style={{ 
            paddingBottom: '16px',
            marginTop: 0,
            marginBottom: 0
          }}
        >
          <button
            onClick={handleBack}
            className="w-full bg-transparent border-2 border-white text-white py-4 px-6 rounded-[5px] font-bold text-lg hover:bg-white hover:text-black transition-colors"
          >
            BACK TO HOME
          </button>
        </div>
      ) : (
        // Show normal BACK and CONTINUE buttons when device is compatible
        <div 
          className="mx-4 flex-shrink-0 flex gap-4"
          style={{ 
            paddingBottom: '16px',
            marginTop: 0,
            marginBottom: 0
          }}
        >
          <button
            onClick={handleBack}
            className="flex-1 bg-transparent border border-gray-600 text-white py-3 px-6 rounded font-bold hover:bg-gray-800 transition-colors"
          >
            BACK
          </button>
          <button
            onClick={handleContinue}
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