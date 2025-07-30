import React from "react";
import logo from "../assets/logo.png";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

const SongDescription = ({ 
  user, 
  form, 
  setForm, 
  onGenerate, 
  onBack, 
  isGenerating = false,
  onLogout,
}) => {
  // 🔥 ENHANCED: Disable button during generation or when form is invalid
  const isDisabled = !form.title.trim() || !form.theme.trim() || isGenerating;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔥 ENHANCED: Handle generate button click with validation
  const handleGenerateClick = () => {
    // Prevent multiple clicks during generation
    if (isGenerating) {
      return;
    }

    // Additional validation
    if (!form.title.trim()) {
      toast.error("Please enter a song title");
      return;
    }

    if (!form.theme.trim()) {
      toast.error("Please describe your theme song");
      return;
    }

    // Call the generate function
    onGenerate(form);
  };

  const handleLogout = () => {
    onLogout();
  };
  return (
    <>
      {/* Chevron + Logo */}
      <div className="w-full flex items-center justify-between my-6 px-4">
        <div className="w-16 flex justify-start">
          <button 
            onClick={onBack} 
            aria-label="Back"
            disabled={isGenerating}
            className={`${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
          >
            <ChevronLeftIcon className="w-7 h-7 text-white" />
          </button>
        </div>
        
        <div className="flex-1 flex justify-center">
          <img
            src={logo}
            alt="Acer Intel"
            className="w-48 md:w-56"
            draggable="false"
            style={{ objectFit: "contain" }}
          />
        </div>
        
        <div className="w-16 flex justify-end">
          <button
            onClick={handleLogout}
            className="text-white text-sm font-medium hover:text-white/80 transition-colors hover:bg-white/10 p-2 rounded-lg" 
            title={`Logout ${user.name}`}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Form Section */}
      <div className="w-full max-w-[390px] px-6 flex-1 flex flex-col">
        <div className="mb-4">
          <h2 className="text-white font-extrabold text-base tracking-widest uppercase mb-1">
            Hi, {user.name ? user.name.toUpperCase() : "ACERIAN"}!
          </h2>
          <div className="text-white text-xs font-medium tracking-wide mb-6 uppercase">
            Create your AI song now!
          </div>
        </div>

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          SONG TITLE
        </label>
        <input
          name="title"
          placeholder="Enter song title"
          value={form.title}
          onChange={handleChange}
          disabled={isGenerating} // 🔥 Disable input during generation
          className={`w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-4 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70 ${
            isGenerating ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          autoComplete="off"
        />

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          DESCRIBE YOUR THEME SONG
        </label>
        <textarea
          name="theme"
          placeholder="Write song description..."
          value={form.theme}
          onChange={handleChange}
          disabled={isGenerating} // 🔥 Disable textarea during generation
          className={`w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition resize-none placeholder:text-white/70 ${
            isGenerating ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          rows={10}
        />

        {/* 🔥 ENHANCED: Show generation status */}
        {isGenerating && (
          <div className="w-full mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-white text-sm font-medium">
                Processing your request...
              </span>
            </div>
            <p className="text-white/80 text-xs text-center mt-2">
              Please wait while we generate your song
            </p>
          </div>
        )}

        <button
          onClick={handleGenerateClick}
          className={`w-full py-3 rounded-md font-bold text-lg tracking-widest uppercase transition mt-6 border-2 ${
            isDisabled
              ? "bg-[#272b84] border-[#272b84] text-white opacity-60 cursor-not-allowed"
              : "bg-white/0 border-white text-white hover:bg-white/10 active:bg-white/20"
          }`}
          disabled={isDisabled}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Generating...</span>
            </span>
          ) : (
            "Generate Song"
          )}
        </button>
      </div>
    </>
  );
};

export default SongDescription;