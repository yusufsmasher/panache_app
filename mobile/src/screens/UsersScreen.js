import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const UsersScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Users Management</Text>
      <Text style={styles.note}>
        Full user management features available in web application
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  note: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center'
  }
});

export default UsersScreen;

