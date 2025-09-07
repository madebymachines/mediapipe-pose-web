import React from 'react';

// Body outline component with pose landmarks
const BodyOutline = ({ isValid, key: outlineKey }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <svg
        key={outlineKey}
        className="w-full h-full"
        viewBox="0 0 200 300"
        style={{ maxWidth: '150px', maxHeight: '225px' }}
      >
        {/* Head */}
        <circle
          cx="100"
          cy="40"
          r="20"
          fill="none"
          stroke={isValid ? "#00FF51" : "#FFFFFF"}
          strokeWidth="2"
          className={isValid ? "animate-pulse" : ""}
        />
        
        {/* Body */}
        <line
          x1="100"
          y1="60"
          x2="100"
          y2="180"
          stroke={isValid ? "#00FF51" : "#FFFFFF"}
          strokeWidth="2"
          className={isValid ? "animate-pulse" : ""}
        />
        
        {/* Arms */}
        <line
          x1="100"
          y1="90"
          x2="70"
          y2="130"
          stroke={isValid ? "#00FF51" : "#FFFFFF"}
          strokeWidth="2"
          className={isValid ? "animate-pulse" : ""}
        />
        <line
          x1="100"
          y1="90"
          x2="130"
          y2="130"
          stroke={isValid ? "#00FF51" : "#FFFFFF"}
          strokeWidth="2"
          className={isValid ? "animate-pulse" : ""}
        />
        
        {/* Legs */}
        <line
          x1="100"
          y1="180"
          x2="80"
          y2="250"
          stroke={isValid ? "#00FF51" : "#FFFFFF"}
          strokeWidth="2"
          className={isValid ? "animate-pulse" : ""}
        />
        <line
          x1="100"
          y1="180"
          x2="120"
          y2="250"
          stroke={isValid ? "#00FF51" : "#FFFFFF"}
          strokeWidth="2"
          className={isValid ? "animate-pulse" : ""}
        />
        
        {/* Hands */}
        <circle
          cx="70"
          cy="130"
          r="5"
          fill={isValid ? "#00FF51" : "#FFFFFF"}
          className={isValid ? "animate-pulse" : ""}
        />
        <circle
          cx="130"
          cy="130"
          r="5"
          fill={isValid ? "#00FF51" : "#FFFFFF"}
          className={isValid ? "animate-pulse" : ""}
        />
        
        {/* Feet */}
        <circle
          cx="80"
          cy="250"
          r="5"
          fill={isValid ? "#00FF51" : "#FFFFFF"}
          className={isValid ? "animate-pulse" : ""}
        />
        <circle
          cx="120"
          cy="250"
          r="5"
          fill={isValid ? "#00FF51" : "#FFFFFF"}
          className={isValid ? "animate-pulse" : ""}
        />
      </svg>
    </div>
  );
};

// Position validation components
export const PositionBeforeHydrate = ({ 
  videoRef, 
  canvasRef, 
  positionValidation, 
  bodyOutlineKey,
  phase 
}) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Video Container - menggunakan flex-1 untuk mengisi ruang yang tersisa */}
      <div 
        className="relative mx-4 bg-black overflow-hidden rounded-lg flex-1"
        style={{ 
          aspectRatio: '3/4',
          maxHeight: 'calc(100vh - 200px)',
          minHeight: '300px'
        }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover rounded-lg"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ borderRadius: '8px' }}
        />
        
        {/* Body outline overlay */}
        <BodyOutline 
          isValid={positionValidation.isValid} 
          key={bodyOutlineKey}
        />
        
        {/* Validation status overlay */}
        <div className="absolute top-4 left-4 right-4 z-20">
          <div className={`text-center p-3 rounded-lg backdrop-blur-sm ${
            positionValidation.isValid 
              ? 'bg-green-600 bg-opacity-80 text-white' 
              : 'bg-red-600 bg-opacity-80 text-white'
          }`}>
            <div className="font-semibold">
              {positionValidation.isValid ? 'POSITION DETECTED' : 'POSITION NOT DETECTED'}
            </div>
            {positionValidation.message && (
              <div className="text-sm mt-1 opacity-90">
                {positionValidation.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions - Remove margin dan gunakan padding untuk spacing */}
      <div 
        className="mx-4 text-center flex-shrink-0"
        style={{ 
          paddingTop: '16px',
          paddingBottom: '20px',
          marginTop: 0,
          marginBottom: 0
        }}
      >
        <div className="text-white text-lg font-medium">
          Step back so your whole body is visible, then get into position to start the challenge
        </div>
      </div>
    </div>
  );
};

export const PositionBeforeRecovery = ({ 
  videoRef, 
  canvasRef, 
  positionValidation, 
  bodyOutlineKey,
  phase 
}) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Video Container - menggunakan flex-1 untuk mengisi ruang yang tersisa */}
      <div 
        className="relative mx-4 bg-black overflow-hidden rounded-lg flex-1"
        style={{ 
          aspectRatio: '3/4',
          maxHeight: 'calc(100vh - 200px)',
          minHeight: '300px'
        }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover rounded-lg"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ borderRadius: '8px' }}
        />
        
        {/* Body outline overlay */}
        <BodyOutline 
          isValid={positionValidation.isValid} 
          key={bodyOutlineKey}
        />
        
        {/* Validation status overlay */}
        <div className="absolute top-4 left-4 right-4 z-20">
          <div className={`text-center p-3 rounded-lg backdrop-blur-sm ${
            positionValidation.isValid 
              ? 'bg-green-600 bg-opacity-80 text-white' 
              : 'bg-red-600 bg-opacity-80 text-white'
          }`}>
            <div className="font-semibold">
              {positionValidation.isValid ? 'POSITION DETECTED' : 'POSITION NOT DETECTED'}
            </div>
            {positionValidation.message && (
              <div className="text-sm mt-1 opacity-90">
                {positionValidation.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions - Remove margin dan gunakan padding untuk spacing */}
      <div 
        className="mx-4 text-center flex-shrink-0"
        style={{ 
          paddingTop: '16px',
          paddingBottom: '20px',
          marginTop: 0,
          marginBottom: 0
        }}
      >
        <div className="text-white text-lg font-medium">
          Get ready for your second round! Position yourself for the final challenge
        </div>
      </div>
    </div>
  );
};