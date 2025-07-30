// components/ApiUsagePage.jsx
import React, { useState, useEffect } from "react";
import { ChevronLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import logo from "../assets/logo.png";
import axios from "axios";

const ApiUsagePage = ({ onBack }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${backendUrl}/song/global-stats`);
      setStats(response.data.global_stats);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load API usage statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date ? date.toLocaleTimeString() : '';
  };

  const formatCost = (cost) => {
    return `$${parseFloat(cost).toFixed(4)}`;
  };

  const getStatusColor = (percentage) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 75) return 'bg-yellow-500';
    if (percentage < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusText = (canUse, percentage) => {
    if (!canUse) return 'LIMIT EXCEEDED';
    if (percentage < 50) return 'HEALTHY';
    if (percentage < 75) return 'MODERATE';
    if (percentage < 90) return 'HIGH';
    return 'CRITICAL';
  };

  if (loading && !stats) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center px-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p className="text-white text-lg">Loading API statistics...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center px-6 py-6">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8">
        <button 
          className="p-2 hover:bg-white/10 rounded-lg transition-colors" 
          onClick={onBack}
          aria-label="Back"
        >
          <ChevronLeftIcon className="w-6 h-6 text-white" />
        </button>
        <img
          src={logo}
          alt="Acer Intel"
          className="w-40"
          draggable="false"
        />
        <button 
          className="p-2 hover:bg-white/10 rounded-lg transition-colors" 
          onClick={fetchStats}
          disabled={loading}
          aria-label="Refresh"
        >
          <ArrowPathIcon className={`w-6 h-6 text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Page Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">API Usage Monitor</h1>
        <p className="text-white/80 text-sm">
          Real-time monitoring of Lyric ChatGPT and Song API usage
        </p>
        {lastUpdated && (
          <p className="text-white/60 text-xs mt-2">
            Last updated: {formatTime(lastUpdated)}
          </p>
        )}
      </div>

      {error && (
        <div className="w-full max-w-md bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-200 text-center">{error}</p>
          <button 
            onClick={fetchStats}
            className="w-full mt-3 bg-red-500/30 text-white py-2 rounded-lg hover:bg-red-500/40 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {stats && (
        <div className="w-full max-w-md space-y-6">
          {/* ChatGPT Usage */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Lyric ChatGPT API</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                stats.api_usage.chatgpt.used / stats.api_usage.chatgpt.limit > 0.9 
                  ? 'bg-red-500/20 text-red-200' 
                  : stats.api_usage.chatgpt.used / stats.api_usage.chatgpt.limit > 0.75
                  ? 'bg-yellow-500/20 text-yellow-200'
                  : 'bg-green-500/20 text-green-200'
              }`}>
                {getStatusText(
                  stats.system_health.can_generate, 
                  parseFloat(stats.api_usage.chatgpt.usage_percentage)
                )}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-white/80 mb-2">
                <span>Usage</span>
                <span>{stats.api_usage.chatgpt.usage_percentage}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getStatusColor(parseFloat(stats.api_usage.chatgpt.usage_percentage))}`}
                  style={{ width: `${Math.min(parseFloat(stats.api_usage.chatgpt.usage_percentage), 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/90">
                <span>Used:</span>
                <span className="font-mono">{stats.api_usage.chatgpt.used}</span>
              </div>
              <div className="flex justify-between text-white/90">
                <span>Limit:</span>
                <span className="font-mono">{stats.api_usage.chatgpt.limit}</span>
              </div>
              <div className="flex justify-between text-white/90">
                <span>Remaining:</span>
                <span className="font-mono text-green-300">{stats.api_usage.chatgpt.remaining}</span>
              </div>
              {/* <div className="flex justify-between text-white/90">
                <span>Total Cost:</span>
                <span className="font-mono text-yellow-300">{formatCost(stats.api_usage.chatgpt.total_cost)}</span>
              </div> */}
            </div>
          </div>

          {/* Mureka Usage */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Song API</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                stats.api_usage.mureka.used / stats.api_usage.mureka.limit > 0.9 
                  ? 'bg-red-500/20 text-red-200' 
                  : stats.api_usage.mureka.used / stats.api_usage.mureka.limit > 0.75
                  ? 'bg-yellow-500/20 text-yellow-200'
                  : 'bg-green-500/20 text-green-200'
              }`}>
                {getStatusText(
                  stats.system_health.can_generate, 
                  parseFloat(stats.api_usage.mureka.usage_percentage)
                )}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-white/80 mb-2">
                <span>Usage</span>
                <span>{stats.api_usage.mureka.usage_percentage}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${getStatusColor(parseFloat(stats.api_usage.mureka.usage_percentage))}`}
                  style={{ width: `${Math.min(parseFloat(stats.api_usage.mureka.usage_percentage), 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/90">
                <span>Used:</span>
                <span className="font-mono">{stats.api_usage.mureka.used}</span>
              </div>
              <div className="flex justify-between text-white/90">
                <span>Limit:</span>
                <span className="font-mono">{stats.api_usage.mureka.limit}</span>
              </div>
              <div className="flex justify-between text-white/90">
                <span>Remaining:</span>
                <span className="font-mono text-green-300">{stats.api_usage.mureka.remaining}</span>
              </div>
              {/* <div className="flex justify-between text-white/90">
                <span>Total Cost:</span>
                <span className="font-mono text-yellow-300">{formatCost(stats.api_usage.mureka.total_cost)}</span>
              </div> */}
            </div>
          </div>

          {/* Moderation Stats */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white">Song API</h2>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/90">
                    <span>Moderation Usage:</span>
                    <span className="font-mono">{stats.api_usage.moderation.used || 0}</span>
                </div>
                {/* <div className="flex justify-between text-white/90">
                    <span>Total Cost:</span>
                    <span className="font-mono text-yellow-300">{formatCost(stats.api_usage.moderation.total_cost || 0)}</span>
                </div> */}
            </div>
          </div>

          {/* User Statistics */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">User Statistics</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-white/90">
                <span>Total Users:</span>
                <span className="font-mono">{stats.user_generations.total_users_registered}</span>
              </div>
              <div className="flex justify-between text-white/90">
                <span>Active Users:</span>
                <span className="font-mono">{stats.user_generations.active_users}</span>
              </div>
              <div className="flex justify-between text-white/90">
                <span>Total Generations:</span>
                <span className="font-mono">{stats.user_generations.total_generations}</span>
              </div>
              <div className="flex justify-between text-white/90">
                <span>Avg per User:</span>
                <span className="font-mono">{stats.user_generations.average_generations_per_user}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiUsagePage;