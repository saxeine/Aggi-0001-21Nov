import React from 'react';

export const Hero: React.FC = () => {
  return (
    <div className="text-center space-y-4">
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-50 to-zinc-400">
        Bring anything to life
      </h1>
      <p className="text-zinc-500 text-sm md:text-base max-w-md mx-auto leading-relaxed">
        Upload a drawing, screenshot, or just describe your vision. 
        Gemini will turn it into a functional interactive creation.
      </p>
    </div>
  );
};
