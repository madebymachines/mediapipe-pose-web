import React from "react";
import logo from "../assets/logo.png";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

const SongDescription = ({ user, form, setForm, onGenerate, onBack }) => {
  const isDisabled = !form.title.trim() || !form.theme.trim();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <>
      {/* Chevron + Logo */}
      <div className="w-full flex items-center justify-between my-6 px-4">
        <button onClick={onBack} aria-label="Back">
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
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-4 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
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
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-7 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition resize-none placeholder:text-white/70"
          rows={10}
        />

        <button
          onClick={() => onGenerate(form)}
          className={`w-full py-3 rounded-md font-bold text-lg tracking-widest uppercase transition mt-6 border-2
            ${
              isDisabled
                ? "bg-[#272b84] border-[#272b84] text-white opacity-60 cursor-not-allowed"
                : "bg-white/0 border-white text-white hover:bg-white/10"
            }`}
          disabled={isDisabled}
        >
          Generate Song
        </button>
      </div>
    </>
  );
};

export default SongDescription;
