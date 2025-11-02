import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const OrderDetailsScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      const response = await axios.get(`/api/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status: newStatus });
      Alert.alert('Success', 'Order status updated');
      fetchOrderDetails();
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>Order not found</Text>
      </View>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545',
      processing: '#17a2b8',
      shipped: '#17a2b8',
      delivered: '#28a745',
      cancelled: '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(order.status) }
          ]}
        >
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Information</Text>
        <Text style={styles.label}>User: {order.user?.name}</Text>
        <Text style={styles.label}>Email: {order.user?.email}</Text>
        <Text style={styles.label}>
          Total Amount: ${order.totalAmount.toFixed(2)}
        </Text>
        <Text style={styles.label}>
          Date: {new Date(order.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.label}>Shipping Address:</Text>
        <Text style={styles.value}>{order.shippingAddress}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {order.items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.stock?.productName}</Text>
            <Text style={styles.itemDetails}>
              {item.stock?.warehouse?.name} - {item.stock?.warehouse?.branch}
            </Text>
            <View style={styles.itemRow}>
              <Text style={styles.itemQuantity}>
                Qty: {item.quantity}
              </Text>
              <Text style={styles.itemPrice}>
                ${item.price.toFixed(2)} × {item.quantity} = ${item.total.toFixed(2)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {user?.role === 'admin' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change Status</Text>
          {['pending', 'approved', 'rejected', 'processing', 'shipped', 'delivered'].map(status => (
            <TouchableOpacity
              key={status}
              style={styles.statusButton}
              onPress={() => handleStatusChange(status)}
            >
              <Text style={styles.statusButtonText}>{status.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5
  },
  statusText: {
    color: '#fff',
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333'
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  value: {
    fontSize: 14,
    color: '#333',
    marginTop: 5
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666'
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007bff'
  },
  statusButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: 'center'
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '600'
  }
});

export default OrderDetailsScreen;

