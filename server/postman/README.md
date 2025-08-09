# Motivational Quotes API - Postman Collection

This directory contains a Postman collection for testing the Motivational Quotes API endpoints.

## Getting Started

### Prerequisites

- [Postman](https://www.postman.com/downloads/) installed on your machine
- The Motivational Quotes server running locally

### Importing the Collection

1. Open Postman
2. Click on "Import" in the top left corner
3. Select the `motivational-quotes-api.json` file from this directory
4. Click "Import"

### Collection Variables

The collection uses the following variables that you can update as needed:

- `baseUrl`: The base URL of the API server (default: `http://localhost:5001`)
- `authToken`: Authentication token for regular user endpoints
- `adminToken`: Authentication token for admin endpoints
- `quoteId`: ID of a quote for testing quote-specific endpoints
- `userId`: ID of a user for testing user-specific endpoints
- `tag`: Tag name for testing tag-related endpoints

### Setting Up Authentication

1. Use the "Login" request in the Authentication folder to obtain a token
2. Copy the token from the response
3. Update the `authToken` variable in the collection variables
4. For admin endpoints, login with an admin account and update the `adminToken` variable

## Available Endpoints

### Health
- `GET /health` - Check if the API server is running

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get authentication token

### Quotes
- `GET /api/quotes/random` - Get a random quote
- `GET /api/quotes` - Get all quotes with pagination
- `GET /api/quotes/:id` - Get a specific quote by ID
- `GET /api/quotes/tag/:tag` - Get quotes by tag
- `POST /api/quotes` - Create a new quote (requires authentication)
- `PUT /api/quotes/:id` - Update an existing quote (requires authentication)
- `DELETE /api/quotes/:id` - Delete a quote (requires authentication)

### User
- `GET /api/users/profile` - Get user profile (requires authentication)
- `PUT /api/users/profile` - Update user profile (requires authentication)
- `GET /api/users/favorites` - Get user's favorite quotes (requires authentication)
- `POST /api/users/favorites` - Add a quote to favorites (requires authentication)
- `DELETE /api/users/favorites/:id` - Remove a quote from favorites (requires authentication)

### Admin
- `GET /api/admin/dashboard` - Get admin dashboard statistics (requires admin role)
- `GET /api/admin/users` - Get all users (requires admin role)
- `PUT /api/admin/users/:id/role` - Update a user's role (requires admin role)
- `GET /api/admin/logs` - Get activity logs (requires admin role)

## Testing Workflow

1. Start with the Health Check endpoint to ensure the server is running
2. Register a new user or login with an existing user
3. Use the token to authenticate requests that require authentication
4. Test the various endpoints as needed

## Automated Testing

You can also run automated tests using the Node.js script:

```bash
npm run test:api
```

This script tests the basic functionality of the API without requiring authentication.