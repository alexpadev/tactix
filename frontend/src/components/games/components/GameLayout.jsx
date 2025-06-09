import React from 'react';

export default function GameLayout({ children }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {React.Children.toArray(children).slice(0, 2)}
        <div className="md:col-span-2">{React.Children.toArray(children)[2]}</div>
      </div>
    </div>
  );
}
