// App.jsx
import React, { useState, useEffect } from "react";
import StartScreen from "./components/StartScreen";
import SignUpPage from "./components/SignUpPage";
import SignInPage from "./components/SignInPage";
import SongDescription from "./components/SongDescription";
import LoadingPage from "./components/LoadingPage";
import ResultPage from "./components/ResultPage";
import ApiUsagePage from "./components/ApiUsagePage";
import WarningPage from "./components/WarningPage"; 
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [page, setPage] = useState(
    () => sessionStorage.getItem("page") || "start"
  );
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
  // 🔥 NEW: Add loading state to prevent multiple requests
  const [isGenerating, setIsGenerating] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    sessionStorage.setItem("page", page);
  }, [page]);
  useEffect(() => {
    if (user) sessionStorage.setItem("user", JSON.stringify(user));
  }, [user]);
  useEffect(() => {
    sessionStorage.setItem("song", JSON.stringify(song));
  }, [song]);
  useEffect(() => {
    sessionStorage.setItem("songForm", JSON.stringify(songForm));
  }, [songForm]);

  // Check for /api-call route on mount
  useEffect(() => {
    if (window.location.pathname === '/api-call') {
      setPage('api-usage');
    }
  }, []);

  // Update URL when page changes
  useEffect(() => {
    if (page === 'api-usage') {
      window.history.pushState({}, '', '/api-call');
    } else {
      window.history.pushState({}, '', '/');
    }
  }, [page]);

  const goTo = (p) => setPage(p);

  const handleRegister = async (userData) => {
    try {
      const res = await axios.post(`${backendUrl}/register`, userData);
      setUser(res.data.result);
      toast.success("Registration successful!");
      goTo("description");
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to register user");
      }
    }
  };

  const handleSignIn = async (userData) => {
    try {
      const res = await axios.post(`${backendUrl}/signin`, userData);
      setUser(res.data.result);
      // Store token if needed
      if (res.data.result.token) {
        sessionStorage.setItem("token", res.data.result.token);
      }
      toast.success("Sign in successful!");
      goTo("description");
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to sign in");
      }
    }
  };

  // 🔥 ENHANCED: Handle song generation with detailed error handling
  const handleGenerateSong = async (songData) => {
    // Prevent multiple requests
    if (isGenerating) {
      return;
    }

    try {
      setIsGenerating(true);
      goTo("loading");
      
      const payload = { ...songData, user_id: user.id };
      const res = await axios.post(`${backendUrl}/song`, payload);
      
      setSong(res.data.song);
      setSongForm({ title: "", theme: "" });
      sessionStorage.removeItem("songForm");
      
      // Show success message if there's cost info
      if (res.data.cost_breakdown) {
        toast.success(`Song generated successfully! Total cost: $${res.data.cost_breakdown.total_cost}`);
      } else {
        toast.success("Song generated successfully!");
      }
      
      setTimeout(() => goTo("result"), 3000);
      
    } catch (err) {
      console.error("Song generation error:", err);
      
      // Handle different types of errors
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        
        // 🔥 MODERATION ERROR (400) - Content not approved
        if (err.response.status === 400 && errorData.error === "Content not approved by moderation") {
          // Show moderation error message
          toast.error(
            errorData.message || "Konten yang Anda masukkan tidak dapat diproses", 
            {
              autoClose: 4000, // Show longer for moderation errors
              hideProgressBar: false,
            }
          );
          
          // Optional: Show additional moderation details
          if (errorData.moderation && errorData.moderation.reason) {
            setTimeout(() => {
              toast.warn(`Reason: ${errorData.moderation.reason}`, {
                autoClose: 3000,
              });
            }, 500);
          }
          
          // 🔥 GO BACK TO SONG DESCRIPTION PAGE
          setTimeout(() => {
            goTo("description");
          }, 1000); // Small delay to show the toast message
          
          return; // Early return to prevent other error handling
        }
        
        // 🔥 USER LIMIT ERROR (429) - Redirect to Warning Page
        else if (err.response.status === 429) {
          console.log("User limit exceeded, redirecting to warning page");
          
          setWarningData({
            type: "user_limit",
            error: errorData,
            timestamp: Date.now()
          });
          
          // Small delay to show any loading state, then redirect
          setTimeout(() => {
            goTo("warning");
          }, 1000);
          
          return;
        }
        
        // 🔥 API LIMIT ERROR (503) - Redirect to Warning Page
        else if (err.response.status === 503) {
          console.log("API limit exceeded, redirecting to warning page");
          
          setWarningData({
            type: "api_limit", 
            error: errorData,
            timestamp: Date.now()
          });
          
          // Small delay to show any loading state, then redirect
          setTimeout(() => {
            goTo("warning");
          }, 1000);
          
          return;
        }
        
        // 🔥 VALIDATION ERRORS (400)
        else if (err.response.status === 400) {
          toast.error(errorData.error || "Invalid input. Please check your data.");
          goTo("description");
          return;
        }
        
        // 🔥 OTHER API ERRORS
        else if (errorData.message) {
          toast.error(errorData.message);
        } else if (errorData.error) {
          toast.error(errorData.error);
        } else {
          toast.error("Failed to generate song. Please try again.");
        }
      } 
      // 🔥 NETWORK OR OTHER ERRORS
      else if (err.message) {
        toast.error(`Network error: ${err.message}`);
      } else {
        toast.error("Failed to generate song. Please check your connection.");
      }
      
      // Go back to description page for all other errors
      setTimeout(() => {
        goTo("description");
      }, 2000);
      
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackFromResult = () => {
    setSong({});
    sessionStorage.removeItem("song");
    goTo("description");
  };

  const handleLogout = () => {
    setUser(null);
    setSong({});
    setSongForm({ title: "", theme: "" });
    setIsGenerating(false); // Reset generating state
    sessionStorage.clear();
    goTo("signin");
  };

  // Handle back from API usage page
  const handleBackFromApiUsage = () => {
    // Go back to appropriate page based on user state
    if (user) {
      goTo("description");
    } else {
      goTo("signin");
    }
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
      {page === "start" && <StartScreen onStart={() => goTo("signin")} />}
      {page === "signup" && (
        <SignUpPage 
          onSubmit={handleRegister} 
          onGoToSignIn={() => goTo("signin")}
        />
      )}
      {page === "signin" && (
        <SignInPage 
          onSubmit={handleSignIn} 
          onGoToSignUp={() => goTo("signup")}
        />
      )}
      {page === "description" && (
        <SongDescription
          user={user}
          form={songForm}
          setForm={setSongForm}
          onGenerate={handleGenerateSong}
          onBack={handleLogout}
          onApiUsage={() => goTo("api-usage")}
          isGenerating={isGenerating} // 🔥 Pass generating state
        />
      )}
      {page === "loading" && <LoadingPage />}
      {page === "result" && (
        <ResultPage song={song} user={user} onBack={handleBackFromResult} />
      )}
      {page === "api-usage" && (
        <ApiUsagePage onBack={handleBackFromApiUsage} />
      )}
      {page === "warning" && warningData && (
        <WarningPage 
          onBack={handleBackFromWarning}
          warningType={warningData.type}
          errorData={warningData.error}
          user={user}
        />
      )}
      
      {/* 🔥 ENHANCED TOAST CONTAINER with custom styling */}
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