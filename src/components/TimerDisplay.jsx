import React from 'react';

// Timer Display Components
export const HydrateTimer = ({ timeRemaining }) => {
  return (
    <div className="mx-4 -mt-5">
      <div className="flex items-center justify-end gap-2">
        <div className="text-white text-right mt-3">
          <div className="text-[16px] text-white font-bold">YOUR FIRST SET</div>
          <div className="text-[16px] text-white font-bold">BEGINS IN</div>
        </div>
        <div className="text-[80px] font-bold text-white">{timeRemaining}</div>
      </div>
    </div>
  );
};

export const RecoveryTimer = ({ timeRemaining }) => {
  return (
    <div className="mx-4 -mt-5">
      <div className="flex items-center justify-end gap-2">
        <div className="text-white text-right">
          <div className="text-[16px] text-white font-bold">YOUR 2nd SET</div>
          <div className="text-[16px] text-white font-bold">BEGINS IN</div>
        </div>
        <div className="text-[80px] font-bold text-white">{timeRemaining}</div>
      </div>
    </div>
  );
};

export const ExerciseTimer = ({ timeRemaining }) => {
  return (
    <div className="mx-4 -mt-5">
      <div className="flex items-center justify-end gap-2">
        <div className="text-white text-right">
          <div className="text-[16px] text-white font-bold">TIME</div>
          <div className="text-[16px] text-white font-bold">REMAINING</div>
        </div>
        <div className="text-[80px] font-bold text-white">{timeRemaining}</div>
      </div>
    </div>
  );
};