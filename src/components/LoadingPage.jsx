import React from "react";
import logo from "../assets/logo.png";
import eventLogo from "../assets/event_logo.png";

const LoadingPage = () => (
  <>
    <div className="w-full flex justify-center pt-6">
      {/* Logo atas */}
      <img
        src={logo}
        alt="Acer Intel"
        className="w-48 md:w-56"
        draggable="false"
        style={{ objectFit: "contain" }}
      />
    </div>

    {/* Logo event */}
    <div className="flex-1 flex flex-col justify-center items-center">
      <img
        src={eventLogo}
        alt="Acer Day 2025"
        className="w-48 md:w-56"
        draggable="false"
        style={{ objectFit: "contain" }}
      />

      {/* Loading Bar */}
      <div className="w-[90%] max-w-[350px] h-7 border-2 border-white rounded-lg bg-transparent flex items-center px-2 gap-1 my-8">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className="w-6 h-4 rounded-md bg-white animate-pulse"
            style={{
              animationDelay: `${idx * 0.14}s`,
              animationDuration: "1.4s",
              animationIterationCount: "infinite",
            }}
          ></div>
        ))}
      </div>

      {/* Text */}
      <div className="mt-3 text-white text-center text-xl font-semibold tracking-wide">
        CREATING YOUR <span className="font-black">THEME SONG</span>
        <span className="font-normal">...</span>
      </div>
    </div>
  </>
);

export default LoadingPage;
