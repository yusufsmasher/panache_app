const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const Warehouse = require('../models/Warehouse');
const { auth, authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Helper function to parse Excel and extract product data
const parseExcelFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const products = [];

  // Check if we have at least 2 sheets (using 2nd sheet for product name)
  if (workbook.SheetNames.length < 2) {
    throw new Error('Excel file must have at least 2 sheets. Second sheet name should be the product name.');
  }

  // Get the 2nd sheet (index 1) - this is the product sheet
  const productSheetName = workbook.SheetNames[1];
  const worksheet = workbook.Sheets[productSheetName];
  
  // Convert sheet to array of arrays (raw data)
  const rawData = xlsx.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: ''
  });

  console.log('Total rows in sheet:', rawData.length);

  // Find where tables start (looking for DATE, LOTNO, RECIVED, PCS, SQFT headers)
  const requiredHeaders = ['DATE', 'LOTNO', 'RECIVED', 'PCS', 'SQFT'];
  
  const colors = [];
  let currentColor = null;
  let headerRowIndex = -1;
  let headerIndices = {};
  let foundHeaders = false;

  for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
    const row = rawData[rowIndex];
    
    // Skip completely empty rows
    if (!row || (Array.isArray(row) && row.every(cell => !cell || String(cell).trim() === ''))) {
      // If we hit an empty row after processing a table, save the current color
      if (foundHeaders && currentColor && currentColor.lots.length > 0) {
        colors.push({ ...currentColor });
        currentColor = null;
        foundHeaders = false;
        headerRowIndex = -1;
        headerIndices = {};
      }
      continue;
    }

    // Convert row to array
    const rowValues = Array.isArray(row) ? row : Object.values(row);
    const rowString = rowValues.map(cell => String(cell || '').toUpperCase().trim()).join('|');

    // Check if this row contains required headers (DATE, LOTNO, etc.)
    const hasAllHeaders = requiredHeaders.every(header => 
      rowString.includes(header.toUpperCase())
    );

    if (hasAllHeaders) {
      // If we were processing a previous color, save it first
      if (currentColor && currentColor.lots.length > 0) {
        colors.push({ ...currentColor });
      }

      // This is a header row - extract column indices
      headerIndices = {};
      rowValues.forEach((cell, idx) => {
        const cellValue = String(cell || '').toUpperCase().trim();
        if (cellValue === 'DATE') headerIndices.date = idx;
        if (cellValue === 'LOTNO' || cellValue === 'LOT NO' || cellValue === 'LOT') headerIndices.lotNo = idx;
        if (cellValue === 'RECIVED' || cellValue === 'RECEIVED') headerIndices.received = idx;
        if (cellValue === 'PCS' || cellValue === 'PIECES') headerIndices.pcs = idx;
        if (cellValue === 'SQFT' || cellValue === 'SQ FT' || cellValue === 'SQUARE FEET') headerIndices.sqft = idx;
      });

      // Look for color name in the row BEFORE the header row (usually 1-2 rows above)
      let colorName = '';
      for (let lookBack = 1; lookBack <= 3 && rowIndex - lookBack >= 0; lookBack++) {
        const prevRow = rawData[rowIndex - lookBack];
        if (prevRow && Array.isArray(prevRow) && prevRow[0]) {
          const candidate = String(prevRow[0]).trim();
          // Check if it looks like a color name (not a header, not a number, reasonable length)
          if (candidate && 
              candidate.length > 0 && 
              candidate.length < 50 &&
              !candidate.match(/^\d+$/) &&
              !candidate.match(/DATE|LOTNO|RECIVED|PCS|SQFT|LOT NO|TOTAL|SUBTOTAL/i) &&
              !requiredHeaders.some(h => candidate.toUpperCase().includes(h))) {
            colorName = candidate;
            break;
          }
        }
      }

      // If no color found above, check current row's first column
      if (!colorName && rowValues[0]) {
        const candidate = String(rowValues[0]).trim();
        if (candidate && 
            candidate.length > 0 && 
            candidate.length < 50 &&
            !candidate.match(/^\d+$/) &&
            !candidate.match(/DATE|LOTNO|RECIVED|PCS|SQFT|LOT NO/i)) {
          colorName = candidate;
        }
      }

      // Start new color
      currentColor = {
        colorName: colorName || `Color-${colors.length + 1}`,
        lots: []
      };
      
      headerRowIndex = rowIndex;
      foundHeaders = true;
      console.log(`Found header row at ${rowIndex}, color: "${colorName}"`);
      continue;
    }

    // If we have header indices, this should be a data row
    if (foundHeaders && headerRowIndex !== -1 && rowIndex > headerRowIndex && currentColor) {
      const dateValue = rowValues[headerIndices.date];
      const lotNoValue = rowValues[headerIndices.lotNo];
      const receivedValue = rowValues[headerIndices.received];
      const pcsValue = rowValues[headerIndices.pcs];
      const sqftValue = rowValues[headerIndices.sqft];

      // Check if this row is actually a new header row (new table starting)
      const looksLikeHeader = requiredHeaders.some(h => 
        rowString.includes(h.toUpperCase())
      );

      if (looksLikeHeader) {
        // This is a new table - save current color and start over
        if (currentColor.lots.length > 0) {
          colors.push({ ...currentColor });
        }
        // Will be handled in next iteration
        continue;
      }

      // Skip if no meaningful data (no lot number and no values)
      if (!lotNoValue && !pcsValue && !sqftValue && !receivedValue && !dateValue) {
        // Empty row - might be end of this color's table
        continue;
      }

      // Parse date
      let date = null;
      if (dateValue) {
        if (dateValue instanceof Date) {
          date = dateValue;
        } else {
          const dateStr = String(dateValue).trim();
          if (!isNaN(dateValue) && typeof dateValue === 'number') {
            // Excel date serial number
            const excelEpoch = new Date(1899, 11, 30);
            date = new Date(excelEpoch.getTime() + dateValue * 86400000);
          } else {
            date = new Date(dateStr);
          }
          if (isNaN(date.getTime())) {
            date = new Date();
          }
        }
      } else {
        date = new Date();
      }

      // Create lot entry
      const lot = {
        date: date,
        lotNo: String(lotNoValue || '').trim() || `LOT-${rowIndex}`,
        received: parseFloat(String(receivedValue || '0').replace(/,/g, '').replace(/\(.*\)/g, '')) || 0,
        pcs: parseFloat(String(pcsValue || '0').replace(/,/g, '').replace(/\(.*\)/g, '')) || 0,
        sqft: parseFloat(String(sqftValue || '0').replace(/,/g, '').replace(/\(.*\)/g, '')) || 0
      };

      // Add lot if it has meaningful data (at least lot number or some quantity)
      if ((lot.lotNo && lot.lotNo !== `LOT-${rowIndex}`) || lot.pcs > 0 || lot.sqft > 0 || lot.received > 0) {
        currentColor.lots.push(lot);
        console.log(`Added lot for ${currentColor.colorName}:`, lot.lotNo, lot.pcs, lot.sqft);
      }
    }
  }

  // Save last color if it has data
  if (currentColor && currentColor.colorName && currentColor.lots.length > 0) {
    colors.push({ ...currentColor });
  }

  console.log(`Parsed ${colors.length} colors with total ${colors.reduce((sum, c) => sum + c.lots.length, 0)} lots`);

  // Build product object only if we have colors
  if (colors.length > 0) {
    products.push({
      productName: productSheetName,
      colors: colors
    });
  }

  return products;
};

// @route   POST /api/stocks
// @desc    Create stock item (Admin only)
// @access  Private (Admin)
router.post('/', [
  auth,
  authorize('admin'),
  body('warehouse').notEmpty().withMessage('Warehouse is required'),
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('colors').isArray({ min: 1 }).withMessage('At least one color is required'),
  body('colors.*.colorName').trim().notEmpty().withMessage('Color name is required for each color'),
  body('colors.*.lots').isArray({ min: 1 }).withMessage('At least one lot is required for each color'),
  body('colors.*.lots.*.date').notEmpty().withMessage('Date is required for each lot'),
  body('colors.*.lots.*.lotNo').trim().notEmpty().withMessage('Lot number is required for each lot'),
  body('colors.*.lots.*.pcs').isNumeric().withMessage('PCS must be a number'),
  body('colors.*.lots.*.sqft').isNumeric().withMessage('SQFT must be a number'),
  body('price').optional().isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Ensure colors have calculated totals
    const colorsWithTotals = req.body.colors.map(color => {
      const totalPcs = color.lots.reduce((sum, lot) => sum + (parseFloat(lot.pcs) || 0), 0);
      const totalSqft = color.lots.reduce((sum, lot) => sum + (parseFloat(lot.sqft) || 0), 0);
      return {
        ...color,
        totalPcs,
        totalSqft
      };
    });

    const stock = new Stock({
      warehouse: req.body.warehouse,
      productName: req.body.productName,
      productCode: req.body.productCode || '',
      category: req.body.category || '',
      size: req.body.size || '',
      price: req.body.price || 0,
      description: req.body.description || '',
      colors: colorsWithTotals,
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
// @desc    Import stocks from Excel file (Testing - No Auth Required)
// @access  Public (for testing)
router.post('/import-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { warehouseId } = req.body;

    // Read and parse Excel file
    let parsedProducts = [];
    try {
      parsedProducts = parseExcelFile(req.file.path);
      console.log('Parsed products:', JSON.stringify(parsedProducts, null, 2));
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        message: 'Error parsing Excel file', 
        error: parseError.message 
      });
    }

    if (parsedProducts.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'No products found in Excel file' });
    }

    // Validate parsed data
    for (const product of parsedProducts) {
      if (!product.productName) {
        console.warn('Product missing name:', product);
      }
      if (!product.colors || product.colors.length === 0) {
        console.warn('Product missing colors:', product);
      } else {
        product.colors.forEach(color => {
          if (!color.colorName) {
            console.warn('Color missing name:', color);
          }
          if (!color.lots || color.lots.length === 0) {
            console.warn('Color missing lots:', color);
          }
        });
      }
    }

    const savedStocks = [];
    const errors = [];

    // Process each product
    for (const productData of parsedProducts) {
      try {
        console.log('Processing product:', productData.productName);
        console.log('Product colors count:', productData.colors?.length || 0);
        
        // Validate product data
        if (!productData.productName) {
          throw new Error('Product name is missing');
        }
        if (!productData.colors || productData.colors.length === 0) {
          throw new Error('Product has no colors');
        }

        // Validate each color has lots
        const validColors = productData.colors.filter(color => 
          color.colorName && color.lots && color.lots.length > 0
        );
        
        if (validColors.length === 0) {
          throw new Error('No valid colors with lots found');
        }

        // Check if product already exists
        let stock = await Stock.findOne({ 
          productName: productData.productName,
          warehouse: warehouseId || null
        });

        if (stock) {
          console.log('Updating existing stock:', stock._id);
          // Update existing product - merge colors
          validColors.forEach(newColor => {
            const existingColorIndex = stock.colors.findIndex(
              c => c.colorName.toLowerCase() === newColor.colorName.toLowerCase()
            );

            if (existingColorIndex >= 0) {
              // Merge lots into existing color
              newColor.lots.forEach(newLot => {
                stock.colors[existingColorIndex].lots.push(newLot);
              });
              // Recalculate totals
              const color = stock.colors[existingColorIndex];
              color.totalPcs = color.lots.reduce((sum, lot) => sum + (lot.pcs || 0), 0);
              color.totalSqft = color.lots.reduce((sum, lot) => sum + (lot.sqft || 0), 0);
            } else {
              // Add new color
              stock.colors.push({
                colorName: newColor.colorName,
                lots: newColor.lots,
                totalPcs: newColor.lots.reduce((sum, lot) => sum + (lot.pcs || 0), 0),
                totalSqft: newColor.lots.reduce((sum, lot) => sum + (lot.sqft || 0), 0)
              });
            }
          });
        } else {
          console.log('Creating new stock');
          // Create new stock
          stock = new Stock({
            warehouse: warehouseId || undefined,
            productName: productData.productName,
            colors: validColors.map(color => ({
              colorName: color.colorName,
              lots: color.lots,
              totalPcs: color.lots.reduce((sum, lot) => sum + (lot.pcs || 0), 0),
              totalSqft: color.lots.reduce((sum, lot) => sum + (lot.sqft || 0), 0)
            }))
          });
        }

        console.log('Saving stock...', {
          productName: stock.productName,
          colorsCount: stock.colors.length,
          firstColor: stock.colors[0] ? {
            colorName: stock.colors[0].colorName,
            lotsCount: stock.colors[0].lots.length
          } : null
        });

        const savedStock = await stock.save();
        console.log('Stock saved successfully:', savedStock._id);
        savedStocks.push(savedStock);
      } catch (error) {
        console.error('Error saving product:', productData.productName, error);
        errors.push({
          product: productData.productName,
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (unlinkError) {
      console.error('Error deleting uploaded file:', unlinkError);
    }

    console.log('Import completed:', {
      saved: savedStocks.length,
      errors: errors.length,
      savedIds: savedStocks.map(s => s._id.toString())
    });

    res.json({
      message: `Imported ${savedStocks.length} product(s) successfully`,
      imported: savedStocks.length,
      products: savedStocks.map(s => ({
        id: s._id,
        productName: s.productName,
        colorsCount: s.colors.length,
        totalLots: s.colors.reduce((sum, color) => sum + color.lots.length, 0)
      })),
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        parsedProductsCount: parsedProducts.length,
        savedCount: savedStocks.length,
        errorCount: errors.length
      }
    });
  } catch (error) {
    console.error('Import error:', error);
    // Clean up uploaded file
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/stocks
// @desc    Get all stocks (with filters)
// @access  Public (for testing)
router.get('/', async (req, res) => {
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
// @access  Public (for testing)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's trying to access import-excel endpoint
    if (id === 'import-excel') {
      return res.status(405).json({ 
        message: 'Method not allowed. Use POST /api/stocks/import-excel to import Excel files.' 
      });
    }
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid stock ID format' });
    }
    
    const stock = await Stock.findById(id).populate('warehouse');
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
