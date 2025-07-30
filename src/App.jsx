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

  // 🔥 FIXED: Handle initial page load with proper StartScreen logic
  useEffect(() => {
    const currentPath = location.pathname;
    const hasVisited = sessionStorage.getItem("hasVisited");
    
    // Show StartScreen only on first visit to root path
    if (currentPath === "/" && !hasVisited && !user) {
      // StartScreen will be shown by the Route
      return;
    }
    
    // If user is not logged in and trying to access protected routes
    if (!user && ['/description', '/loading', '/result'].includes(currentPath)) {
      navigate('/signin', { replace: true });
      return;
    }
    
    // If user is logged in and on root path, redirect to description
    if (user && currentPath === '/') {
      navigate('/description', { replace: true });
      return;
    }
    
    // If user exists but on signin/signup, redirect to description
    if (user && ['/signin', '/signup'].includes(currentPath)) {
      navigate('/description', { replace: true });
      return;
    }
  }, [user, location.pathname, navigate]);

  const handleRegister = async (userData) => {
    try {
      const res = await axios.post(`${backendUrl}/register`, userData);
      setUser(res.data.result);
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

  const handleLogout = () => {
    setUser(null);
    setSong({});
    setSongForm({ title: "", theme: "" });
    setIsGenerating(false);
    sessionStorage.clear();
    navigate('/signin');
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

  // 🔥 NEW: Handle StartScreen completion
  const handleStartComplete = () => {
    sessionStorage.setItem("hasVisited", "true");
    navigate('/signin');
  };

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center"
      style={{
        background: "linear-gradient(180deg, #C330EB 0%, #191BE0 100%)",
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      <Routes>
        {/* 🔥 FIXED: StartScreen Route - Only for first-time visitors */}
        <Route 
          path="/" 
          element={
            !sessionStorage.getItem("hasVisited") && !user ? (
              <StartScreen onStart={handleStartComplete} />
            ) : user ? (
              <SongDescription
                user={user}
                form={songForm}
                setForm={setSongForm}
                onGenerate={handleGenerateSong}
                onBack={handleLogout}
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

        {/* Public Routes */}
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

        {/* 🔥 PUBLIC API-CALL ROUTE */}
        <Route 
          path="/api-call" 
          element={<ApiUsagePage onBack={handleBackFromApiUsage} />} 
        />

        {/* Protected Routes */}
        <Route 
          path="/description" 
          element={
            <ProtectedRoute user={user}>
              <SongDescription
                user={user}
                form={songForm}
                setForm={setSongForm}
                onGenerate={handleGenerateSong}
                onBack={handleLogout}
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
              <ResultPage song={song} user={user} onBack={handleBackFromResult} />
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

        {/* 🔥 CATCH-ALL: Handle any other routes */}
        <Route 
          path="*" 
          element={
            user ? (
              <SongDescription
                user={user}
                form={songForm}
                setForm={setSongForm}
                onGenerate={handleGenerateSong}
                onBack={handleLogout}
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
  );
}

export default App;