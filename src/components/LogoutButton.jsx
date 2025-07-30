// components/LogoutButton.jsx
import React from 'react';

const LogoutButton = ({ onLogout, user }) => {
  const handleLogout = () => {
    const confirmed = window.confirm(`Are you sure you want to logout, ${user?.name || 'User'}?`);
    if (confirmed) {
      onLogout();
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="fixed top-4 right-4 z-50 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all duration-200 shadow-lg text-sm font-medium"
      title={`Logout ${user?.name || 'User'}`}
    >
      Logout
    </button>
  );
};

export default LogoutButton;