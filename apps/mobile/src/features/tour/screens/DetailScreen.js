import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function DetailScreen({ route, navigation }) {
  const tour = route.params?.tour || { title: "Chi tiết Tour", price: "Liên hệ" };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tour.title}</Text>
      <Text style={styles.price}>Giá: {tour.price}</Text>
      <Text style={styles.description}>
        Trải nghiệm hành trình tuyệt vời cùng các hướng dẫn viên nhiệt tình và dịch vụ chất lượng
        cao.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    color: "#0284c7",
    fontWeight: "600",
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#64748b",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
