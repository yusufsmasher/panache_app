const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Stock = require('../models/Stock');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   POST /api/orders
// @desc    Create order (Dealer/Distributor)
// @access  Private (Dealer, Distributor)
router.post('/', [
  auth,
  body('items').isArray({ min: 1, max: 10 }).withMessage('Order must have 1-10 items'),
  body('items.*.stock').notEmpty().withMessage('Stock ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').trim().notEmpty().withMessage('Shipping address is required')
], async (req, res) => {
  try {
    // Only dealers and distributors can place orders
    if (!['dealer', 'distributor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only dealers and distributors can place orders' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, shippingAddress, notes } = req.body;

    // Validate and prepare order items
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const stock = await Stock.findById(item.stock).populate('warehouse');
      if (!stock) {
        return res.status(404).json({ message: `Stock with ID ${item.stock} not found` });
      }

      if (stock.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${stock.productName}. Available: ${stock.quantity}` 
        });
      }

      const itemTotal = stock.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        stock: stock._id,
        quantity: item.quantity,
        price: stock.price,
        total: itemTotal
      });
    }

    // Create order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      notes
    });

    await order.save();
    await order.populate('user', 'name email phone');
    await order.populate('items.stock');

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/orders
// @desc    Get orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // Non-admin users can only see their own orders
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }

    // Admin can filter by user
    if (req.user.role === 'admin' && req.query.userId) {
      query.user = req.query.userId;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email phone role')
      .populate('items.stock')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone role')
      .populate('items.stock');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Users can only see their own orders unless they're admin
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', [
  auth,
  authorize('admin'),
  body('status').isIn(['pending', 'approved', 'rejected', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = req.body.status;
    
    // If order is approved, reduce stock quantities
    if (req.body.status === 'approved' && order.status !== 'approved') {
      for (const item of order.items) {
        const stock = await Stock.findById(item.stock);
        if (stock) {
          stock.quantity -= item.quantity;
          await stock.save();
        }
      }
    }

    await order.save();
    await order.populate('user', 'name email phone');
    await order.populate('items.stock');

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel order
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Users can only cancel their own orders unless they're admin
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only pending orders can be cancelled
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

