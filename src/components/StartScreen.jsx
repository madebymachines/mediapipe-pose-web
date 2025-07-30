import React from "react";
import logo from "../assets/logo.png";
import eventLogo from "../assets/event_logo.png";

const StartScreen = ({ onStart }) => (
  <>
    {/* Logo atas */}
    <div className="w-full flex justify-center p-6">
      <img
        src={logo}
        alt="Acer Intel"
        className="w-40 md:w-44"
        draggable="false"
        style={{ objectFit: "contain" }}
      />
    </div>

    {/* Logo event tengah */}
    <div className="flex-1 flex flex-col justify-center items-center">
      <img
        src={eventLogo}
        alt="Acer Day 2025"
        className="w-48 md:w-56 -mt-20"
        draggable="false"
        style={{ objectFit: "contain" }}
      />
      <span className="text-white text-xs font-normal mt-1 tracking-wide">
        Break A Limit
      </span>
    </div>

    {/* Button START */}
    <div className="w-full flex justify-center mb-8">
      <button
        onClick={onStart}
        className="w-[90%] -mt-10 py-2 border-2 border-white hover:text-white rounded-md text-white font-bold text-lg tracking-widest transition active:scale-95 hover:text-black"
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
