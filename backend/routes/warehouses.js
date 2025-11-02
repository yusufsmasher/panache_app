const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   POST /api/warehouses
// @desc    Create warehouse (Admin only)
// @access  Private (Admin)
router.post('/', [
  auth,
  authorize('admin'),
  body('name').trim().notEmpty().withMessage('Warehouse name is required'),
  body('branch').trim().notEmpty().withMessage('Branch name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, branch, address, location } = req.body;

    const warehouse = new Warehouse({
      name,
      branch,
      address,
      location,
      createdBy: req.user._id
    });

    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Warehouse with this name and branch already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/warehouses
// @desc    Get all warehouses
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true })
      .populate('createdBy', 'name email');
    res.json(warehouses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/warehouses/:id
// @desc    Get warehouse by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id)
      .populate('createdBy', 'name email');
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    res.json(warehouse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/warehouses/:id
// @desc    Update warehouse (Admin only)
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, branch, address, location } = req.body;
    const warehouse = await Warehouse.findById(req.params.id);
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    if (name) warehouse.name = name;
    if (branch) warehouse.branch = branch;
    if (address) warehouse.address = address;
    if (location) warehouse.location = location;

    await warehouse.save();
    res.json(warehouse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/warehouses/:id
// @desc    Delete warehouse (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    warehouse.isActive = false;
    await warehouse.save();
    res.json({ message: 'Warehouse deactivated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

