const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/warehouses', require('./routes/warehouses'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://yusufsmasher:ffrLlbqjcWenskYH@fmbashara1446.c8l53jz.mongodb.net/panache_app?retryWrites=true&w=majority&appName=fmbashara1446')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

