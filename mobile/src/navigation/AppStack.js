import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import DashboardScreen from '../screens/DashboardScreen';
import StocksScreen from '../screens/StocksScreen';
import OrdersScreen from '../screens/OrdersScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import UsersScreen from '../screens/UsersScreen';
import WarehousesScreen from '../screens/WarehousesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const AdminStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
      <Stack.Screen name="Warehouses" component={WarehousesScreen} />
      <Stack.Screen name="Stocks" component={StocksScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
    </Stack.Navigator>
  );
};

const DealerDistributorStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Stocks" component={StocksScreen} />
      <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
    </Stack.Navigator>
  );
};

const AppStack = () => {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminStack />;
  }

  return <DealerDistributorStack />;
};

export default AppStack;

