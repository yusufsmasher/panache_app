import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Stocks = () => {
  const { user } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [importWarehouseId, setImportWarehouseId] = useState('');
  
  // New nested form structure
  const [formData, setFormData] = useState({
    warehouse: '',
    productName: '',
    productCode: '',
    category: '',
    size: '',
    price: 0,
    description: '',
    colors: []
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchWarehouses();
    fetchStocks();
  }, []);

  useEffect(() => {
    fetchStocks();
  }, [selectedWarehouse, searchTerm]);

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchStocks = async () => {
    try {
      const params = {};
      if (selectedWarehouse) params.warehouse = selectedWarehouse;
      if (searchTerm) params.search = searchTerm;
      
      const response = await axios.get('/api/stocks', { params });
      setStocks(response.data);
    } catch (error) {
      setError('Failed to fetch stocks');
    } finally {
      setLoading(false);
    }
  };

  // Add new color
  const addColor = () => {
    setFormData({
      ...formData,
      colors: [...formData.colors, {
        colorName: '',
        lots: [{
          date: new Date().toISOString().split('T')[0],
          lotNo: '',
          received: 0,
          pcs: 0,
          sqft: 0
        }]
      }]
    });
  };

  // Remove color
  const removeColor = (colorIndex) => {
    const newColors = formData.colors.filter((_, index) => index !== colorIndex);
    setFormData({ ...formData, colors: newColors });
  };

  // Update color name
  const updateColorName = (colorIndex, colorName) => {
    const newColors = [...formData.colors];
    newColors[colorIndex].colorName = colorName;
    setFormData({ ...formData, colors: newColors });
  };

  // Add lot to a color
  const addLot = (colorIndex) => {
    const newColors = [...formData.colors];
    newColors[colorIndex].lots.push({
      date: new Date().toISOString().split('T')[0],
      lotNo: '',
      received: 0,
      pcs: 0,
      sqft: 0
    });
    setFormData({ ...formData, colors: newColors });
  };

  // Remove lot from a color
  const removeLot = (colorIndex, lotIndex) => {
    const newColors = [...formData.colors];
    newColors[colorIndex].lots = newColors[colorIndex].lots.filter((_, index) => index !== lotIndex);
    setFormData({ ...formData, colors: newColors });
  };

  // Update lot field
  const updateLot = (colorIndex, lotIndex, field, value) => {
    const newColors = [...formData.colors];
    newColors[colorIndex].lots[lotIndex][field] = value;
    setFormData({ ...formData, colors: newColors });
  };

  // Calculate totals for a color
  const calculateColorTotals = (lots) => {
    return {
      totalPcs: lots.reduce((sum, lot) => sum + (parseFloat(lot.pcs) || 0), 0),
      totalSqft: lots.reduce((sum, lot) => sum + (parseFloat(lot.sqft) || 0), 0)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.productName) {
      setError('Product name is required');
      return;
    }
    if (!formData.warehouse) {
      setError('Warehouse is required');
      return;
    }
    if (formData.colors.length === 0) {
      setError('At least one color is required');
      return;
    }
    for (let i = 0; i < formData.colors.length; i++) {
      const color = formData.colors[i];
      if (!color.colorName) {
        setError(`Color name is required for color ${i + 1}`);
        return;
      }
      if (color.lots.length === 0) {
        setError(`At least one lot is required for color "${color.colorName}"`);
        return;
      }
      for (let j = 0; j < color.lots.length; j++) {
        const lot = color.lots[j];
        if (!lot.lotNo) {
          setError(`Lot number is required for lot ${j + 1} in color "${color.colorName}"`);
          return;
        }
      }
    }

    try {
      // Prepare data with calculated totals
      const submitData = {
        ...formData,
        colors: formData.colors.map(color => ({
          colorName: color.colorName,
          lots: color.lots,
          ...calculateColorTotals(color.lots)
        }))
      };

      await axios.post('/api/stocks', submitData);
      setSuccess('Stock created successfully');
      setShowModal(false);
      setFormData({
        warehouse: '',
        productName: '',
        productCode: '',
        category: '',
        size: '',
        price: 0,
        description: '',
        colors: []
      });
      fetchStocks();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create stock');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!importWarehouseId) {
      setError('Please select a warehouse');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('warehouseId', importWarehouseId);

    try {
      const response = await axios.post('/api/stocks/import-excel', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(response.data.message);
      setShowImportModal(false);
      fetchStocks();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to import stocks');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="flex-between">
        <h1>Stock Management</h1>
        {user?.role === 'admin' && (
          <div>
            <button className="btn btn-success" onClick={() => setShowImportModal(true)} style={{ marginRight: '10px' }}>
              Import from Excel
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Add Stock
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="flex">
          <div className="form-group" style={{ flex: 1, marginRight: '10px' }}>
            <label>Filter by Warehouse</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map(wh => (
                <option key={wh._id} value={wh._id}>{wh.name} - {wh.branch}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by product name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Code</th>
              <th>Warehouse</th>
              <th>Colors</th>
              <th>Total Lots</th>
              <th>Total PCS</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const totalPcs = stock.colors?.reduce((sum, color) => sum + (color.totalPcs || 0), 0) || 0;
              const totalLots = stock.colors?.reduce((sum, color) => sum + (color.lots?.length || 0), 0) || 0;
              return (
                <tr key={stock._id}>
                  <td>{stock.productName}</td>
                  <td>{stock.productCode || 'N/A'}</td>
                  <td>{stock.warehouse?.name} - {stock.warehouse?.branch}</td>
                  <td>{stock.colors?.length || 0}</td>
                  <td>{totalLots}</td>
                  <td>{totalPcs}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Add New Stock</h2>
              <span className="close" onClick={() => setShowModal(false)}>&times;</span>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Product Info Section */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                <h3 style={{ marginBottom: '15px' }}>Product Information</h3>
                <div className="grid grid-2">
                  <div className="form-group">
                    <label>Warehouse *</label>
                    <select
                      value={formData.warehouse}
                      onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                      required
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map(wh => (
                        <option key={wh._id} value={wh._id}>{wh.name} - {wh.branch}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Product Code</label>
                    <input
                      type="text"
                      value={formData.productCode}
                      onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Size</label>
                    <input
                      type="text"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Colors Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Colors</h3>
                  <button type="button" className="btn btn-success" onClick={addColor}>
                    + Add Color
                  </button>
                </div>

                {formData.colors.map((color, colorIndex) => {
                  const totals = calculateColorTotals(color.lots);
                  return (
                    <div key={colorIndex} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div className="form-group" style={{ flex: 1, marginRight: '10px' }}>
                          <label>Color Name *</label>
                          <input
                            type="text"
                            value={color.colorName}
                            onChange={(e) => updateColorName(colorIndex, e.target.value)}
                            required
                            placeholder="e.g., Beige, Gray, White"
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => removeColor(colorIndex)}
                          style={{ marginTop: '25px' }}
                        >
                          Remove Color
                        </button>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <strong>Lots</strong>
                          <button type="button" className="btn btn-success btn-sm" onClick={() => addLot(colorIndex)}>
                            + Add Lot
                          </button>
                        </div>

                        {color.lots.map((lot, lotIndex) => (
                          <div key={lotIndex} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '3px' }}>
                            <div className="grid grid-2" style={{ gap: '10px' }}>
                              <div className="form-group">
                                <label>Date *</label>
                                <input
                                  type="date"
                                  value={lot.date}
                                  onChange={(e) => updateLot(colorIndex, lotIndex, 'date', e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>Lot No *</label>
                                <input
                                  type="text"
                                  value={lot.lotNo}
                                  onChange={(e) => updateLot(colorIndex, lotIndex, 'lotNo', e.target.value)}
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>Received</label>
                                <input
                                  type="number"
                                  value={lot.received}
                                  onChange={(e) => updateLot(colorIndex, lotIndex, 'received', parseFloat(e.target.value) || 0)}
                                  min="0"
                                />
                              </div>
                              <div className="form-group">
                                <label>PCS *</label>
                                <input
                                  type="number"
                                  value={lot.pcs}
                                  onChange={(e) => updateLot(colorIndex, lotIndex, 'pcs', parseFloat(e.target.value) || 0)}
                                  min="0"
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>SQFT *</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={lot.sqft}
                                  onChange={(e) => updateLot(colorIndex, lotIndex, 'sqft', parseFloat(e.target.value) || 0)}
                                  min="0"
                                  required
                                />
                              </div>
                              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => removeLot(colorIndex, lotIndex)}
                                  style={{ width: '100%' }}
                                >
                                  Remove Lot
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {color.lots.length > 0 && (
                          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '3px', fontWeight: 'bold' }}>
                            Total: {totals.totalPcs} PCS, {totals.totalSqft} SQFT
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {formData.colors.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '1px dashed #ddd', borderRadius: '5px' }}>
                    No colors added yet. Click "Add Color" to start.
                  </div>
                )}
              </div>

              <div className="flex-between">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Save Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Import Stocks from Excel</h2>
              <span className="close" onClick={() => setShowImportModal(false)}>&times;</span>
            </div>
            <div className="form-group">
              <label>Warehouse *</label>
              <select
                value={importWarehouseId}
                onChange={(e) => setImportWarehouseId(e.target.value)}
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(wh => (
                  <option key={wh._id} value={wh._id}>{wh.name} - {wh.branch}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Excel File *</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                required
              />
              <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                Expected format: 2nd sheet name = Product Name, Tables with DATE, LOTNO, RECIVED, PCS, SQFT columns
              </small>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stocks;