import React, { useState, useEffect } from "react";
import StartScreen from "./components/StartScreen";
import SignInPage from "./components/SignInPage";
import SongDescription from "./components/SongDescription";
import LoadingPage from "./components/LoadingPage";
import ResultPage from "./components/ResultPage";
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

  const goTo = (p) => setPage(p);

  const handleRegister = async (userData) => {
    try {
      const res = await axios.post("http://localhost:3000/register", userData);
      setUser(res.data.result);
      goTo("description");
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to register user");
      }
    }
  };

  const handleGenerateSong = async (songData) => {
    try {
      const payload = { ...songData, user_id: user.id };
      const res = await axios.post("http://localhost:3000/song", payload);
      setSong(res.data.song);
      setSongForm({ title: "", theme: "" });
      sessionStorage.removeItem("songForm");
      goTo("loading");
      setTimeout(() => goTo("result"), 3000);
    } catch {
      toast.error("Failed to generate song");
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
    sessionStorage.clear();
    goTo("signin");
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
      {page === "signin" && <SignInPage onSubmit={handleRegister} />}
      {page === "description" && (
        <SongDescription
          user={user}
          form={songForm}
          setForm={setSongForm}
          onGenerate={handleGenerateSong}
          onBack={handleLogout}
        />
      )}
      {page === "loading" && <LoadingPage />}
      {page === "result" && (
        <ResultPage song={song} user={user} onBack={handleBackFromResult} />
      )}
      <ToastContainer autoClose={2000} position="top-center" hideProgressBar />
    </div>
  );
}

export default App;
