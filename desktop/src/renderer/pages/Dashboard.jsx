import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  Share,
  Refresh,
  ContentCopy,
} from '@mui/icons-material';
import { getAuth } from 'firebase/auth';
import { fetchRandomQuote, fetchUserFavorites, toggleFavorite } from '../services/api';

const Dashboard = () => {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchQuote = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchRandomQuote();
      setQuote(data);
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError('Failed to fetch quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const data = await fetchUserFavorites();
      setFavorites(data.favorites || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  useEffect(() => {
    fetchQuote();
    loadFavorites();

    // Set up interval to fetch a new quote every hour
    const interval = setInterval(() => {
      fetchQuote();
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleFavorite = async () => {
    if (!quote) return;

    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        setSnackbar({
          open: true,
          message: 'You must be logged in to favorite quotes',
          severity: 'warning',
        });
        return;
      }

      const isFavorite = favorites.some((fav) => fav._id === quote._id);
      const result = await toggleFavorite(quote._id, !isFavorite);
      
      // Check if the API call was successful before updating UI
      if (!result.success) {
        setSnackbar({
          open: true,
          message: result.message || 'Failed to update favorites',
          severity: 'error',
        });
        return;
      }

      if (isFavorite) {
        setFavorites(favorites.filter((fav) => fav._id !== quote._id));
        setSnackbar({
          open: true,
          message: 'Quote removed from favorites',
          severity: 'success',
        });
      } else {
        setFavorites([...favorites, quote]);
        setSnackbar({
          open: true,
          message: 'Quote added to favorites',
          severity: 'success',
        });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update favorites',
        severity: 'error',
      });
    }
  };

  const handleCopyQuote = () => {
    if (!quote) return;

    const textToCopy = `"${quote.text}" - ${quote.author}`;
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        setSnackbar({
          open: true,
          message: 'Quote copied to clipboard',
          severity: 'success',
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        setSnackbar({
          open: true,
          message: 'Failed to copy quote',
          severity: 'error',
        });
      }
    );
  };

  const handleShareQuote = () => {
    if (!quote) return;

    const text = `"${quote.text}" - ${quote.author}`;
    const shareData = {
      title: 'Motivational Quote',
      text: text,
    };

    if (navigator.share) {
      navigator.share(shareData)
        .then(() => {
          setSnackbar({
            open: true,
            message: 'Quote shared successfully',
            severity: 'success',
          });
        })
        .catch((err) => {
          console.error('Error sharing:', err);
          setSnackbar({
            open: true,
            message: 'Failed to share quote',
            severity: 'error',
          });
        });
    } else {
      handleCopyQuote();
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const isFavorite = quote && favorites.some((fav) => fav._id === quote._id);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 4,
              borderRadius: 2,
              backgroundColor: 'background.default',
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom>
              Daily Inspiration
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome to your daily dose of motivation. Discover quotes that inspire and energize you.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Card
            sx={{
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              borderRadius: 2,
              position: 'relative',
              overflow: 'visible',
              boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
            }}
          >
            {loading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 200,
                }}
              >
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 200,
                  p: 3,
                }}
              >
                <Typography color="error" gutterBottom>
                  {error}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={fetchQuote}
                >
                  Try Again
                </Button>
              </Box>
            ) : quote ? (
              <>
                <CardContent sx={{ p: 4, flexGrow: 1 }}>
                  <Typography
                    variant="h5"
                    component="div"
                    gutterBottom
                    sx={{
                      fontStyle: 'italic',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      mb: 3,
                    }}
                  >
                    "{quote.text}"
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      — {quote.author}
                    </Typography>
                    <Box>
                      {quote.tags &&
                        quote.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        ))}
                    </Box>
                  </Box>
                </CardContent>
                <Divider />
                <CardActions
                  sx={{
                    justifyContent: 'space-between',
                    p: 2,
                  }}
                >
                  <Box>
                    <IconButton
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      onClick={handleToggleFavorite}
                      color={isFavorite ? 'secondary' : 'default'}
                    >
                      {isFavorite ? <Favorite /> : <FavoriteBorder />}
                    </IconButton>
                    <IconButton
                      aria-label="Share quote"
                      onClick={handleShareQuote}
                    >
                      <Share />
                    </IconButton>
                    <IconButton
                      aria-label="Copy quote"
                      onClick={handleCopyQuote}
                    >
                      <ContentCopy />
                    </IconButton>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchQuote}
                  >
                    New Quote
                  </Button>
                </CardActions>
              </>
            ) : null}
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Your Favorites
            </Typography>
            {favorites.length > 0 ? (
              <Grid container spacing={3}>
                {favorites.slice(0, 3).map((fav) => (
                  <Grid item xs={12} md={4} key={fav._id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" gutterBottom sx={{ fontStyle: 'italic' }}>
                          "{fav.text}"
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          — {fav.author}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary">
                You haven't added any favorites yet. Click the heart icon on quotes you love!
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>

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

export default Dashboard;