import React, { useState } from "react";
import logo from "../assets/logo.png";
import eventLogo from "../assets/event_logo.png";

const SignInPage = ({ onSubmit }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <>
      {/* Logo atas */}
      <div className="w-full flex flex-col items-center p-6">
        <img
          src={logo}
          alt="Acer Intel"
          className="w-40 md:w-44"
          draggable="false"
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Event Logo */}
      <div className="w-full flex flex-col items-center p-6">
        <img
          src={eventLogo}
          alt="Acer Day 2025"
          className="w-44 mb-3"
          draggable="false"
          style={{ objectFit: "contain" }}
        />
        <span className="text-white text-xs -mt-2 mb-4 tracking-wide">
          Break A Limit
        </span>
      </div>

      {/* Form Section */}
      <div className="w-full px-6 mt-2">
        <h2 className="text-white font-extrabold text-lg mb-1 tracking-wider">
          HELLO ACERIAN!
        </h2>
        <div className="text-white text-xs font-medium mb-5 tracking-wide uppercase">
          Please fill the information below!
        </div>

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          NAME
        </label>
        <input
          name="name"
          placeholder="John Smith"
          value={form.name}
          onChange={handleChange}
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-3 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
          autoComplete="off"
        />

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          EMAIL
        </label>
        <input
          name="email"
          placeholder="Johnsmith124@gmail.com"
          value={form.email}
          onChange={handleChange}
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-3 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
          autoComplete="off"
        />

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          PHONE NUMBER
        </label>
        <input
          name="phone"
          placeholder="085123456789"
          value={form.phone}
          onChange={handleChange}
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-6 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
          autoComplete="off"
        />

        <button
          onClick={() => onSubmit(form)}
          className="w-full border-2 border-white text-white font-bold py-2 mt-6 rounded-md text-lg tracking-widest active:scale-95 transition mb-2 bg-transparent hover:text-black"
        >
          SUBMIT
        </button>
      </div>
    </>
  );
};

export default SignInPage;
