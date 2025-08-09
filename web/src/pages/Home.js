import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Paper,
  Chip,
  IconButton,
  useMediaQuery,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  FormatQuote as FormatQuoteIcon,
  ContentCopy as ContentCopyIcon,
  Share as ShareIcon,
  Devices as DevicesIcon,
  Favorite as FavoriteIcon,
  Notifications as NotificationsIcon,
  CloudOff as CloudOffIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { api } from '../services/api';

const Home = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchRandomQuote();
  }, []);

  const fetchRandomQuote = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getRandomQuote();
      setQuote(data);
    } catch (err) {
      console.error('Error fetching random quote:', err);
      setError('Failed to fetch a quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyQuote = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setSnackbar({
          open: true,
          message: 'Quote copied to clipboard',
          severity: 'success',
        });
      })
      .catch((err) => {
        console.error('Error copying text:', err);
        setSnackbar({
          open: true,
          message: 'Failed to copy quote',
          severity: 'error',
        });
      });
  };

  const handleShareQuote = (quote) => {
    if (navigator.share) {
      navigator.share({
        title: 'Motivational Quote',
        text: `"${quote.text}" - ${quote.author}`,
        url: window.location.href,
      })
        .then(() => {
          setSnackbar({
            open: true,
            message: 'Quote shared successfully',
            severity: 'success',
          });
        })
        .catch((err) => {
          console.error('Error sharing:', err);
          if (err.name !== 'AbortError') {
            setSnackbar({
              open: true,
              message: 'Failed to share quote',
              severity: 'error',
            });
          }
        });
    } else {
      handleCopyQuote(`"${quote.text}" - ${quote.author}`);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const renderQuoteCard = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button 
            color="inherit" 
            size="small" 
            onClick={fetchRandomQuote}
            sx={{ ml: 2 }}
          >
            Try Again
          </Button>
        </Alert>
      );
    }
    
    if (!quote) return null;
    
    return (
      <Card 
        elevation={3} 
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -15,
            left: 20,
            width: 30,
            height: 30,
            borderRadius: '50%',
            backgroundColor: theme.palette.primary.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          },
        }}
      >
        <FormatQuoteIcon 
          sx={{
            position: 'absolute',
            top: -8,
            left: 27,
            color: 'white',
            fontSize: '1rem',
            zIndex: 2,
          }}
        />
        <CardContent sx={{ flexGrow: 1, pt: 3 }}>
          <Typography variant="h5" component="div" gutterBottom sx={{ fontStyle: 'italic', mb: 2 }}>
            "{quote.text}"
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'right' }}>
            — {quote.author}
          </Typography>
          {quote.tags && quote.tags.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {quote.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Box>
          )}
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between', p: 1 }}>
          <Box>
            <IconButton 
              aria-label="Copy quote" 
              onClick={() => handleCopyQuote(`"${quote.text}" - ${quote.author}`)}
            >
              <ContentCopyIcon />
            </IconButton>
            <IconButton 
              aria-label="Share quote" 
              onClick={() => handleShareQuote(quote)}
            >
              <ShareIcon />
            </IconButton>
          </Box>
          <Button 
            startIcon={<FormatQuoteIcon />} 
            onClick={fetchRandomQuote}
            variant="outlined"
            size="small"
          >
            New Quote
          </Button>
        </CardActions>
      </Card>
    );
  };

  const features = [
    {
      icon: <FormatQuoteIcon fontSize="large" />,
      title: 'Daily Quotes',
      description: 'Get inspired with daily motivational quotes from famous authors, leaders, and thinkers.',
    },
    {
      icon: <FavoriteIcon fontSize="large" />,
      title: 'Save Favorites',
      description: 'Save your favorite quotes to revisit them whenever you need motivation.',
    },
    {
      icon: <NotificationsIcon fontSize="large" />,
      title: 'Notifications',
      description: 'Receive timely notifications with your daily dose of inspiration.',
    },
    {
      icon: <CloudOffIcon fontSize="large" />,
      title: 'Offline Mode',
      description: 'Access your favorite quotes even when you\'re offline.',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          pt: 8,
          pb: 6,
        }}
      >
        <Container maxWidth="md">
          <Typography
            component="h1"
            variant="h2"
            align="center"
            color="text.primary"
            gutterBottom
          >
            Motivational Quotes
          </Typography>
          <Typography variant="h5" align="center" color="text.secondary" paragraph>
            Start your day with inspiration. Discover, save, and share motivational quotes
            that resonate with you. Available on web and desktop.
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Button variant="contained" size="large" component={RouterLink} to="/register">
              Sign Up Free
            </Button>
            <Button variant="outlined" size="large" component={RouterLink} to="/login">
              Sign In
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Quote of the Day */}
      <Container sx={{ py: 8 }} maxWidth="md">
        <Typography
          component="h2"
          variant="h4"
          align="center"
          color="text.primary"
          gutterBottom
        >
          Quote of the Day
        </Typography>
        <Box sx={{ mt: 4, maxWidth: 800, mx: 'auto' }}>
          {renderQuoteCard()}
        </Box>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Typography
            component="h2"
            variant="h4"
            align="center"
            color="text.primary"
            gutterBottom
          >
            Features
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {features.map((feature, index) => (
              <Grid item key={index} xs={12} sm={6} md={3}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <Box
                    sx={{
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Download Section */}
      <Container sx={{ py: 8 }} maxWidth="md">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography component="h2" variant="h4" color="text.primary" gutterBottom>
              Available on Desktop
            </Typography>
            <Typography variant="body1" paragraph>
              Download our desktop application for a seamless experience. Access your quotes offline,
              get desktop notifications, and more.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<ArrowDownwardIcon />}
                component={RouterLink}
                to="/downloads"
              >
                Download for {isMobile ? 'Desktop' : 'Windows'}
              </Button>
              {!isMobile && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" component={RouterLink} to="/downloads">
                    macOS
                  </Button>
                  <Button variant="outlined" size="small" component={RouterLink} to="/downloads">
                    Linux
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: 'center' }}>
            <DevicesIcon sx={{ fontSize: 180, color: 'primary.main', opacity: 0.8 }} />
          </Grid>
        </Grid>
      </Container>

      {/* Call to Action */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 6,
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" align="center" gutterBottom>
            Ready to get inspired?
          </Typography>
          <Typography variant="h6" align="center" paragraph>
            Join thousands of users who start their day with motivation.
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              component={RouterLink}
              to="/register"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'grey.100',
                },
              }}
            >
              Get Started Now
            </Button>
          </Box>
        </Container>
      </Box>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Home;