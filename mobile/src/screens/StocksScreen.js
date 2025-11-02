import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import axios from 'axios';

const StocksScreen = ({ navigation }) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      
      const response = await axios.get('/api/stocks', { params });
      setStocks(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch stocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, [searchTerm]);

  const renderStockItem = ({ item }) => (
    <View style={styles.stockCard}>
      <Text style={styles.productName}>{item.productName}</Text>
      <Text style={styles.warehouse}>
        {item.warehouse?.name} - {item.warehouse?.branch}
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>Quantity: {item.quantity}</Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
      </View>
      {item.productCode && (
        <Text style={styles.code}>Code: {item.productCode}</Text>
      )}
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
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search stocks..."
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      <FlatList
        data={stocks}
        renderItem={renderStockItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
      />
    </View>
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
  searchInput: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    fontSize: 16
  },
  list: {
    padding: 15
  },
  stockCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333'
  },
  warehouse: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    fontSize: 14,
    color: '#666'
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff'
  },
  code: {
    fontSize: 12,
    color: '#999',
    marginTop: 5
  }
});

export default StocksScreen;

