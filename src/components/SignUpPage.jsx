import React, { useState } from "react";
import logo from "../assets/logo.png";
import eventLogo from "../assets/event_logo.png";

const SignUpPage = ({ onSubmit, onGoToSignIn }) => {
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    phone: "",
    password: "",
    social_media_type: "",
    social_media_username: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    // Validation
    if (!form.name || !form.email || !form.phone || !form.password) {
      alert("Please fill all required fields");
      return;
    }
    
    if (form.social_media_type && !form.social_media_username) {
      alert("Please enter social media username");
      return;
    }
    
    if (!form.social_media_type && form.social_media_username) {
      alert("Please select social media platform");
      return;
    }

    onSubmit(form);
  };

  return (
    <>
      <div className="w-full flex flex-col items-center p-6">
        <img
          src={logo}
          alt="Acer Intel"
          className="w-40 md:w-44"
          draggable="false"
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Form Section */}
      <div className="w-full px-6">
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
          required
        />

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          EMAIL
        </label>
        <input
          name="email"
          type="email"
          placeholder="Johnsmith124@gmail.com"
          value={form.email}
          onChange={handleChange}
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-3 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
          autoComplete="off"
          required
        />

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          PHONE NUMBER
        </label>
        <input
          name="phone"
          type="tel"
          placeholder="085123456789"
          value={form.phone}
          onChange={handleChange}
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-3 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
          autoComplete="off"
          required
        />

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          SOCIAL MEDIA USERNAME
        </label>
        <div className="mb-3 space-y-2 sm:space-y-0">
          <select
            name="social_media_type"
            value={form.social_media_type}
            onChange={handleChange}
            className="w-full sm:hidden border-2 border-white bg-transparent rounded-md text-white px-4 py-2 outline-none font-semibold text-sm focus:ring-2 focus:ring-white transition"
          >
            <option value="" className="bg-purple-600">Select Social Media Platform</option>
            <option value="instagram" className="bg-purple-600">Instagram</option>
            <option value="tiktok" className="bg-purple-600">TikTok</option>
          </select>
          
          <div className="hidden sm:flex gap-2">
            <select
              name="social_media_type"
              value={form.social_media_type}
              onChange={handleChange}
              className="w-32 border-2 border-white bg-transparent rounded-md text-white px-2 py-2 outline-none font-semibold text-sm focus:ring-2 focus:ring-white transition"
            >
              <option value="" className="bg-purple-600">Select</option>
              <option value="instagram" className="bg-purple-600">Instagram</option>
              <option value="tiktok" className="bg-purple-600">TikTok</option>
            </select>
            <input
              name="social_media_username"
              placeholder="@johnsmith"
              value={form.social_media_username}
              onChange={handleChange}
              className="flex-1 border-2 border-white bg-transparent rounded-md text-white px-4 py-2 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
              autoComplete="off"
            />
          </div>
          
          <input
            name="social_media_username"
            placeholder="@johnsmith"
            value={form.social_media_username}
            onChange={handleChange}
            className="w-full sm:hidden border-2 border-white bg-transparent rounded-md text-white px-4 py-2 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
            autoComplete="off"
          />
        </div>

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          CREATE PASSWORD
        </label>
        <input
          name="password"
          type="password"
          placeholder="••••••"
          value={form.password}
          onChange={handleChange}
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-4 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
          autoComplete="off"
          minLength="6"
          required
        />

        <button
          onClick={handleSubmit}
          className="w-full border-2 border-white text-white font-bold py-2 rounded-md text-lg tracking-widest active:scale-95 transition mb-4 bg-transparent hover:bg-white hover:text-purple-600"
        >
          SUBMIT
        </button>

        {/* Sign In Link */}
        <div className="text-center text-white text-sm mb-4">
          Already have an account?{" "}
          <button
            onClick={onGoToSignIn}
            className="underline font-semibold hover:text-gray-200 transition"
          >
            Sign In
          </button>
        </div>
      </div>
    </>
  );
};

export default SignUpPage;