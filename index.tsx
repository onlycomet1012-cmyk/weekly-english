import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// MOBILE DEBUGGING: Catch global errors that might cause a white screen
window.onerror = function(message, source, lineno, colno, error) {
  // Only alert on mobile devices to avoid annoying desktop users
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
     console.error("Global Error:", message, error);
     // Uncomment the line below if you need to see the alert on your phone to debug
     // alert(`App Error: ${message}`);
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);