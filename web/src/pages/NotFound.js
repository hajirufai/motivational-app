import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { SentimentDissatisfied as SentimentDissatisfiedIcon } from '@mui/icons-material';

const NotFound = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 500,
          mx: 'auto',
        }}
      >
        <SentimentDissatisfiedIcon sx={{ fontSize: 100, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h2" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          The page you are looking for doesn't exist or has been moved.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          component={RouterLink}
          to="/"
          size="large"
        >
          Go to Home
        </Button>
      </Paper>
    </Box>
  );
};

export default NotFound;