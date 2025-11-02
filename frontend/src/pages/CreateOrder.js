import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateOrder = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouses();
    fetchStocks();
  }, []);

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
      
      const response = await axios.get('/api/stocks', { params });
      setStocks(response.data.filter(s => s.quantity > 0));
    } catch (error) {
      setError('Failed to fetch stocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, [selectedWarehouse]);

  const addItemToOrder = (stock) => {
    if (orderItems.length >= 10) {
      setError('Maximum 10 items allowed per order');
      return;
    }

    const existingItem = orderItems.find(item => item.stock === stock._id);
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.stock === stock._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        stock: stock._id,
        quantity: 1,
        stockData: stock
      }]);
    }
    setError('');
  };

  const removeItem = (stockId) => {
    setOrderItems(orderItems.filter(item => item.stock !== stockId));
  };

  const updateQuantity = (stockId, quantity) => {
    if (quantity <= 0) {
      removeItem(stockId);
      return;
    }
    setOrderItems(orderItems.map(item =>
      item.stock === stockId ? { ...item, quantity } : item
    ));
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      return total + (item.stockData.price * item.quantity);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (orderItems.length === 0) {
      setError('Please add at least one item to the order');
      return;
    }

    if (!shippingAddress.trim()) {
      setError('Shipping address is required');
      return;
    }

    try {
      const orderData = {
        items: orderItems.map(item => ({
          stock: item.stock,
          quantity: item.quantity
        })),
        shippingAddress,
        notes
      };

      await axios.post('/api/orders', orderData);
      navigate('/orders');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create order');
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <h1>Create New Order</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        You can add up to 10 items per order
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h2>Available Stocks</h2>
          <div className="form-group">
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
          <div style={{ maxHeight: '500px', overflowY: 'auto', marginTop: '20px' }}>
            {stocks.map((stock) => (
              <div key={stock._id} className="card" style={{ marginBottom: '10px', padding: '15px' }}>
                <div className="flex-between">
                  <div>
                    <h4>{stock.productName}</h4>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {stock.warehouse?.name} - {stock.warehouse?.branch}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      Price: ${stock.price.toFixed(2)} | Available: {stock.quantity}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => addItemToOrder(stock)}
                    disabled={stock.quantity === 0 || orderItems.length >= 10}
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Order Items ({orderItems.length}/10)</h2>
          {orderItems.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No items added yet
            </p>
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.stock}>
                      <td>{item.stockData.productName}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          max={item.stockData.quantity}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.stock, parseInt(e.target.value))}
                          style={{ width: '60px', padding: '5px' }}
                        />
                      </td>
                      <td>${item.stockData.price.toFixed(2)}</td>
                      <td>${(item.stockData.price * item.quantity).toFixed(2)}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeItem(item.stock)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                <div className="flex-between">
                  <strong>Total Amount:</strong>
                  <strong style={{ fontSize: '20px', color: '#007bff' }}>
                    ${calculateTotal().toFixed(2)}
                  </strong>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ marginTop: '30px' }}>
                <div className="form-group">
                  <label>Shipping Address *</label>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    required
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="2"
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Place Order
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;

