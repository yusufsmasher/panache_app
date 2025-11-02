const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Stock = require('../models/Stock');
const Warehouse = require('../models/Warehouse');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// @route   POST /api/stocks
// @desc    Create stock item (Admin only)
// @access  Private (Admin)
router.post('/', [
  auth,
  authorize('admin'),
  body('warehouse').notEmpty().withMessage('Warehouse is required'),
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('quantity').isNumeric().withMessage('Quantity must be a number'),
  body('price').isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const stock = new Stock({
      ...req.body,
      createdBy: req.user._id
    });

    await stock.save();
    await stock.populate('warehouse');
    res.status(201).json(stock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/stocks/import-excel
// @desc    Import stocks from Excel file (Admin only)
// @access  Private (Admin)
router.post('/import-excel', auth, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { warehouseId } = req.body;
    if (!warehouseId) {
      return res.status(400).json({ message: 'Warehouse ID is required' });
    }

    // Verify warehouse exists
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const stocks = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const stock = new Stock({
          warehouse: warehouseId,
          productName: row.productName || row['Product Name'] || row['Product'],
          productCode: row.productCode || row['Product Code'] || row['Code'],
          category: row.category || row['Category'],
          size: row.size || row['Size'],
          color: row.color || row['Color'],
          quantity: parseInt(row.quantity || row['Quantity'] || 0),
          unit: row.unit || row['Unit'] || 'pieces',
          price: parseFloat(row.price || row['Price'] || 0),
          description: row.description || row['Description'],
          createdBy: req.user._id
        });

        await stock.save();
        stocks.push(stock);
      } catch (error) {
        errors.push({ row: i + 2, error: error.message, data: row });
      }
    }

    res.json({
      message: `Imported ${stocks.length} stocks successfully`,
      imported: stocks.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stocks
// @desc    Get all stocks (with filters)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { warehouse, category, search } = req.query;
    const query = {};

    if (warehouse) query.warehouse = warehouse;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } }
      ];
    }

    const stocks = await Stock.find(query)
      .populate('warehouse', 'name branch')
      .sort({ createdAt: -1 });
    
    res.json(stocks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/stocks/:id
// @desc    Get stock by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id).populate('warehouse');
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    res.json(stock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/stocks/:id
// @desc    Update stock (Admin only)
// @access  Private (Admin)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    Object.assign(stock, req.body);
    await stock.save();
    await stock.populate('warehouse');
    
    res.json(stock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/stocks/:id
// @desc    Delete stock (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    await stock.deleteOne();
    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

