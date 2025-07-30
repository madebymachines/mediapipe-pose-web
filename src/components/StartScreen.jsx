import React from "react";
import logo from "../assets/logo.png";
import eventLogo from "../assets/event_logo.png";

const StartScreen = ({ onStart }) => (
  <>
    {/* Logo atas */}
    <div className="w-full flex justify-center pt-2 sm:pt-4 md:pt-6 pb-2 flex-shrink-0">
      <img
        src={logo}
        alt="Acer Intel"
        className="w-28 xs:w-32 sm:w-36 md:w-40 lg:w-44 h-auto"
        draggable="false"
        style={{ objectFit: "contain" }}
      />
    </div>
    
    {/* Logo event tengah */}
    <div className="flex-1 flex flex-col justify-center items-center min-h-0 px-4">
      <img
        src={eventLogo}
        alt="Acer Day 2025"
        className="w-36 xs:w-40 sm:w-44 md:w-48 lg:w-56 h-auto max-h-[45vh] sm:max-h-[50vh]"
        draggable="false"
        style={{ objectFit: "contain" }}
      />
      <span className="text-white text-xs sm:text-sm font-normal mt-1 sm:mt-2 tracking-wide">
        Break A Limit
      </span>
    </div>

    {/* Button START */}
    <div className="w-full flex justify-center pb-4 sm:pb-6 md:pb-8 pt-2 flex-shrink-0 px-4">
      <button
        onClick={onStart}
        className="w-[90%] max-w-sm py-2.5 sm:py-3 border-2 border-white hover:bg-white hover:text-purple-600 rounded-md text-white font-bold text-base sm:text-lg tracking-widest transition active:scale-95"
        style={{
          background: "transparent",
        }}
      >
        START
      </button>
    </div>
  </>
);

export default StartScreen;
