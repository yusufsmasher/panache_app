const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  lotNo: {
    type: String,
    required: true,
    trim: true
  },
  received: {
    type: Number,
    default: 0,
    min: 0
  },
  pcs: {
    type: Number,
    default: 0,
    min: 0
  },
  sqft: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: true });

const colorSchema = new mongoose.Schema({
  colorName: {
    type: String,
    required: true,
    trim: true
  },
  lots: [lotSchema],
  totalPcs: {
    type: Number,
    default: 0
  },
  totalSqft: {
    type: Number,
    default: 0
  }
}, { _id: true });

const stockSchema = new mongoose.Schema({
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  productName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  productCode: {
    type: String,
    trim: true,
    index: true
  },
  category: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    trim: true
  },
  colors: [colorSchema],
  price: {
    type: Number,
    min: 0
  },
  unit: {
    type: String,
    default: 'pieces'
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
stockSchema.index({ warehouse: 1, productName: 1 });
stockSchema.index({ warehouse: 1, productCode: 1 });
stockSchema.index({ 'colors.colorName': 1 });

// Method to calculate totals for a color
colorSchema.methods.calculateTotals = function() {
  this.totalPcs = this.lots.reduce((sum, lot) => sum + (lot.pcs || 0), 0);
  this.totalSqft = this.lots.reduce((sum, lot) => sum + (lot.sqft || 0), 0);
  return this;
};

// Method to get total stock across all colors
stockSchema.methods.getTotalStock = function() {
  return this.colors.reduce((total, color) => total + (color.totalPcs || 0), 0);
};

// Pre-save hook to calculate totals for all colors
stockSchema.pre('save', function(next) {
  if (this.colors) {
    this.colors.forEach(color => {
      color.calculateTotals();
    });
  }
  next();
});

module.exports = mongoose.model('Stock', stockSchema);

