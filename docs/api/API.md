# API Documentation

## Motivational Quotes Application

This document outlines the API endpoints for the Motivational Quotes Application.

## Base URL

```
https://api.motivational-app.com
```

For local development:

```
http://localhost:5000
```

## Authentication

All API requests (except for public endpoints) require authentication using Firebase JWT tokens.

Include the token in the Authorization header:

```
Authorization: Bearer <firebase-jwt-token>
```

## Rate Limiting

API requests are subject to rate limiting to prevent abuse. The current limits are:

- 100 requests per minute for regular users
- 300 requests per minute for premium users

When a rate limit is exceeded, the API will respond with a 429 Too Many Requests status code.

## Endpoints

### Authentication

#### Verify Token

```
GET /api/auth/verify
```

Verifies the validity of the authentication token and returns user information.

**Response:**

```json
{
  "user": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "User Name",
    "role": "user"
  }
}
```

### Quotes

#### Get Random Quote

```
GET /api/quotes/random
```

Returns a random motivational quote.

**Response:**

```json
{
  "quote": {
    "id": "quote-id",
    "text": "The only way to do great work is to love what you do.",
    "author": "Steve Jobs",
    "source": "Stanford Commencement Address, 2005",
    "tags": ["inspiration", "work", "passion"]
  }
}
```

#### Get Quote by ID

```
GET /api/quotes/:id
```

Returns a specific quote by ID.

**Parameters:**

- `id`: The ID of the quote

**Response:**

```json
{
  "quote": {
    "id": "quote-id",
    "text": "The only way to do great work is to love what you do.",
    "author": "Steve Jobs",
    "source": "Stanford Commencement Address, 2005",
    "tags": ["inspiration", "work", "passion"]
  }
}
```

#### Get Quotes by Tag

```
GET /api/quotes/tag/:tag
```

Returns quotes with a specific tag.

**Parameters:**

- `tag`: The tag to filter by

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Number of quotes per page (default: 10)

**Response:**

```json
{
  "quotes": [
    {
      "id": "quote-id-1",
      "text": "The only way to do great work is to love what you do.",
      "author": "Steve Jobs",
      "source": "Stanford Commencement Address, 2005",
      "tags": ["inspiration", "work", "passion"]
    },
    {
      "id": "quote-id-2",
      "text": "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
      "author": "Steve Jobs",
      "source": "Stanford Commencement Address, 2005",
      "tags": ["inspiration", "work", "satisfaction"]
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

#### Create Quote (Admin Only)

```
POST /api/quotes
```

Creates a new quote. Requires admin privileges.

**Request Body:**

```json
{
  "text": "Life is what happens when you're busy making other plans.",
  "author": "John Lennon",
  "source": "Interview, 1980",
  "tags": ["life", "planning", "wisdom"]
}
```

**Response:**

```json
{
  "quote": {
    "id": "new-quote-id",
    "text": "Life is what happens when you're busy making other plans.",
    "author": "John Lennon",
    "source": "Interview, 1980",
    "tags": ["life", "planning", "wisdom"],
    "createdAt": "2023-06-15T10:30:00Z"
  }
}
```

#### Update Quote (Admin Only)

```
PUT /api/quotes/:id
```

Updates an existing quote. Requires admin privileges.

**Parameters:**

- `id`: The ID of the quote to update

**Request Body:**

```json
{
  "text": "Life is what happens when you're busy making other plans.",
  "author": "John Lennon",
  "source": "Interview with David Sheff, 1980",
  "tags": ["life", "planning", "wisdom", "perspective"]
}
```

**Response:**

```json
{
  "quote": {
    "id": "quote-id",
    "text": "Life is what happens when you're busy making other plans.",
    "author": "John Lennon",
    "source": "Interview with David Sheff, 1980",
    "tags": ["life", "planning", "wisdom", "perspective"],
    "updatedAt": "2023-06-15T11:45:00Z"
  }
}
```

#### Delete Quote (Admin Only)

```
DELETE /api/quotes/:id
```

Deletes a quote. Requires admin privileges.

**Parameters:**

- `id`: The ID of the quote to delete

**Response:**

```json
{
  "success": true,
  "message": "Quote deleted successfully"
}
```

### User Management

#### Get User Profile

```
GET /api/users/profile
```

Returns the profile of the authenticated user.

**Response:**

```json
{
  "user": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "User Name",
    "role": "user",
    "createdAt": "2023-05-10T08:15:00Z",
    "lastLogin": "2023-06-15T09:30:00Z",
    "preferences": {
      "theme": "light",
      "emailNotifications": true
    }
  }
}
```

#### Update User Profile

```
PUT /api/users/profile
```

Updates the profile of the authenticated user.

**Request Body:**

```json
{
  "displayName": "New User Name",
  "preferences": {
    "theme": "dark",
    "emailNotifications": false
  }
}
```

**Response:**

```json
{
  "user": {
    "uid": "firebase-user-id",
    "email": "user@example.com",
    "displayName": "New User Name",
    "role": "user",
    "preferences": {
      "theme": "dark",
      "emailNotifications": false
    },
    "updatedAt": "2023-06-15T14:20:00Z"
  }
}
```

#### Get User Activity

```
GET /api/users/activity
```

Returns the activity history of the authenticated user.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Number of activities per page (default: 10)

**Response:**

```json
{
  "activities": [
    {
      "id": "activity-id-1",
      "action": "login",
      "timestamp": "2023-06-15T09:30:00Z",
      "details": {
        "ip": "192.168.1.1",
        "device": "Desktop - Chrome 114"
      }
    },
    {
      "id": "activity-id-2",
      "action": "quote_viewed",
      "timestamp": "2023-06-15T09:32:00Z",
      "details": {
        "quoteId": "quote-id-1"
      }
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

### Admin

#### Get All Users (Admin Only)

```
GET /api/admin/users
```

Returns a list of all users. Requires admin privileges.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Number of users per page (default: 10)
- `search`: Search term for email or display name

**Response:**

```json
{
  "users": [
    {
      "uid": "user-id-1",
      "email": "user1@example.com",
      "displayName": "User One",
      "role": "user",
      "createdAt": "2023-05-10T08:15:00Z",
      "lastLogin": "2023-06-15T09:30:00Z"
    },
    {
      "uid": "user-id-2",
      "email": "user2@example.com",
      "displayName": "User Two",
      "role": "admin",
      "createdAt": "2023-04-20T11:45:00Z",
      "lastLogin": "2023-06-14T16:20:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 10,
    "pages": 16
  }
}
```

#### Get System Stats (Admin Only)

```
GET /api/admin/stats
```

Returns system statistics. Requires admin privileges.

**Response:**

```json
{
  "stats": {
    "totalUsers": 156,
    "activeUsers": {
      "daily": 42,
      "weekly": 98,
      "monthly": 134
    },
    "totalQuotes": 500,
    "quotesServed": {
      "daily": 1250,
      "weekly": 8750,
      "monthly": 37500
    },
    "topQuotes": [
      {
        "id": "quote-id-1",
        "text": "The only way to do great work is to love what you do.",
        "views": 1200
      },
      {
        "id": "quote-id-2",
        "text": "Life is what happens when you're busy making other plans.",
        "views": 950
      }
    ],
    "registrations": {
      "daily": 5,
      "weekly": 32,
      "monthly": 124
    }
  }
}
```

## Error Responses

All endpoints return standard error responses in the following format:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
```

### Common Error Codes

- `authentication_required`: No authentication token provided
- `invalid_token`: Invalid or expired authentication token
- `permission_denied`: Insufficient permissions for the requested operation
- `not_found`: The requested resource was not found
- `validation_error`: Invalid request parameters or body
- `rate_limit_exceeded`: Too many requests, rate limit exceeded
- `internal_error`: Internal server error

## Versioning

The API uses URL versioning. The current version is v1, which is implied in the base URL. Future versions will be explicitly specified:

```
https://api.motivational-app.com/v2/...
```

## Changelog

### v1.0.0 (2023-06-01)

- Initial API release

### v1.1.0 (2023-07-15)

- Added user activity endpoints
- Improved rate limiting
- Added quote tags filtering