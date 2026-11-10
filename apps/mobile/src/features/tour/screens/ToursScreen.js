import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";

const MOCK_TOURS = [
  { id: "1", title: "Tour Khám Phá Đà Nẵng - Hội An", price: "2,500,000 VND" },
  { id: "2", title: "Tour Lặn Ngắm San Hô Phú Quốc", price: "3,200,000 VND" },
  { id: "3", title: "Tour Trekking Sapa 3N2Đ", price: "1,800,000 VND" },
];

export default function ToursScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Danh sách Tour Du Lịch</Text>
      <FlatList
        data={MOCK_TOURS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("Detail", { tour: item })}
          >
            <Text style={styles.tourTitle}>{item.title}</Text>
            <Text style={styles.tourPrice}>{item.price}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#0f172a",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  tourPrice: {
    fontSize: 14,
    color: "#0284c7",
    marginTop: 4,
    fontWeight: "500",
  },
});
