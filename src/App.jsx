import React from 'react'
import PushUpApp from './components/PushUp'
import SitUpApp from './components/SitUp'
import SquatApp from './components/Squat'
import JumpingJackApp from './components/JumpingJack'
import { useState } from 'react'
import { Activity, Target, Timer, Play, ArrowLeft } from 'lucide-react';
import './index.css'

// Menu utama dengan 4 kotak exercise
const ExerciseMenu = ({ onSelectExercise }) => {
  const exercises = [
    // {
    //   id: 'pushup',
    //   name: 'Push-Up',
    //   description: 'Upper body strength',
    //   color: 'from-purple-500 to-blue-600',
    //   icon: <Activity size={32} />,
    //   // Placeholder untuk GIF - ganti dengan URL GIF sebenarnya
    //   gifUrl: '/assets/push up.gif', // Push-up GIF
    //   targetReps: '20 reps'
    // },
    // {
    //   id: 'situp',
    //   name: 'Sit-Up',
    //   description: 'Core strengthening',
    //   color: 'from-red-500 to-orange-500',
    //   icon: <Target size={32} />,
    //   // Placeholder untuk GIF - ganti dengan URL GIF sebenarnya  
    //   gifUrl: '/assets/sit up.gif', // Sit-up GIF
    //   targetReps: '25 reps'
    // },
    {
      id: 'squat',
      name: 'Squat',
      description: 'Lower body power',
      color: 'from-teal-500 to-green-600',
      icon: <Timer size={32} />,
      // Placeholder untuk GIF - ganti dengan URL GIF sebenarnya
      gifUrl: '/assets/squat.gif', // Squat GIF
      targetReps: '30 reps'
    },
    // {
    //   id: 'jumpingjack',
    //   name: 'Jumping Jack',
    //   description: 'Full body cardio',
    //   color: 'from-yellow-500 to-cyan-500',
    //   icon: <Play size={32} />,
    //   // Placeholder untuk GIF - ganti dengan URL GIF sebenarnya
    //   gifUrl: '/assets/jumping jack.gif', // Jumping Jack GIF
    //   targetReps: '50 reps'
    // }
  ];

  return (
    <div 
      className="w-full min-h-screen bg-black flex flex-col"
      style={{
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div className="w-full p-6 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">
          💪 Fitness AI
        </h1>
        <div className="px-6 py-2 text-center">
          <p className="text-white text-sm opacity-70">
            AI-powered exercise tracking
          </p>
        </div>
      </div>

      {/* Exercise Grid */}
      <div className="flex-1 px-4 py-2 grid grid-cols-1 gap-4 -mt-5">
        {exercises.map((exercise) => (
          <div
            key={exercise.id}
            onClick={() => onSelectExercise(exercise.id)}
            className="bg-opacity-20 rounded-2xl p-4 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:bg-opacity-30 active:scale-95"
          >
            {/* GIF Container */}
            <div className="w-full h-80 mb-4 rounded-xl overflow-hidden bg-opacity-30 flex items-center justify-center">
              <img 
                src={exercise.gifUrl}
                alt={exercise.name}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  // Fallback jika GIF gagal load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            </div>

            {/* Exercise Info */}
            <div className="text-center">
              <h3 className="text-white font-bold text-lg mb-1">
                {exercise.name}
              </h3>
              <p className="text-white text-sm opacity-80 mb-2">
                {exercise.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Komponen App utama dengan routing
function App() {
  const [currentScreen, setCurrentScreen] = useState('menu');

  const handleSelectExercise = (exerciseId) => {
    setCurrentScreen(exerciseId);
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pushup':
        return <PushUpApp onBack={handleBackToMenu}/>;
      case 'situp':
        return <SitUpApp onBack={handleBackToMenu}/>;
      case 'squat':
        return <SquatApp onBack={handleBackToMenu}/>;
      case 'jumpingjack':
        return <JumpingJackApp onBack={handleBackToMenu}/>;
      default:
        return <ExerciseMenu onSelectExercise={handleSelectExercise} />;
    }
  };

  return (
    <div className="App">
      {renderScreen()}
    </div>
  );
}

export default App;