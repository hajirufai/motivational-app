import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'background.default',
      }}
    >
      <CircularProgress size={60} thickness={4} />
      <Typography variant="h6" sx={{ mt: 4 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingScreen;