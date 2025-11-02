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
  const [formData, setFormData] = useState({
    warehouse: '',
    productName: '',
    productCode: '',
    category: '',
    size: '',
    color: '',
    quantity: 0,
    price: 0,
    description: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/stocks', formData);
      setSuccess('Stock created successfully');
      setShowModal(false);
      setFormData({
        warehouse: '',
        productName: '',
        productCode: '',
        category: '',
        size: '',
        color: '',
        quantity: 0,
        price: 0,
        description: ''
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
              <th>Category</th>
              <th>Size</th>
              <th>Quantity</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr key={stock._id}>
                <td>{stock.productName}</td>
                <td>{stock.productCode || 'N/A'}</td>
                <td>{stock.warehouse?.name} - {stock.warehouse?.branch}</td>
                <td>{stock.category || 'N/A'}</td>
                <td>{stock.size || 'N/A'}</td>
                <td>{stock.quantity}</td>
                <td>${stock.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Stock</h2>
              <span className="close" onClick={() => setShowModal(false)}>&times;</span>
            </div>
            <form onSubmit={handleSubmit}>
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
              <div className="grid grid-2">
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
                  <label>Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    required
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
              <div className="flex-between">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Add Stock</button>
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
                Expected columns: Product Name, Product Code, Category, Size, Color, Quantity, Price, Unit, Description
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

