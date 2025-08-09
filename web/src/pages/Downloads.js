import React from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Divider,
} from '@mui/material';

import {
  Apple as AppleIcon,
  DesktopWindows as WindowsIcon,
  Android as AndroidIcon,
  Download as DownloadIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';

const Downloads = () => {

  // Download links for the desktop applications
  const downloadLinks = {
    windows: '/downloads/MotivationalApp-Setup-1.0.0.exe',
    mac: '/downloads/MotivationalApp-1.0.0.dmg',
    linux: '/downloads/MotivationalApp-1.0.0.AppImage',
  };

  const platforms = [
    {
      name: 'Windows',
      icon: <WindowsIcon fontSize="large" />,
      description: 'For Windows 10 and above',
      downloadLink: downloadLinks.windows,
      fileName: 'MotivationalApp-Setup-1.0.0.exe',
      buttonText: 'Download for Windows',
    },
    {
      name: 'macOS',
      icon: <AppleIcon fontSize="large" />,
      description: 'For macOS 10.15 and above',
      downloadLink: downloadLinks.mac,
      fileName: 'MotivationalApp-1.0.0.dmg',
      buttonText: 'Download for macOS',
    },
    {
      name: 'Linux',
      icon: <AndroidIcon fontSize="large" />,
      description: 'For Ubuntu, Debian, and other distributions',
      downloadLink: downloadLinks.linux,
      fileName: 'MotivationalApp-1.0.0.AppImage',
      buttonText: 'Download for Linux',
    },
  ];

  const features = [
    {
      title: 'Offline Access',
      description: 'Access your favorite quotes even without an internet connection.',
    },
    {
      title: 'Desktop Notifications',
      description: 'Get timely reminders with your daily dose of motivation.',
    },
    {
      title: 'Seamless Sync',
      description: 'Your favorites and preferences sync across all your devices.',
    },
    {
      title: 'Enhanced Performance',
      description: 'Enjoy a faster, more responsive experience with our native app.',
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
            Download Our App
          </Typography>
          <Typography variant="h5" align="center" color="text.secondary" paragraph>
            Get the Motivational Quotes app for your desktop and enjoy offline access,
            desktop notifications, and a seamless experience across all your devices.
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <CloudDownloadIcon sx={{ fontSize: 100, color: 'primary.main', opacity: 0.8 }} />
          </Box>
        </Container>
      </Box>

      {/* Download Options */}
      <Container sx={{ py: 8 }} maxWidth="lg">
        <Typography
          component="h2"
          variant="h4"
          align="center"
          color="text.primary"
          gutterBottom
        >
          Choose Your Platform
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {platforms.map((platform) => (
            <Grid item key={platform.name} xs={12} md={4}>
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box
                    sx={{
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      mx: 'auto',
                    }}
                  >
                    {platform.icon}
                  </Box>
                  <Typography variant="h5" component="div" gutterBottom>
                    {platform.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {platform.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    File: {platform.fileName}
                  </Typography>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<DownloadIcon />}
                    href={platform.downloadLink}
                    fullWidth
                  >
                    {platform.buttonText}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="md">
          <Typography
            component="h2"
            variant="h4"
            align="center"
            color="text.primary"
            gutterBottom
          >
            Why Use Our Desktop App?
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {features.map((feature, index) => (
              <Grid item key={index} xs={12} sm={6}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
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

      {/* Installation Instructions */}
      <Container sx={{ py: 8 }} maxWidth="md">
        <Typography
          component="h2"
          variant="h4"
          align="center"
          color="text.primary"
          gutterBottom
        >
          Installation Instructions
        </Typography>
        <Paper elevation={2} sx={{ p: 4, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Windows
          </Typography>
          <Typography variant="body2" paragraph>
            1. Download the .exe installer file
            <br />
            2. Double-click the downloaded file
            <br />
            3. Follow the installation wizard
            <br />
            4. Launch the app from your Start menu
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            macOS
          </Typography>
          <Typography variant="body2" paragraph>
            1. Download the .dmg file
            <br />
            2. Double-click the downloaded file
            <br />
            3. Drag the app to your Applications folder
            <br />
            4. Launch the app from your Applications folder or Launchpad
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Linux
          </Typography>
          <Typography variant="body2" paragraph>
            1. Download the .AppImage file
            <br />
            2. Make the file executable: <code>chmod +x MotivationalApp-1.0.0.AppImage</code>
            <br />
            3. Run the app: <code>./MotivationalApp-1.0.0.AppImage</code>
          </Typography>
        </Paper>
      </Container>

      {/* System Requirements */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="md">
          <Typography
            component="h2"
            variant="h4"
            align="center"
            color="text.primary"
            gutterBottom
          >
            System Requirements
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Windows
                </Typography>
                <Typography variant="body2" component="ul">
                  <li>Windows 10 or later</li>
                  <li>4GB RAM</li>
                  <li>100MB free disk space</li>
                  <li>Internet connection for updates</li>
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  macOS
                </Typography>
                <Typography variant="body2" component="ul">
                  <li>macOS 10.15 Catalina or later</li>
                  <li>4GB RAM</li>
                  <li>100MB free disk space</li>
                  <li>Internet connection for updates</li>
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Linux
                </Typography>
                <Typography variant="body2" component="ul">
                  <li>Ubuntu 18.04 or equivalent</li>
                  <li>4GB RAM</li>
                  <li>100MB free disk space</li>
                  <li>Internet connection for updates</li>
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Downloads;