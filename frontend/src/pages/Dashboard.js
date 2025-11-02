import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWarehouses: 0,
    totalStocks: 0,
    totalOrders: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, warehousesRes, stocksRes, ordersRes] = await Promise.all([
        user?.role === 'admin' ? axios.get('/api/users') : Promise.resolve({ data: [] }),
        user?.role === 'admin' ? axios.get('/api/warehouses') : Promise.resolve({ data: [] }),
        axios.get('/api/stocks'),
        axios.get('/api/orders')
      ]);

      setStats({
        totalUsers: usersRes.data.length,
        totalWarehouses: warehousesRes.data.length,
        totalStocks: stocksRes.data.length,
        totalOrders: ordersRes.data.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name}!</p>

      <div className="grid grid-3" style={{ marginTop: '30px' }}>
        {user?.role === 'admin' && (
          <>
            <div className="card">
              <h3>Total Users</h3>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
                {stats.totalUsers}
              </p>
            </div>
            <div className="card">
              <h3>Total Warehouses</h3>
              <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
                {stats.totalWarehouses}
              </p>
            </div>
          </>
        )}
        <div className="card">
          <h3>Total Stocks</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#17a2b8' }}>
            {stats.totalStocks}
          </p>
        </div>
        <div className="card">
          <h3>Total Orders</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
            {stats.totalOrders}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

