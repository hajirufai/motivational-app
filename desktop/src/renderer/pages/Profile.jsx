import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Button,
  TextField,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Chip,
  Tab,
  Tabs,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  History as HistoryIcon,
  Favorite as FavoriteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { getAuth, updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { fetchUserProfile, updateUserProfile, fetchUserActivity, fetchUserFavorites } from '../services/api';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Profile = () => {
  const auth = getAuth();
  const user = auth.currentUser;

  const [tabValue, setTabValue] = useState(0);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    preferences: {
      theme: 'light',
      notificationsEnabled: true,
      quotesPerDay: 1,
    },
  });
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;

      try {
        const profileData = await fetchUserProfile();
        setProfile(profileData);
        setFormData({
          displayName: user.displayName || '',
          email: user.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          preferences: profileData.preferences || {
            theme: 'light',
            notificationsEnabled: true,
            quotesPerDay: 1,
          },
        });
      } catch (error) {
        console.error('Error loading user profile:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load profile data',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const loadActivity = async () => {
    if (!user) return;

    setActivityLoading(true);
    try {
      const data = await fetchUserActivity();
      setActivities(data);
    } catch (error) {
      console.error('Error loading user activity:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load activity data',
        severity: 'error',
      });
    } finally {
      setActivityLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;

    setFavoritesLoading(true);
    try {
      const data = await fetchUserFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load favorites',
        severity: 'error',
      });
    } finally {
      setFavoritesLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 1) {
      loadActivity();
    } else if (tabValue === 2) {
      loadFavorites();
    }
  }, [tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleToggleEdit = () => {
    if (editMode) {
      // Reset form data if canceling edit
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        preferences: profile.preferences || {
          theme: 'light',
          notificationsEnabled: true,
          quotesPerDay: 1,
        },
      });
    }
    setEditMode(!editMode);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Update display name in Firebase Auth
      if (formData.displayName !== user.displayName) {
        await updateProfile(user, {
          displayName: formData.displayName,
        });
      }

      // Update email in Firebase Auth
      if (formData.email !== user.email) {
        await updateEmail(user, formData.email);
      }

      // Update password if provided
      if (formData.newPassword && formData.currentPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        await updatePassword(user, formData.newPassword);
      }

      // Update user preferences in backend
      await updateUserProfile({
        preferences: formData.preferences,
      });

      // Refresh user profile data
      const updatedProfile = await fetchUserProfile();
      setProfile(updatedProfile);

      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success',
      });

      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: `Failed to update profile: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading && !profile) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          p: 4,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
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
          Your Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Paper>

      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="profile tabs"
            centered
          >
            <Tab
              icon={<SettingsIcon />}
              label="Account"
              id="profile-tab-0"
              aria-controls="profile-tabpanel-0"
            />
            <Tab
              icon={<HistoryIcon />}
              label="Activity"
              id="profile-tab-1"
              aria-controls="profile-tabpanel-1"
            />
            <Tab
              icon={<FavoriteIcon />}
              label="Favorites"
              id="profile-tab-2"
              aria-controls="profile-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  src={user?.photoURL}
                  alt={user?.displayName || user?.email}
                  sx={{ width: 80, height: 80, mr: 3 }}
                >
                  {user?.displayName
                    ? user.displayName[0].toUpperCase()
                    : user?.email[0].toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5">{user?.displayName}</Typography>
                  <Typography variant="body1" color="text.secondary">
                    {user?.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant={editMode ? 'outlined' : 'contained'}
                color={editMode ? 'error' : 'primary'}
                startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                onClick={handleToggleEdit}
                disabled={loading}
              >
                {editMode ? 'Cancel' : 'Edit Profile'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
                <Box component="form" noValidate sx={{ mt: 1 }}>
                  <TextField
                    margin="normal"
                    fullWidth
                    id="displayName"
                    label="Display Name"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    disabled={!editMode || loading}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!editMode || loading}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Change Password
                </Typography>
                <Box component="form" noValidate sx={{ mt: 1 }}>
                  <TextField
                    margin="normal"
                    fullWidth
                    name="currentPassword"
                    label="Current Password"
                    type="password"
                    id="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    disabled={!editMode || loading}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    name="newPassword"
                    label="New Password"
                    type="password"
                    id="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={!editMode || loading}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    name="confirmPassword"
                    label="Confirm New Password"
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={!editMode || loading}
                    error={
                      formData.newPassword &&
                      formData.confirmPassword &&
                      formData.newPassword !== formData.confirmPassword
                    }
                    helperText={
                      formData.newPassword &&
                      formData.confirmPassword &&
                      formData.newPassword !== formData.confirmPassword
                        ? 'Passwords do not match'
                        : ''
                    }
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Preferences
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      margin="normal"
                      fullWidth
                      id="theme"
                      label="Theme"
                      name="preferences.theme"
                      value={formData.preferences.theme}
                      onChange={handleChange}
                      disabled={!editMode || loading}
                      SelectProps={{
                        native: true,
                      }}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System Default</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      margin="normal"
                      fullWidth
                      id="quotesPerDay"
                      label="Quotes Per Day"
                      name="preferences.quotesPerDay"
                      value={formData.preferences.quotesPerDay}
                      onChange={handleChange}
                      disabled={!editMode || loading}
                      SelectProps={{
                        native: true,
                      }}
                    >
                      <option value={1}>1</option>
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      select
                      margin="normal"
                      fullWidth
                      id="notificationsEnabled"
                      label="Notifications"
                      name="preferences.notificationsEnabled"
                      value={formData.preferences.notificationsEnabled ? 'true' : 'false'}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences,
                            notificationsEnabled: e.target.value === 'true',
                          },
                        });
                      }}
                      disabled={!editMode || loading}
                      SelectProps={{
                        native: true,
                      }}
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </TextField>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {editMode && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {activityLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 200,
              }}
            >
              <CircularProgress />
            </Box>
          ) : activities.length > 0 ? (
            <List sx={{ width: '100%' }}>
              {activities.map((activity) => (
                <React.Fragment key={activity._id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar>
                        <HistoryIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.actionType}
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {activity.details}
                          </Typography>
                          <br />
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            {new Date(activity.timestamp).toLocaleString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No activity recorded yet.
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {favoritesLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 200,
              }}
            >
              <CircularProgress />
            </Box>
          ) : favorites.length > 0 ? (
            <Grid container spacing={3}>
              {favorites.map((quote) => (
                <Grid item xs={12} key={quote._id}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      position: 'relative',
                    }}
                  >
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'secondary.main',
                      }}
                    >
                      <FavoriteIcon />
                    </IconButton>
                    <Typography
                      variant="body1"
                      gutterBottom
                      sx={{ fontStyle: 'italic', mb: 2 }}
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
                      <Typography variant="body2" color="text.secondary">
                        — {quote.author}
                      </Typography>
                      <Box>
                        {quote.tags &&
                          quote.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          ))}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                You haven't added any favorites yet.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                startIcon={<VisibilityIcon />}
                onClick={() => {
                  // Navigate to dashboard
                  window.location.href = '/';
                }}
              >
                Browse Quotes
              </Button>
            </Box>
          )}
        </TabPanel>
      </Paper>

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

export default Profile;