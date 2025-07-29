import React, { useState } from "react";
import logo from "../assets/logo.png";

const SignInPage = ({ onSubmit, onGoToSignUp }) => {
  const [form, setForm] = useState({ 
    email: "", 
    password: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    // Validation
    if (!form.email || !form.password) {
      alert("Please fill all required fields");
      return;
    }

    onSubmit(form);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
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
      <div className="w-full px-6 mt-8">
        <h2 className="text-white font-extrabold text-lg mb-1 tracking-wider">
          HELLO!
        </h2>
        <div className="text-white text-xs font-medium mb-6 tracking-wide uppercase">
          Sign in to your account
        </div>

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          EMAIL
        </label>
        <input
          name="email"
          type="email"
          placeholder="Johnsmith124@gmail.com"
          value={form.email}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-4 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
          autoComplete="email"
          required
        />

        <label className="text-xs text-white font-bold mb-1 block mt-1">
          ENTER PASSWORD
        </label>
        <input
          name="password"
          type="password"
          placeholder="••••••"
          value={form.password}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          className="w-full border-2 border-white bg-transparent rounded-md text-white px-4 py-2 mb-2 outline-none font-semibold tracking-wider focus:ring-2 focus:ring-white transition placeholder:text-white/70"
          autoComplete="current-password"
          required
        />

        <button
          onClick={handleSubmit}
          className="mt-5 w-full border-2 border-white text-white font-bold py-2 rounded-md text-lg tracking-widest active:scale-95 transition mb-4 bg-transparent hover:bg-white hover:text-purple-600"
        >
          SIGN IN
        </button>

        {/* Sign Up Link */}
        <div className="text-center text-white text-sm mb-4">
          Don't have an account?{" "}
          <button
            onClick={onGoToSignUp}
            className="underline font-semibold hover:text-gray-200 transition"
          >
            Register
          </button>
        </div>
      </div>
    </>
  );
};

export default SignInPage;