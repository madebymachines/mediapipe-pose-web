import React from 'react';

// Timer Display Components
export const HydrateTimer = ({ timeRemaining }) => {
  return (
    <div className="mx-4">
      <div className="flex items-center justify-end gap-2">
        <div className="text-white text-right">
          <div className="text-[20px] text-white font-vancouver font-regular">YOUR FIRST SET</div>
          <div className="text-[20px] text-white font-vancouver font-regular">BEGINS IN</div>
        </div>
        <div className="text-[80px] font-vancouver font-regular text-white">{timeRemaining}</div>
      </div>
    </div>
  );
};

export const RecoveryTimer = ({ timeRemaining }) => {
  return (
    <div className="mx-4">
      <div className="flex items-center justify-end gap-2">
        <div className="text-white text-right">
          <div className="text-[20px] text-white font-vancouver font-regular">YOUR 2nd SET</div>
          <div className="text-[20px] text-white font-vancouver font-regular">BEGINS IN</div>
        </div>
        <div className="text-[80px] font-vancouver font-regular text-white">{timeRemaining}</div>
      </div>
    </div>
  );
};

export const ExerciseTimer = ({ timeRemaining }) => {
  return (
    <div className="mx-4">
      <div className="flex items-center justify-end gap-2">
        <div className="text-white text-right">
          <div className="text-[20px] text-white font-vancouver font-regular">TIME</div>
          <div className="text-[20px] text-white font-vancouver font-regular">REMAINING</div>
        </div>
        <div className="text-[80px] font-vancouver font-regular text-white">{timeRemaining}</div>
      </div>
    </div>
  );
};