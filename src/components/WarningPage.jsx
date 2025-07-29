// components/WarningPage.jsx
import React, { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import { ChevronLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const WarningPage = ({ 
  onBack, 
  warningType = "limit", 
  errorData = null,
  user = null 
}) => {
  // Get warning content based on type and error data
  const getWarningContent = () => {
    if (warningType === "user_limit" && errorData?.details) {
      return {
        title: "GENERATION LIMIT REACHED",
        subtitle: "Personal limit exceeded",
        message: `You have reached your personal generation limit (${errorData.details.used}/${errorData.details.limit}). Please try again later or contact support to increase your limit.`,
        icon: "🚫",
        buttonText: "TRY AGAIN LATER"
      };
    }
    
    if (warningType === "api_limit" && errorData?.details) {
      const service = errorData.details.service?.toUpperCase() || "API";
      return {
        title: "SERVICE LIMIT REACHED",
        subtitle: `${service} temporarily unavailable`,
        message: `Our ${service} service has reached its usage limit (${errorData.details.totalUsed}/${errorData.details.limit}). This helps us maintain quality service for all users.`,
        icon: "⚠️",
        buttonText: "TRY AGAIN LATER"
      };
    }
    
    // Default limit reached content
    return {
      title: "LIMIT REACHED",
      subtitle: "Service temporarily unavailable",
      message: "We know you're enthusiastic about creating with our AI platform! Currently, you can only create one AI song.",
      icon: "🎵",
      buttonText: "GO BACK"
    };
  };

  const content = getWarningContent();

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-6 py-8">
      {/* Header with Logo */}
      <div className="w-full flex items-center justify-between mb-12">
        <button 
          className="p-2 rounded-full hover:bg-white/10 transition-colors" 
          onClick={onBack} 
          aria-label="Back"
        >
          <ChevronLeftIcon className="w-6 h-6 text-white" />
        </button>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="text-center space-y-6 max-w-xs">
        {/* Title */}
        <h1 className="text-white text-xl font-black tracking-[0.2em] leading-tight">
          {content.title}
        </h1>

        {/* Subtitle */}
        <p className="text-white/80 text-sm font-medium">
          {content.subtitle}
        </p>

        {/* Message */}
        <p className="text-white/70 text-sm leading-relaxed">
          {content.message}
        </p>
      </div>
    </div>
  );
};

export default WarningPage;