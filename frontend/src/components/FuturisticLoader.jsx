import React, { useEffect, useState } from 'react';
import '../styles/FuturisticLoader.css';

const FuturisticLoader = () => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prevProgress + 1;
      });
    }, 30);
    
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="futuristic-loader">
      {/* Futuristic camera aperture animation */}
      <div className="aperture-container">
        <div className="aperture-ring ping-animation" />
        <div className="aperture-ring-inner spin-animation" />
        <div className="aperture-ring-inner-reverse reverse-spin-animation" />
        <div className="aperture-core pulse-animation" />
      </div>
      
      {/* Progress indicator */}
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Loading text */}
      <div className="loading-text">
        LOADING GALLERY <span className="loading-percentage">{progress}%</span>
      </div>
    </div>
  );
};

export default FuturisticLoader;