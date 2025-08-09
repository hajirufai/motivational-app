import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  Divider,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  FormatQuote as FormatQuoteIcon,
  History as HistoryIcon,
  Favorite as FavoriteIcon,
  Settings as SettingsIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { api } from '../services/api';
import { format } from 'date-fns';

const Profile = () => {
  const theme = useTheme();
  const auth = getAuth();
  const user = auth.currentUser;
  
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    firstName: '',
    lastName: '',
    bio: '',
    preferences: {
      theme: 'system',
      emailNotifications: false,
      quotesPerDay: 1,
    },
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [activityHistory, setActivityHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const [reauthDialog, setReauthDialog] = useState({
    open: false,
    email: '',
    password: '',
    callback: null,
  });
  
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const data = await api.getUserProfile();
        setProfileData(data);
        setFormData({
          displayName: user.displayName || '',
          email: user.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          bio: data.bio || '',
          preferences: {
            theme: data.preferences?.theme || 'system',
            emailNotifications: data.preferences?.emailNotifications || false,
            quotesPerDay: data.preferences?.quotesPerDay || 1,
          },
        });
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const fetchActivityHistory = async () => {
    try {
      const data = await api.getUserActivity();
      setActivityHistory(data);
    } catch (err) {
      console.error('Error fetching activity history:', err);
    }
  };

  const fetchFavorites = async () => {
    try {
      const data = await api.getFavorites();
      setFavorites(data);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  useEffect(() => {
    if (tabValue === 1) {
      fetchActivityHistory();
    } else if (tabValue === 2) {
      fetchFavorites();
    }
  }, [tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: type === 'checkbox' ? checked : value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
  };

  const handleTogglePasswordVisibility = (field) => {
    switch (field) {
      case 'currentPassword':
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case 'newPassword':
        setShowNewPassword(!showNewPassword);
        break;
      case 'confirmPassword':
        setShowConfirmPassword(!showConfirmPassword);
        break;
      default:
        break;
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Check if email has changed
      if (formData.email !== user.email) {
        // Need to reauthenticate before changing email
        setReauthDialog({
          open: true,
          email: user.email,
          password: '',
          callback: async (password) => {
            try {
              const credential = EmailAuthProvider.credential(user.email, password);
              await reauthenticateWithCredential(user, credential);
              await updateEmail(user, formData.email);
              
              // Continue with profile update
              await updateProfileData();
            } catch (err) {
              console.error('Error updating email:', err);
              setError('Failed to update email. Please try again.');
              setLoading(false);
            }
          },
        });
      } else {
        // No email change, just update profile
        await updateProfileData();
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile changes');
      setLoading(false);
    }
  };

  const updateProfileData = async () => {
    try {
      await api.updateUserProfile({
        displayName: formData.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        preferences: formData.preferences,
      });
      
      setEditMode(false);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success',
      });
      
      // Refresh profile data
      const data = await api.getUserProfile();
      setProfileData(data);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Reauthenticate before changing password
      setReauthDialog({
        open: true,
        email: user.email,
        password: '',
        callback: async (password) => {
          try {
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordData.newPassword);
            
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
            
            setSnackbar({
              open: true,
              message: 'Password updated successfully',
              severity: 'success',
            });
          } catch (err) {
            console.error('Error updating password:', err);
            setError('Failed to update password. Please try again.');
          } finally {
            setLoading(false);
          }
        },
      });
    } catch (err) {
      console.error('Error updating password:', err);
      setError('Failed to update password');
      setLoading(false);
    }
  };

  const handleReauthDialogClose = () => {
    setReauthDialog({
      ...reauthDialog,
      open: false,
      password: '',
    });
  };

  const handleReauthSubmit = () => {
    if (reauthDialog.callback) {
      reauthDialog.callback(reauthDialog.password);
      handleReauthDialogClose();
    }
  };

  const handleReauthPasswordChange = (e) => {
    setReauthDialog({
      ...reauthDialog,
      password: e.target.value,
    });
  };
  
  const handleRemoveFavorite = async (quoteId) => {
    try {
      await api.removeFromFavorites(quoteId);
      // Refresh favorites list
      fetchFavorites();
      setSnackbar({
        open: true,
        message: 'Quote removed from favorites',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error removing favorite:', err);
      setSnackbar({
        open: true,
        message: 'Failed to remove quote from favorites',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const renderProfileTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Avatar
            src={user?.photoURL}
            alt={formData.displayName || user?.email}
            sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }}
          >
            {formData.displayName ? formData.displayName[0].toUpperCase() : user?.email[0].toUpperCase()}
          </Avatar>
          {editMode && (
            <IconButton
              color="primary"
              aria-label="upload picture"
              component="label"
              sx={{ mb: 2 }}
            >
              <input hidden accept="image/*" type="file" />
              <PhotoCameraIcon />
            </IconButton>
          )}
          <Typography variant="h6">{formData.displayName || user?.email}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formData.bio || 'No bio provided'}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Chip
              icon={<HistoryIcon />}
              label={`Joined ${profileData?.createdAt ? format(new Date(profileData.createdAt), 'MMM yyyy') : 'Recently'}`}
              variant="outlined"
              sx={{ m: 0.5 }}
            />
            {profileData?.stats?.totalQuotesViewed > 0 && (
              <Chip
                icon={<FormatQuoteIcon />}
                label={`${profileData.stats.totalQuotesViewed} quotes viewed`}
                variant="outlined"
                sx={{ m: 0.5 }}
              />
            )}
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Profile Information</Typography>
            {!editMode ? (
              <Button
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
                variant="outlined"
              >
                Edit
              </Button>
            ) : (
              <Box>
                <Button
                  startIcon={<CancelIcon />}
                  onClick={() => setEditMode(false)}
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Save'}
                </Button>
              </Box>
            )}
          </Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Display Name"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                disabled={!editMode || loading}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!editMode || loading}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!editMode || loading}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!editMode || loading}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                disabled={!editMode || loading}
                margin="normal"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" sx={{ mb: 2 }}>
            Change Password
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                disabled={loading}
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => handleTogglePasswordVisibility('newPassword')}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                disabled={loading}
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => handleTogglePasswordVisibility('confirmPassword')}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleUpdatePassword}
                disabled={!passwordData.newPassword || !passwordData.confirmPassword || loading}
              >
                Update Password
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" sx={{ mb: 2 }}>
            Preferences
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal" disabled={!editMode || loading}>
                <InputLabel id="theme-select-label">Theme</InputLabel>
                <Select
                  labelId="theme-select-label"
                  id="theme-select"
                  name="preferences.theme"
                  value={formData.preferences.theme}
                  label="Theme"
                  onChange={handleChange}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System Default</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal" disabled={!editMode || loading}>
                <InputLabel id="quotes-per-day-label">Quotes Per Day</InputLabel>
                <Select
                  labelId="quotes-per-day-label"
                  id="quotes-per-day"
                  name="preferences.quotesPerDay"
                  value={formData.preferences.quotesPerDay}
                  label="Quotes Per Day"
                  onChange={handleChange}
                >
                  <MenuItem value={1}>1 Quote</MenuItem>
                  <MenuItem value={3}>3 Quotes</MenuItem>
                  <MenuItem value={5}>5 Quotes</MenuItem>
                  <MenuItem value={10}>10 Quotes</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.preferences.emailNotifications}
                    onChange={handleChange}
                    name="preferences.emailNotifications"
                    disabled={!editMode || loading}
                  />
                }
                label="Receive email notifications"
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderActivityTab = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Activity History
      </Typography>
      {activityHistory.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          No activity recorded yet.
        </Typography>
      ) : (
        <List>
          {activityHistory.map((activity) => (
            <ListItem key={activity._id} divider>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  {activity.type === 'view' ? <FormatQuoteIcon /> : <FavoriteIcon />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={activity.type === 'view' ? 'Viewed a quote' : 'Favorited a quote'}
                secondary={`${format(new Date(activity.timestamp), 'PPpp')}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );

  const renderFavoritesTab = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Favorite Quotes
      </Typography>
      {favorites.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          You haven't added any favorites yet.
        </Typography>
      ) : (
        <List>
          {favorites.map((quote) => (
            <ListItem key={quote._id} divider>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                  <FormatQuoteIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`"${quote.text}"`}
                secondary={`— ${quote.author}`}
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="remove from favorites" 
                  color="error"
                  onClick={() => handleRemoveFavorite(quote._id)}
                >
                  <FavoriteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );

  if (loading && !profileData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<SettingsIcon />} label="Profile" />
          <Tab icon={<HistoryIcon />} label="Activity" />
          <Tab icon={<FavoriteIcon />} label="Favorites" />
        </Tabs>
      </Paper>

      {tabValue === 0 && renderProfileTab()}
      {tabValue === 1 && renderActivityTab()}
      {tabValue === 2 && renderFavoritesTab()}

      <Dialog open={reauthDialog.open} onClose={handleReauthDialogClose}>
        <DialogTitle>Verify Your Identity</DialogTitle>
        <DialogContent>
          <DialogContentText>
            For security reasons, please enter your current password to continue.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="reauth-password"
            label="Current Password"
            type={showCurrentPassword ? 'text' : 'password'}
            fullWidth
            variant="outlined"
            value={reauthDialog.password}
            onChange={handleReauthPasswordChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => handleTogglePasswordVisibility('currentPassword')}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReauthDialogClose}>Cancel</Button>
          <Button onClick={handleReauthSubmit} variant="contained">
            Verify
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;