import React from 'react';

// Exercise Phase Components
export const HydratePhase = ({ 
  videoRef, 
  canvasRef, 
  progressPercent 
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

        {/* Hydrate overlay */}
        <div className="absolute inset-0 flex flex-col justify-end items-center pb-16">
          <div className="text-center relative">
            <div className="absolute -top-17 left-0 w-10 h-10 transform transition-transform duration-1000 ease-linear"
                 style={{ 
                   transform: `translateX(${progressPercent * 2.8}px)` 
                 }}>
              <img 
                src="./assets/BOTTLE 2.png" 
                alt="Bottle" 
                className="w-[44px] h-[74px] object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-full h-full bg-gray-600 rounded-lg flex items-center justify-center" style={{ display: 'none' }}>
                <div className="w-3 h-6 bg-white rounded-sm relative">
                  <div className="w-1.5 h-1.5 bg-gray-400 absolute -top-0.5 left-1/2 transform -translate-x-1/2 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="relative bg-black text-white px-4 py-2 rounded-[10px] mb-2 overflow-hidden">
              <div 
                className="absolute inset-0 bg-[#FF0000] transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
              <span className="relative z-10 text-[30px] font-vancouver font-regular">HYDRATE AND ENERGIZE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RecoveryPhase = ({ 
  videoRef, 
  canvasRef, 
  progressPercent 
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

        {/* Recovery overlay */}
        <div className="absolute inset-0 flex flex-col justify-end items-center pb-16">
          <div className="text-center relative">
            <div className="absolute -top-17 left-0 w-10 h-10 transform transition-transform duration-1000 ease-linear"
              style={{ 
                transform: `translateX(${progressPercent * 2.9}px)` 
              }}>
              <img 
                src="./assets/BOTTLE 2.png" 
                alt="Bottle" 
                className="w-[44px] h-[74px] object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-full h-full bg-gray-600 rounded-lg flex items-center justify-center" style={{ display: 'none' }}>
                <div className="w-3 h-6 bg-white rounded-sm relative">
                  <div className="w-1.5 h-1.5 bg-gray-400 absolute -top-0.5 left-1/2 transform -translate-x-1/2 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="relative bg-black text-white px-4 py-2 rounded-[10px] mb-2 overflow-hidden">
              <div 
                className="absolute inset-0 bg-[#FF0000] transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
              <span className="relative z-10 text-[20px] font-bold">RECOVER &amp; REPEAT STRONGER</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ExercisePhase = ({ 
  videoRef, 
  canvasRef, 
  currentRound, 
  squatCount 
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

        {/* Exercise counter overlay */}
        <div className="absolute inset-0 flex flex-col justify-end items-center pb-10">
          <div className="w-full px-4">
            {/* Full width counter container */}
            <div className="w-full rounded-lg p-4 flex items-center justify-between h-[100px]">
              
              {/* ROUND text - 40px font */}
              <div className="flex mt-5 h-full transform -rotate-90">
                <span className="text-white text-left text-[20px] sm:text-[22px] font-bold leading-none">
                  ROUND {currentRound}
                </span>
              </div>
              
              {/* Count number - 120px font */}
              <div className="flex items-center justify-center h-full">
                <span className="text-[#FF0000] text-[150px] font-bold leading-none">
                  {squatCount}
                </span>
              </div>
              
              {/* REP text - 50px font */}
              <div className="flex mt-5 ml-5 h-full">
                <span className="text-[#FF0000] text-right text-[50px] font-bold leading-none">
                  REP
                </span>
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GoPhase = ({ 
  videoRef, 
  canvasRef 
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

        {/* GO overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="text-[120px] sm:text-[150px] font-bold text-[#FF0000] animate-pulse">GO!</div>
        </div>
      </div>
    </div>
  );
};