import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWarehouses: 0,
    totalStocks: 0,
    totalOrders: 0
  });
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.name}!</Text>
        <Text style={styles.roleText}>{user?.role.toUpperCase()}</Text>
      </View>

      <View style={styles.statsContainer}>
        {user?.role === 'admin' && (
          <>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Users')}
            >
              <Text style={styles.statNumber}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Users</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('Warehouses')}
            >
              <Text style={styles.statNumber}>{stats.totalWarehouses}</Text>
              <Text style={styles.statLabel}>Warehouses</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Stocks')}
        >
          <Text style={styles.statNumber}>{stats.totalStocks}</Text>
          <Text style={styles.statLabel}>Stocks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('Orders')}
        >
          <Text style={styles.statNumber}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </TouchableOpacity>
      </View>

      {(user?.role === 'dealer' || user?.role === 'distributor') && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateOrder')}
        >
          <Text style={styles.createButtonText}>Create New Order</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    alignItems: 'center'
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  roleText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between'
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 14,
    color: '#666'
  },
  createButton: {
    backgroundColor: '#28a745',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default DashboardScreen;

