# Motivational Quotes Application

A cross-platform application that provides users with daily motivational quotes. Available as both a web application and a desktop application for all major platforms.

## Project Overview

This application allows users to create accounts, log in, and receive randomly generated motivational quotes. It includes:

- Web application (React.js)
- Desktop application (Electron)
- Backend services (Node.js/Express)
- Admin dashboard
- Firebase authentication
- MongoDB database

## Key Features

- **User Authentication**: Secure login and registration using Firebase
- **Daily Quotes**: Receive new motivational quotes daily
- **Quote Categories**: Browse quotes by categories/tags
- **Favorites**: Save your favorite quotes for later reference
- **Offline Mode**: Desktop app works without internet connection
- **Cross-Platform**: Use on web browsers or as a desktop application
- **Admin Dashboard**: Manage users, quotes, and view analytics
- **Dark/Light Mode**: Choose your preferred theme
- **Responsive Design**: Works on mobile, tablet, and desktop devices

## Repository Structure

```
motivational-app/
├── web/                  # Web application (React)
│   ├── public/           # Static assets
│   └── src/              # Source code
│       ├── components/   # Reusable UI components
│       ├── pages/        # Page components
│       ├── services/     # API services
│       ├── utils/        # Utility functions
│       └── assets/       # Images, fonts, etc.
│
├── desktop/              # Desktop application (Electron)
│   ├── src/              # Source code
│   │   ├── components/   # UI components
│   │   ├── services/     # Services
│   │   ├── utils/        # Utility functions
│   │   └── assets/       # Assets
│   └── build/            # Build output
│
├── server/               # Backend server (Express)
│   ├── src/              # Source code
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Database models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Utility functions
│   │   └── middleware/   # Express middleware
│   └── config/           # Configuration files
│
├── docs/                 # Documentation
│   ├── architecture/     # Architecture diagrams
│   ├── api/              # API documentation
│   └── deployment/       # Deployment guides
│
└── scripts/              # Utility scripts
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MongoDB (local installation or MongoDB Atlas account)
- Firebase account (for authentication)
- Redis (optional, for rate limiting)
- Docker (optional, for production deployment)
- Postman (optional, for API testing)

### Environment Setup

1. Clone the repository

```bash
git clone <repository-url>
cd motivational-app
```

2. Set up environment variables

Create `.env` files in the web, desktop, and server directories based on the provided `.env.example` files:

```bash
# For server
cp server/.env.example server/.env

# For web application
cp web/.env.example web/.env

# For desktop application
cp desktop/.env.example desktop/.env
```

3. Configure Firebase

- Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
- Enable Authentication with Email/Password provider
- Create a web app in your Firebase project
- Copy the Firebase configuration to your `.env` files
- Generate a Firebase Admin SDK private key and add it to the server `.env` file

4. Configure MongoDB

- Set up a MongoDB database (local or MongoDB Atlas)
- Update the `MONGODB_URI` in the server `.env` file

## Technologies Used

### Frontend (Web & Desktop)
- **React**: UI library for building component-based interfaces
- **Material-UI**: UI framework for consistent design
- **React Router**: For client-side routing
- **Axios**: HTTP client for API requests
- **Firebase Auth**: Authentication service
- **Electron** (Desktop only): Framework for building cross-platform desktop apps

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web framework for Node.js
- **MongoDB**: NoSQL database for data storage
- **Mongoose**: MongoDB object modeling
- **Firebase Admin SDK**: For authentication verification
- **Redis** (optional): For rate limiting and caching
- **JWT**: For secure API authentication

### Development & Testing
- **Jest**: Testing framework
- **Supertest**: HTTP testing library
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Webpack**: Module bundling
- **Babel**: JavaScript compiler

### DevOps
- **Docker**: Containerization
- **GitHub Actions**: CI/CD
- **AWS**: Cloud deployment

### Development

#### Web Application

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm start
```

The web application will be available at http://localhost:3000

#### Desktop Application

```bash
# Navigate to desktop directory
cd desktop

# Install dependencies
npm install

# Start development mode
npm start
```

This will launch the Electron app in development mode.

#### Server

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start development server with hot-reloading
npm run dev
```

The API server will be available at http://localhost:5000

#### Running All Components Together

For full-stack development, you'll need to run all three components. You can use separate terminal windows or use a tool like concurrently:

```bash
# Install concurrently globally
npm install -g concurrently

# Run all components
concurrently "cd server && npm run dev" "cd web && npm start" "cd desktop && npm start"
```

### Building for Production

#### Web Application

```bash
cd web
npm run build
```

#### Desktop Application

```bash
cd desktop
npm run build
```

This will create installers for Windows, macOS, and Linux in the `desktop/build` directory.

#### Server

```bash
cd server
npm run build
```

## Deployment

### Web Application

The web application can be deployed to AWS S3 and CloudFront:

```bash
cd web
npm run deploy
```

### Server

The server can be deployed using Docker:

```bash
cd server
docker build -t motivational-app-server .
docker run -p 5000:5000 motivational-app-server
```

See the deployment documentation in `docs/deployment` for detailed instructions.

## Firebase Integration

This application uses Firebase for authentication. You'll need to create a Firebase project and configure it with the appropriate credentials.

## MongoDB Integration

The application uses MongoDB for data storage. You'll need to set up a MongoDB instance and configure the connection in the server's environment variables.

## Admin Dashboard

The admin dashboard is accessible at `/admin` on the web application. It requires admin privileges to access.

## API Testing

This project includes multiple ways to test the API:

### Using the Test Script

```bash
cd server
npm run test:api
```

This will run a Node.js script that tests the basic API endpoints.

### Using Postman

The project includes a Postman collection for testing all API endpoints:

1. Import the collection from `server/postman/motivational-quotes-api.json`
2. Import the environment from `server/postman/environment.json`
3. Run the collection in Postman

### Using Newman (Postman CLI)

```bash
cd server
npm run test:postman
```

This will run the Postman collection using Newman, Postman's command-line collection runner.

### Using Postman MCP

```bash
cd server
npm run test:postman:mcp
```

This will run the Postman collection using the Postman MCP (Machine Collaboration Protocol) server.

Alternatively, you can use the provided shell scripts:

```bash
# On macOS/Linux
cd server/postman
./run-mcp-tests.sh

# On Windows
cd server\postman
run-mcp-tests.bat
```

For more information on using Postman MCP, see `server/postman/POSTMAN_MCP.md`.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.