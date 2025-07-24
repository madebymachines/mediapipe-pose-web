import React from "react";
import logo from "../assets/logo.png";
import runnerImg from "../assets/runner.png";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

const ResultPage = ({ song, user, onBack }) => {
  return (
    <>
      {/* Chevron + Logo */}
      <div className="w-full flex items-center justify-between my-6 px-2">
        <button className="p-1" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon className="w-7 h-7 text-white hover:opacity-80" />
        </button>
        <img
          src={logo}
          alt="Acer Intel"
          className="w-48 md:w-56"
          draggable="false"
          style={{ objectFit: "contain" }}
        />
        <span className="w-7" />
      </div>

      {/* Song Cover */}
      <div className="w-[310px] h-[240px] rounded-lg mb-6 flex items-center justify-center bg-black/10 overflow-hidden shadow-md">
        <img
          src={runnerImg}
          alt="song"
          className="object-cover w-full h-full"
          draggable="false"
        />
      </div>

      {/* Song Title & Author */}
      <div className="mb-2 text-white text-center w-full">
        <div className="text-2xl font-extrabold leading-tight mb-1 tracking-widest">
          {song.title || "GO! GO! GO!"}
        </div>
        <div className="text-base mb-4 font-medium text-white/80">
          Written by {user.name}
        </div>
      </div>

      {/* Audio Player */}
      <audio
        controls
        className="w-80 accent-white mb-7"
        style={{
          background: "transparent",
          outline: "none",
          border: "none",
        }}
      >
        <source src={song.url || "/demo.mp3"} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      {/* Share Button */}
      <button
        className="w-80 border-2 border-white text-white font-bold py-3 rounded-md text-lg tracking-widest uppercase active:scale-95 transition mt-6 bg-transparent"
        style={{
          letterSpacing: ".13em",
        }}
      >
        Share
      </button>
    </>
  );
};

export default ResultPage;
