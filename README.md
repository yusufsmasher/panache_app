# Panache Tile Business Management System

A comprehensive mobile and web application for managing a tile flooring business with role-based access control.

## Features

### Roles
- **Admin**: Full system access
- **Distributor**: Can place orders (up to 10 items)
- **Dealer**: Can place orders (up to 10 items)

### Admin Features
- Create and manage users (Distributors and Dealers)
- Create and manage warehouses with branches
- Manage stock inventory
- Import stocks from Excel files
- View and manage all orders
- Update order status

### Distributor/Dealer Features
- View available stocks
- Create orders (maximum 10 items per order)
- View their own orders
- Track order status

## Tech Stack

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT Authentication
- Excel import (xlsx)

### Frontend (Web)
- React
- React Router
- Axios for API calls

### Mobile
- React Native with Expo
- React Navigation
- AsyncStorage for token management

## Project Structure

```
panache_app/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Warehouse.js
│   │   ├── Stock.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── warehouses.js
│   │   ├── stocks.js
│   │   └── orders.js
│   ├── middleware/
│   │   └── auth.js
│   ├── scripts/
│   │   └── createAdmin.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── App.js
│   └── package.json
├── mobile/
│   ├── src/
│   │   ├── screens/
│   │   ├── navigation/
│   │   └── context/
│   ├── App.js
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB installed and running
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file by copying `.env.example`:
```bash
cp .env.example .env
```

Or create it manually with:
```bash
PORT=5000
MONGODB_URI=mongodb+srv://yusufsmasher:ffrLlbqjcWenskYH@fmbashara1446.c8l53jz.mongodb.net/panache_app?retryWrites=true&w=majority&appName=fmbashara1446
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

4. Start the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup (Web)

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The web application will run on `http://localhost:3000`

### Mobile Setup

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start Expo:
```bash
npm start
```

4. Use Expo Go app on your mobile device or run on emulator:
```bash
npm run android  # For Android
npm run ios      # For iOS
```

**Note**: Update the API base URL in `mobile/src/context/AuthContext.js` to match your backend server address if running on a different machine or emulator.

## Initial Admin User Setup

You'll need to create the first admin user manually in MongoDB or using a script. The script is located at `backend/scripts/createAdmin.js`.

Run it with:
```bash
node backend/scripts/createAdmin.js
```

## Excel Import Format

When importing stocks from Excel, ensure your file has the following columns:
- Product Name (required)
- Product Code
- Category
- Size
- Color
- Quantity (required)
- Price (required)
- Unit (defaults to "pieces")
- Description

Column names are case-insensitive and can include spaces.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (Admin only)
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user (Admin only)

### Warehouses
- `GET /api/warehouses` - Get all warehouses
- `POST /api/warehouses` - Create warehouse (Admin only)
- `GET /api/warehouses/:id` - Get warehouse by ID
- `PUT /api/warehouses/:id` - Update warehouse (Admin only)
- `DELETE /api/warehouses/:id` - Delete warehouse (Admin only)

### Stocks
- `GET /api/stocks` - Get all stocks
- `POST /api/stocks` - Create stock (Admin only)
- `POST /api/stocks/import-excel` - Import from Excel (Admin only)
- `GET /api/stocks/:id` - Get stock by ID
- `PUT /api/stocks/:id` - Update stock (Admin only)
- `DELETE /api/stocks/:id` - Delete stock (Admin only)

### Orders
- `GET /api/orders` - Get orders
- `POST /api/orders` - Create order (Dealer/Distributor)
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/status` - Update order status (Admin only)
- `DELETE /api/orders/:id` - Cancel order

## Security Notes

- Change the JWT_SECRET in production
- Use strong passwords for admin accounts
- Implement rate limiting in production
- Use HTTPS in production
- Regularly update dependencies

## License

This project is created for Panache Tile Business.

