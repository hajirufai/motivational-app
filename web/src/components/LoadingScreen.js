import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * LoadingScreen component displays a loading indicator with an optional message
 * @param {Object} props - Component props
 * @param {string} [props.message="Loading..."] - Message to display below the loading indicator
 * @param {Object} [props.sx] - Additional styles to apply to the container
 */
const LoadingScreen = ({ message = 'Loading...', sx = {} }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: '200px',
        width: '100%',
        ...sx,
      }}
    >
      <CircularProgress size={60} thickness={4} />
      {message && (
        <Typography
          variant="h6"
          sx={{ mt: 2, color: 'text.secondary', textAlign: 'center' }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingScreen;