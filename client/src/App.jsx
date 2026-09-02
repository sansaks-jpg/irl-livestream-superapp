import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { MobileCam } from './pages/MobileCam';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname + window.location.hash);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname + window.location.hash);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const isCamRoute = currentPath.startsWith('/cam') || currentPath.includes('#/cam');

  if (isCamRoute) {
    return <MobileCam />;
  }

  return <Dashboard />;
}

export default App;
