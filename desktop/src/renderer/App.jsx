import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Components
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';

// Services
import { initApi } from './services/api';

// Initialize Firebase
const firebaseConfig = window.firebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize API with base URL
initApi(window.apiConfig.baseUrl);

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in electron store
    const checkUserData = async () => {
      try {
        const userData = await window.electron.user.getData();
        if (userData) {
          console.log('User data found in electron store');
        }
      } catch (error) {
        console.error('Error getting user data from electron store:', error);
      }
    };

    checkUserData();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Store user data in electron store if logged in
      if (currentUser) {
        window.electron.user.setData({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });
      } else {
        window.electron.user.clearData();
      }
    });

    // Get app version
    const getAppVersion = async () => {
      try {
        const version = await window.electron.app.getVersion();
        console.log(`App version: ${version}`);
      } catch (error) {
        console.error('Error getting app version:', error);
      }
    };

    getAppVersion();

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/" element={<Layout user={user} />}>
            <Route index element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;