import React from 'react';

// Position Phase Components
export const PositionBeforeHydrate = ({ 
  videoRef, 
  canvasRef, 
  positionValidation, 
  bodyOutlineKey, 
  phase 
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="relative mx-4 mb-4 bg-transparent overflow-hidden" style={{ 
        aspectRatio: '3/4',
        maxHeight: 'calc(100vh - 180px)', 
      }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {/* Body outline overlay with dynamic key and improved styling */}
        <div 
          key={`body-outline-${bodyOutlineKey}-${phase}`}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="relative w-3/5 h-4/5">
            <img 
              src="./assets/Union.png"
              alt="Body Position Guide"
              className="w-full h-full object-contain transition-all duration-300"
              style={{ 
                filter: `drop-shadow(0 0 6px ${positionValidation.isValid ? '#00FF00' : '#FF4444'}) brightness(${positionValidation.isValid ? '1.3' : '0.9'}) contrast(${positionValidation.isValid ? '1.2' : '1.0'})`,
                opacity: positionValidation.isValid ? 0.8 : 0.6,
              }}
            />
          </div>
        </div>
      </div>

      <div className='mt-2 text-center'>
        <p className="text-white text-[16px]">
          Step back so your whole body is visible, then get into position to start the challenge
        </p>
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
      <div className="relative mx-4 mb-4 bg-transparent overflow-hidden" style={{ 
        aspectRatio: '3/4',
        maxHeight: 'calc(100vh - 180px)', 
      }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {/* Body outline overlay with dynamic key and improved styling */}
        <div 
          key={`body-outline-${bodyOutlineKey}-${phase}`}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="relative w-3/5 h-4/5">
            <img 
              src="./assets/Union.png"
              alt="Body Position Guide"
              className="w-full h-full object-contain transition-all duration-300"
              style={{ 
                filter: `drop-shadow(0 0 6px ${positionValidation.isValid ? '#00FF00' : '#FF4444'}) brightness(${positionValidation.isValid ? '1.3' : '0.9'}) contrast(${positionValidation.isValid ? '1.2' : '1.0'})`,
                opacity: positionValidation.isValid ? 0.8 : 0.6,
              }}
            />
          </div>
        </div>
      </div>

      <div className='mt-2 text-center'>
        <p className="text-white text-[16px]">
          Get ready for your second round! Position yourself properly
        </p>
      </div>
    </div>
  );
};