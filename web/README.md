# Motivational Quotes Web Application

## Overview

This is the web application for the Motivational Quotes platform. It provides users with daily motivational quotes, allows them to save favorites, manage their profile, and more. The application is built with React and uses Firebase for authentication.

## Features

- User authentication (login, registration, password reset)
- Daily motivational quotes
- Save favorite quotes
- User profile management
- Quote sharing
- Admin panel for managing quotes and users
- Responsive design for all devices

## Tech Stack

- React.js
- Material-UI for UI components
- Firebase Authentication
- Axios for API requests
- React Router for navigation
- Recharts for data visualization (admin dashboard)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase project

### Installation

1. Clone the repository
2. Navigate to the web directory: `cd motivational-app/web`
3. Install dependencies: `npm install` or `yarn install`
4. Copy `.env.example` to `.env` and fill in your Firebase configuration
5. Start the development server: `npm start` or `yarn start`

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# API Configuration
REACT_APP_API_URL=http://localhost:5000

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from create-react-app

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── services/       # API and other services
├── utils/          # Utility functions
├── assets/         # Static assets
├── App.js          # Main App component
├── index.js        # Entry point
└── index.css       # Global styles
```

## Deployment

To deploy the application:

1. Build the project: `npm run build`
2. Deploy to Firebase Hosting:
   ```
   npm install -g firebase-tools
   firebase login
   firebase init
   firebase deploy
   ```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.