// App.tsx
import React from 'react';
import { AuthProvider } from './src/auth/AuthProvider';
import MainNavigation from './src/navigation/MainNavigation';

const App = () => {
  return (
    <AuthProvider>
      <MainNavigation />
    </AuthProvider>
  );
};

export default App;
