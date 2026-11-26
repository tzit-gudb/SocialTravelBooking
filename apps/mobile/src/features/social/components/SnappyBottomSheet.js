import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

/**
 * BottomSheet tùy biến:
 * - Dùng <Modal> không đặt statusBarTranslucent để Android resize gọn phía trên bàn phím
 *   mà không đẩy Footer màn hình dưới hay đẩy Header của BottomSheet lên khỏi màn hình.
 * - Dùng chiều cao theo phần trăm (90% - 93%) để luôn gần full màn hình và tự co theo bàn phím.
 * - Hiệu ứng trượt nhanh (160ms mở / 120ms đóng) và hỗ trợ kéo thanh gạch ngang xuống để đóng.
 */
export default function SnappyBottomSheet({ visible, onClose, heightPercent = 0.92, children }) {
  const [rendered, setRendered] = useState(visible);
  const translateY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setRendered(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!rendered) return;

    if (visible) {
      translateY.setValue(Math.min(420, SCREEN_HEIGHT * 0.55));
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 120,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setRendered(false);
        }
      });
    }
  }, [visible, rendered, translateY, backdropOpacity]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 80 || gesture.vy > 0.5) {
            Keyboard.dismiss();
            onCloseRef.current?.();
          } else {
            Animated.timing(translateY, {
              toValue: 0,
              duration: 120,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 120,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        },
      }),
    [translateY],
  );

  if (!rendered) return null;

  const sheetHeightPercent = `${Math.round(heightPercent * 100)}%`;

  return (
    <Modal
      visible={rendered}
      animationType="none"
      transparent
      onRequestClose={() => {
        Keyboard.dismiss();
        onCloseRef.current?.();
      }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            style={styles.backdropTouch}
            onPress={() => {
              Keyboard.dismiss();
              onCloseRef.current?.();
            }}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeightPercent,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Vùng kéo thanh gạch ngang xuống để đóng BottomSheet */}
          <View style={styles.dragArea} {...panResponder.panHandlers}>
            <View style={styles.handleBar} />
          </View>

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    overflow: "hidden",
  },
  dragArea: {
    width: "100%",
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
});
