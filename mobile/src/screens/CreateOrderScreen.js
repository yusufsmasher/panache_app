import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import axios from 'axios';

const CreateOrderScreen = ({ navigation }) => {
  const [stocks, setStocks] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [shippingAddress, setShippingAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await axios.get('/api/stocks');
      setStocks(response.data.filter(s => s.quantity > 0));
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch stocks');
    } finally {
      setLoading(false);
    }
  };

  const addItem = (stock) => {
    if (orderItems.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 items allowed per order');
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

  const handleSubmit = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    if (!shippingAddress.trim()) {
      Alert.alert('Error', 'Please enter shipping address');
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        items: orderItems.map(item => ({
          stock: item.stock,
          quantity: item.quantity
        })),
        shippingAddress
      };

      await axios.post('/api/orders', orderData);
      Alert.alert('Success', 'Order created successfully', [
        { text: 'OK', onPress: () => navigation.navigate('Orders') }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStockItem = ({ item }) => (
    <View style={styles.stockCard}>
      <View style={styles.stockInfo}>
        <Text style={styles.productName}>{item.productName}</Text>
        <Text style={styles.warehouse}>
          {item.warehouse?.name} - {item.warehouse?.branch}
        </Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addItem(item)}
        disabled={orderItems.length >= 10}
      >
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderItemInfo}>
        <Text style={styles.orderItemName}>{item.stockData.productName}</Text>
        <Text style={styles.orderItemPrice}>
          ${item.stockData.price.toFixed(2)} x {item.quantity}
        </Text>
      </View>
      <View style={styles.orderItemActions}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.stock, item.quantity - 1)}
        >
          <Text style={styles.qtyButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.stock, item.quantity + 1)}
        >
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeItem(item.stock)}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Available Stocks</Text>
      <FlatList
        data={stocks}
        renderItem={renderStockItem}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
      />

      <Text style={styles.sectionTitle}>
        Order Items ({orderItems.length}/10)
      </Text>
      {orderItems.length === 0 ? (
        <Text style={styles.emptyText}>No items added yet</Text>
      ) : (
        <FlatList
          data={orderItems}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.stock}
          scrollEnabled={false}
        />
      )}

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>
          Total: ${calculateTotal().toFixed(2)}
        </Text>
      </View>

      <TextInput
        style={styles.addressInput}
        placeholder="Shipping Address *"
        value={shippingAddress}
        onChangeText={setShippingAddress}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Place Order</Text>
        )}
      </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#333'
  },
  stockCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stockInfo: {
    flex: 1
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5
  },
  warehouse: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff'
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10
  },
  orderItemInfo: {
    marginBottom: 10
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5
  },
  orderItemPrice: {
    fontSize: 14,
    color: '#666'
  },
  orderItemActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  qtyButton: {
    backgroundColor: '#007bff',
    width: 30,
    height: 30,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  qtyText: {
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: '600'
  },
  removeButton: {
    marginLeft: 'auto',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#dc3545',
    borderRadius: 5
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  totalContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center'
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff'
  },
  addressInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top'
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center'
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 20
  }
});

export default CreateOrderScreen;

