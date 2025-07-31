// App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import StartScreen from "./components/StartScreen";
import SignUpPage from "./components/SignUpPage";
import SignInPage from "./components/SignInPage";
import SongDescription from "./components/SongDescription";
import LoadingPage from "./components/LoadingPage";
import ResultPage from "./components/ResultPage";
import ApiUsagePage from "./components/ApiUsagePage";
import WarningPage from "./components/WarningPage";
import ProtectedRoute from "./components/ProtectedRoute";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [user, setUser] = useState(() => {
    const userData = sessionStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });
  const [song, setSong] = useState(() => {
    const songData = sessionStorage.getItem("song");
    return songData ? JSON.parse(songData) : {};
  });
  const [songForm, setSongForm] = useState(() => {
    const formData = sessionStorage.getItem("songForm");
    return formData ? JSON.parse(formData) : { title: "", theme: "" };
  });
  const [warningData, setWarningData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // 🔥 Add logout state to force StartScreen
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Save states to sessionStorage
  useEffect(() => {
    if (user) sessionStorage.setItem("user", JSON.stringify(user));
  }, [user]);
  
  useEffect(() => {
    sessionStorage.setItem("song", JSON.stringify(song));
  }, [song]);
  
  useEffect(() => {
    sessionStorage.setItem("songForm", JSON.stringify(songForm));
  }, [songForm]);

  // 🔥 FIXED: Handle initial page load for HashRouter
  useEffect(() => {
    console.log('🔍 Current location:', location.pathname);
    console.log('👤 User state:', !!user);
    console.log('🚪 Is logged out:', isLoggedOut);
    console.log('👋 Has visited:', !!sessionStorage.getItem("hasVisited"));
    
    const currentPath = location.pathname;
    const hasVisited = sessionStorage.getItem("hasVisited");

    if (isGenerating) return;
    
    // 🔥 PRIORITY 1: If user just logged out, stay on StartScreen
    if (isLoggedOut) {
      console.log('🔥 User logged out, staying on StartScreen');
      if (currentPath !== '/') {
        navigate('/', { replace: true });
      }
      return;
    }
    
    // 🔥 PRIORITY 2: If first-time visitor and no user, show StartScreen
    if (currentPath === "/" && !hasVisited && !user && !isLoggedOut) {
      return; // Stay on home to show StartScreen
    }
    
    // 🔥 PRIORITY 3: Protect routes that require authentication
    if (!user && ['/description', '/loading', '/result', '/warning'].includes(currentPath)) {
      navigate('/signin', { replace: true });
      return;
    }
    
    // 🔥 PRIORITY 4: If user exists and on home, go to description
    if (user && currentPath === '/' && hasVisited) {
      navigate('/description', { replace: true });
      return;
    }
    
    // 🔥 PRIORITY 5: If user exists but on signin/signup, go to description
    if (user && ['/signin', '/signup'].includes(currentPath)) {
      navigate('/description', { replace: true });
      return;
    }
  }, [user, location.pathname, navigate, isLoggedOut]);

  const handleRegister = async (userData) => {
    try {
      const res = await axios.post(`${backendUrl}/register`, userData);
      setUser(res.data.result);
      setIsLoggedOut(false); // Reset logout state
      toast.success("Registration successful!");
      navigate('/description');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to register user");
      }
    }
  };

  const handleSignIn = async (userData, redirectTo = '/description') => {
    try {
      const res = await axios.post(`${backendUrl}/signin`, userData);
      setUser(res.data.result);
      setIsLoggedOut(false); // Reset logout state
      if (res.data.result.token) {
        sessionStorage.setItem("token", res.data.result.token);
      }
      toast.success("Sign in successful!");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to sign in");
      }
    }
  };

  // 🔥 ENHANCED: Logout function with forced StartScreen
  const handleLogout = () => {
    console.log('🚪 Logout initiated');
    
    // Clear all states
    setUser(null);
    setSong({});
    setSongForm({ title: "", theme: "" });
    setIsGenerating(false);
    setWarningData(null);
    
    // 🔥 CRITICAL: Set logout flag FIRST
    setIsLoggedOut(true);
    
    // Clear sessionStorage (including hasVisited)
    sessionStorage.clear();
    
    console.log('🧹 Session cleared, isLoggedOut set to true');
    
    // Show success message
    toast.success("Logged out successfully!");
    
    // 🔥 Force navigation to home (will show StartScreen due to isLoggedOut flag)
    navigate('/', { replace: true });
    
    console.log('🏠 Navigated to home route');
  };

  const handleGenerateSong = async (songData) => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      navigate('/loading');
      
      const payload = { ...songData, user_id: user.id };
      const res = await axios.post(`${backendUrl}/song`, payload);
      
      setSong(res.data.song);
      setSongForm({ title: "", theme: "" });
      sessionStorage.removeItem("songForm");
      
      if (res.data.cost_breakdown) {
        toast.success(`Song generated successfully! Total cost: $${res.data.cost_breakdown.total_cost}`);
      } else {
        toast.success("Song generated successfully!");
      }
      
      setTimeout(() => navigate('/result'), 3000);
      
    } catch (err) {
      console.error("Song generation error:", err);
      
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        
        if (err.response.status === 400 && errorData.error === "Content not approved by moderation") {
          toast.error(
            errorData.message || "Konten yang Anda masukkan tidak dapat diproses", 
            { autoClose: 4000, hideProgressBar: false }
          );
          
          if (errorData.moderation && errorData.moderation.reason) {
            setTimeout(() => {
              toast.warn(`Reason: ${errorData.moderation.reason}`, { autoClose: 3000 });
            }, 500);
          }
          
          setTimeout(() => navigate('/description'), 1000);
          return;
        }
        
        else if (err.response.status === 429) {
          setWarningData({
            type: "user_limit",
            error: errorData,
            timestamp: Date.now()
          });
          setTimeout(() => navigate('/warning'), 1000);
          return;
        }
        
        else if (err.response.status === 503) {
          setWarningData({
            type: "api_limit", 
            error: errorData,
            timestamp: Date.now()
          });
          setTimeout(() => navigate('/warning'), 1000);
          return;
        }
        
        else if (err.response.status === 400) {
          toast.error(errorData.error || "Invalid input. Please check your data.");
          navigate('/description');
          return;
        }
        
        else if (errorData.message) {
          toast.error(errorData.message);
        } else if (errorData.error) {
          toast.error(errorData.error);
        } else {
          toast.error("Failed to generate song. Please try again.");
        }
      } else if (err.message) {
        toast.error(`Network error: ${err.message}`);
      } else {
        toast.error("Failed to generate song. Please check your connection.");
      }
      
      setTimeout(() => navigate('/description'), 2000);
      
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackFromResult = () => {
    setSong({});
    sessionStorage.removeItem("song");
    navigate('/description');
  };

  const handleBackFromApiUsage = () => {
    if (user) {
      navigate('/description');
    } else {
      navigate('/signin');
    }
  };

  const handleBackFromWarning = () => {
    setWarningData(null);
    if (user) {
      navigate('/description');
    } else {
      navigate('/signin');
    }
  };

  // 🔥 ENHANCED: StartScreen completion
  const handleStartComplete = () => {
    console.log('🚀 StartScreen completed');
    sessionStorage.setItem("hasVisited", "true");
    setIsLoggedOut(false); // Reset logout state
    navigate('/signin');
  };

  // 🔥 ENHANCED: Determine what to show on home route
  const getHomeElement = () => {
    const hasVisited = sessionStorage.getItem("hasVisited");
    
    console.log('🏠 Determining home element:', {
      isLoggedOut,
      hasVisited: !!hasVisited,
      user: !!user
    });
    
    // 🔥 Show StartScreen if logged out OR first-time visitor
    if (isLoggedOut || (!hasVisited && !user)) {
      console.log('📱 Showing StartScreen');
      return <StartScreen onStart={handleStartComplete} />;
    }
    
    // Show user dashboard if logged in
    if (user) {
      console.log('👤 Showing SongDescription for logged-in user');
      return (
        <SongDescription
          user={user}
          form={songForm}
          setForm={setSongForm}
          onGenerate={handleGenerateSong}
          onLogout={handleLogout}
          onApiUsage={() => navigate('/api-call')}
          isGenerating={isGenerating}
        />
      );
    }
    
    // Default to signin for visitors who have been here before
    console.log('🔑 Showing SignInPage for returning visitor');
    return (
      <SignInPage 
        onSubmit={handleSignIn} 
        onGoToSignUp={() => navigate('/signup')}
      />
    );
  };

  return (
    <>
      {/* 🔥 FULL SCREEN BACKGROUND - Only visible on desktop */}
      <div
        className="fixed inset-0 w-full h-full"
        style={{
          background: "linear-gradient(180deg, #C330EB 0%, #191BE0 100%)",
          zIndex: -1
        }}
      />
      
      {/* 🔥 MAIN CONTAINER - Centered with max width */}
      <div
        className="w-full min-h-screen flex flex-col items-center relative"
        style={{
          background: "linear-gradient(180deg, #C330EB 0%, #191BE0 100%)",
          maxWidth: 430,
          margin: "0 auto",
        }}
      >
        <Routes>
          <Route 
            path="/" 
            element={getHomeElement()} 
          />

          <Route 
            path="/signup" 
            element={
              <SignUpPage 
                onSubmit={handleRegister} 
                onGoToSignIn={() => navigate('/signin')}
              />
            } 
          />
          
          <Route 
            path="/signin" 
            element={
              <SignInPage 
                onSubmit={handleSignIn} 
                onGoToSignUp={() => navigate('/signup')}
              />
            } 
          />

          <Route 
            path="/api-call" 
            element={<ApiUsagePage onBack={handleBackFromApiUsage} />} 
          />

          <Route 
            path="/description" 
            element={
              <ProtectedRoute user={user}>
                <SongDescription
                  user={user}
                  form={songForm}
                  setForm={setSongForm}
                  onGenerate={handleGenerateSong}
                  onLogout={handleLogout}
                  onApiUsage={() => navigate('/api-call')}
                  isGenerating={isGenerating}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/loading" 
            element={
              <ProtectedRoute user={user}>
                <LoadingPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/result" 
            element={
              <ProtectedRoute user={user}>
                <ResultPage 
                  song={song} 
                  user={user} 
                  onBack={handleBackFromResult}
                  onLogout={handleLogout}
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/warning" 
            element={
              <ProtectedRoute user={user}>
                {warningData && (
                  <WarningPage 
                    onBack={handleBackFromWarning}
                    warningType={warningData.type}
                    errorData={warningData.error}
                    user={user}
                  />
                )}
              </ProtectedRoute>
            } 
          />

          <Route 
            path="*" 
            element={
              user ? (
                <SongDescription
                  user={user}
                  form={songForm}
                  setForm={setSongForm}
                  onGenerate={handleGenerateSong}
                  onLogout={handleLogout}
                  onApiUsage={() => navigate('/api-call')}
                  isGenerating={isGenerating}
                />
              ) : (
                <SignInPage 
                  onSubmit={handleSignIn} 
                  onGoToSignUp={() => navigate('/signup')}
                />
              )
            } 
          />
        </Routes>
        
        <ToastContainer 
          autoClose={3000} 
          position="top-center" 
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          style={{
            fontSize: '14px',
            fontWeight: '500'
          }}
          toastStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1f2937',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
          }}
        />
      </div>
    </>
  );
}

export default App;