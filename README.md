# House Taxation Management System

This project consists of a React Frontend and a Node.js/Express Backend.

## Prerequisites

- **Node.js**: Ensure Node.js is installed.
- **MongoDB**: Ensure MongoDB is installed and running locally on port `27017`.

## Step-by-Step Running Instructions

### 1. Start the Backend

The backend handles the API and database connections.

1. Open a terminal.
2. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
3. Install dependencies (if not already done):
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
   *The server will start at `http://localhost:5000`.*

### 2. Start the Frontend

The frontend is the user interface.

1. Open a **new** terminal window.
2. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
3. Install dependencies (if not already done):
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *The application will typically open at `http://localhost:5173`.*

## Admin Credentials

An admin user has been created in the backend:

- **Email**: `admin@tax.so`
- **Password**: `password123`
- **Role**: `Super Admin`

## Important Note

Currently, the **Frontend is running in "Mock Mode"**. This means it is using static data defined in the code and is **not yet connected** to the Backend API.

To connect them, the Frontend code needs to be updated to make API calls to `http://localhost:5000` instead of using local state.
