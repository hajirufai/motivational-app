import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Divider,
  Paper,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  CircularProgress,
  useMediaQuery,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ContentCopy as ContentCopyIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
  FormatQuote as FormatQuoteIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { api } from '../services/api';

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [quote, setQuote] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

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

  const fetchFavorites = async () => {
    try {
      const data = await api.getFavorites();
      setFavorites(data.favorites || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      // Don't show error for favorites, just log it
    }
  };

  useEffect(() => {
    fetchRandomQuote();
    fetchFavorites();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleToggleFavorite = async (quoteId) => {
    setFavoriteLoading(true);
    try {
      const isFavorite = favorites.some(fav => fav._id === quoteId);
      if (isFavorite) {
        await api.removeFromFavorites(quoteId);
        setFavorites(favorites.filter(fav => fav._id !== quoteId));
        setSnackbar({
          open: true,
          message: 'Quote removed from favorites',
          severity: 'success',
        });
      } else {
        await api.addToFavorites(quoteId);
        if (quote && quote._id === quoteId) {
          setFavorites([...favorites, quote]);
        } else {
          // Refresh favorites to get the updated list
          await fetchFavorites();
        }
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
    } finally {
      setFavoriteLoading(false);
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

  const isQuoteFavorite = (quoteId) => {
    return favorites.some(fav => fav._id === quoteId);
  };

  const renderQuoteCard = (quoteData, isFavoritesList = false) => {
    if (!quoteData) return null;
    
    const favorite = isQuoteFavorite(quoteData._id);
    
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
          <Typography variant="body1" component="div" gutterBottom sx={{ fontStyle: 'italic', mb: 2 }}>
            "{quoteData.text}"
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ textAlign: 'right' }}>
            — {quoteData.author}
          </Typography>
          {quoteData.tags && quoteData.tags.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {quoteData.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Box>
          )}
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between', p: 1 }}>
          <Box>
            <IconButton 
              aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={() => handleToggleFavorite(quoteData._id)}
              disabled={favoriteLoading}
              color={favorite ? 'error' : 'default'}
            >
              {favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
            <IconButton 
              aria-label="Copy quote" 
              onClick={() => handleCopyQuote(`"${quoteData.text}" - ${quoteData.author}`)}
            >
              <ContentCopyIcon />
            </IconButton>
            <IconButton 
              aria-label="Share quote" 
              onClick={() => handleShareQuote(quoteData)}
            >
              <ShareIcon />
            </IconButton>
          </Box>
          {!isFavoritesList && (
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={fetchRandomQuote}
              disabled={loading}
              variant="outlined"
              size="small"
            >
              New Quote
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant={isMobile ? 'fullWidth' : 'standard'}
          centered={!isMobile}
        >
          <Tab label="Daily Quote" />
          <Tab label="Favorites" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Box sx={{ py: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
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
          ) : (
            renderQuoteCard(quote)
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box sx={{ py: 2 }}>
          {favorites.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                You haven't added any favorites yet.
              </Typography>
              <Button 
                variant="outlined" 
                onClick={() => setTabValue(0)}
                sx={{ mt: 1 }}
              >
                Go to Daily Quote
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {favorites.map((fav) => (
                <Grid item xs={12} md={6} key={fav._id}>
                  {renderQuoteCard(fav, true)}
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

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