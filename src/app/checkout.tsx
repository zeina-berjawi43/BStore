import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  router,
  useFocusEffect,
} from "expo-router";

// ============================================================
// API
// ============================================================

const API_URL =
  "https://mystore-backend-u6ey.onrender.com";

// ============================================================
// TYPES
// ============================================================

type BackendProduct = {
  _id: string;
  name: string;
  description?: string;
  image?: string;

  category?: {
    _id?: string;
    name?: string;
  };

  brand?: {
    _id?: string;
    name?: string;
  };

  availability?: boolean;
};

type CartItem = {
  product: BackendProduct;
  quantity: number;
  price: number;
};

type CartResponse = {
  _id: string;
  user: string;
  items: CartItem[];
};

type User = {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

// ============================================================
// GET ACCESS TOKEN
// ============================================================

const getAccessToken = async () => {
  return await AsyncStorage.getItem("accessToken");
};

// ============================================================
// READ JSON
// ============================================================

const readJsonResponse = async (
  response: Response
) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

// ============================================================
// COMPONENT
// ============================================================

export default function Checkout() {

  const [user, setUser] =
    useState<User | null>(null);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [placingOrder, setPlacingOrder] =
    useState(false);

  // ==========================================================
  // DISPLAY NAME
  // ==========================================================

  const displayName =
    user
      ? (
          user.name?.trim() ||
          `${user.firstName || ""} ${
            user.lastName || ""
          }`.trim()
        )
      : "";

  // ==========================================================
  // LOAD USER
  // ==========================================================

  const loadUser = async () => {

    try {

      const storedUser =
        await AsyncStorage.getItem("user");

      console.log(
        "CHECKOUT STORED USER:",
        storedUser
      );

      if (!storedUser) {

        setUser(null);

        return;
      }

      const parsedUser =
        JSON.parse(storedUser);

      console.log(
        "CHECKOUT USER:",
        parsedUser
      );

      setUser(parsedUser);

    } catch (error) {

      console.log(
        "LOAD USER ERROR:",
        error
      );

      setUser(null);
    }
  };

  // ==========================================================
  // LOAD CART
  // ==========================================================

  const loadCart = async () => {

    try {

      const token =
        await getAccessToken();

      console.log(
        "CHECKOUT TOKEN EXISTS:",
        !!token
      );

      if (!token) {

        setCart([]);

        router.replace("/login");

        return;
      }

      const response =
        await fetch(
          `${API_URL}/cart`,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await readJsonResponse(
          response
        );

      console.log(
        "GET CART RESPONSE:",
        response.status,
        data
      );

      // ======================================================
      // TOKEN EXPIRED
      // ======================================================

      if (
        response.status === 401 ||
        response.status === 403
      ) {

        await AsyncStorage.multiRemove([
          "accessToken",
          "refreshToken",
          "user",
          "isLoggedIn",
        ]);

        router.replace("/login");

        return;
      }

      if (!response.ok) {

        Alert.alert(
          "Cart Error",
          data?.message ||
            "Unable to load your cart."
        );

        setCart([]);

        return;
      }

      // ======================================================
      // CART
      // ======================================================

      if (data?.cart) {

        const cartData =
          data.cart as CartResponse;

        const items =
          Array.isArray(cartData.items)
            ? cartData.items
            : [];

        console.log(
          "CHECKOUT CART ITEMS:",
          items.length
        );

        setCart(items);

      } else {

        console.log(
          "CHECKOUT: NO CART"
        );

        setCart([]);
      }

    } catch (error) {

      console.log(
        "LOAD CART ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Unable to connect to the server."
      );

      setCart([]);
    }
  };

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadData = async () => {

    try {

      setLoading(true);

      await Promise.all([
        loadUser(),
        loadCart(),
      ]);

    } catch (error) {

      console.log(
        "LOAD CHECKOUT DATA ERROR:",
        error
      );

    } finally {

      setLoading(false);
    }
  };

  // ==========================================================
  // RELOAD SCREEN
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadData();

    }, [])
  );

  // ==========================================================
  // ITEM TOTAL
  // ==========================================================

  const getItemTotal = (
    item: CartItem
  ) => {

    const price =
      Number(item.price);

    const quantity =
      Number(item.quantity);

    if (
      !Number.isFinite(price) ||
      !Number.isFinite(quantity)
    ) {

      return 0;
    }

    return price * quantity;
  };

  // ==========================================================
  // TOTAL
  // ==========================================================

  const totalPrice =
    cart.reduce(
      (total, item) =>
        total +
        getItemTotal(item),
      0
    );

  const formattedTotal =
    totalPrice.toFixed(2);

  // ==========================================================
  // EDIT INFORMATION
  // ==========================================================

  const handleEditInformation =
    () => {

      router.push("/edit-account");
    };

  // ==========================================================
  // PLACE ORDER
  // ==========================================================

  const placeOrder = async () => {

    console.log(
      "================================"
    );

    console.log(
      "PLACE ORDER BUTTON PRESSED"
    );

    console.log(
      "USER:",
      user
    );

    console.log(
      "DISPLAY NAME:",
      displayName
    );

    console.log(
      "CART LENGTH:",
      cart.length
    );

    console.log(
      "PLACING ORDER:",
      placingOrder
    );

    console.log(
      "================================"
    );

    // ========================================================
    // PREVENT DOUBLE CLICK
    // ========================================================

    if (placingOrder) {
      return;
    }

    // ========================================================
    // EMPTY CART
    // ========================================================

    if (cart.length === 0) {

      Alert.alert(
        "Cart is Empty",
        "Please add products to your cart first."
      );

      return;
    }

    // ========================================================
    // USER
    // ========================================================

    if (!user) {

      Alert.alert(
        "Login Required",
        "Please login before placing your order.",
        [
          {
            text: "Login",
            onPress: () =>
              router.replace("/login"),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );

      return;
    }

    // ========================================================
    // USER INFORMATION
    // ========================================================

    if (
      !displayName ||
      !user.phone?.trim() ||
      !user.address?.trim()
    ) {

      Alert.alert(
        "Missing Information",
        "Please complete your name, phone number and address before placing the order.",
        [
          {
            text: "Edit Information",
            onPress:
              handleEditInformation,
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );

      return;
    }

    // ========================================================
    // START
    // ========================================================

    try {

      setPlacingOrder(true);

      const token =
        await getAccessToken();

      console.log(
        "ACCESS TOKEN EXISTS:",
        !!token
      );

      if (!token) {

        await AsyncStorage.multiRemove([
          "accessToken",
          "refreshToken",
          "user",
          "isLoggedIn",
        ]);

        Alert.alert(
          "Login Required",
          "Please login again.",
          [
            {
              text: "Login",
              onPress: () =>
                router.replace("/login"),
            },
          ]
        );

        return;
      }

      // ======================================================
      // CREATE ORDER
      // ======================================================

      console.log(
        "CREATING ORDER..."
      );

      console.log(
        "SHIPPING ADDRESS:",
        user.address
      );

      const response =
        await fetch(
          `${API_URL}/orders/create`,
          {
            method: "POST",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                shippingAddress:
                  user.address.trim(),
              }),
          }
        );

      const data =
        await readJsonResponse(
          response
        );

      console.log(
        "CREATE ORDER RESPONSE:",
        response.status,
        data
      );

      // ======================================================
      // AUTH ERROR
      // ======================================================

      if (
        response.status === 401 ||
        response.status === 403
      ) {

        await AsyncStorage.multiRemove([
          "accessToken",
          "refreshToken",
          "user",
          "isLoggedIn",
        ]);

        Alert.alert(
          "Session Expired",
          "Please login again.",
          [
            {
              text: "Login",
              onPress: () =>
                router.replace("/login"),
            },
          ]
        );

        return;
      }

      // ======================================================
      // CART ERROR
      // ======================================================

      if (
        response.status === 404
      ) {

        Alert.alert(
          "Cart Error",
          data?.message ||
            "Your cart could not be found."
        );

        return;
      }

      // ======================================================
      // OTHER ERROR
      // ======================================================

      if (!response.ok) {

        Alert.alert(
          "Order Failed",
          data?.message ||
            data?.error ||
            "Unable to place your order."
        );

        return;
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      if (
        response.status === 201 &&
        data?.order
      ) {

        console.log(
          "ORDER CREATED SUCCESSFULLY:",
          data.order
        );

        // Clear local cart
        await AsyncStorage.removeItem(
          "cart"
        );

        // Clear screen cart
        setCart([]);

        Alert.alert(
          "Order Placed 🎉",
          "Your order has been placed successfully.",
          [
            {
              text: "OK",
              onPress: () =>
                router.replace("/orders"),
            },
          ]
        );

        return;
      }

      // ======================================================
      // FALLBACK
      // ======================================================

      Alert.alert(
        "Order",
        data?.message ||
          "Order created successfully."
      );

    } catch (error) {

      console.log(
        "PLACE ORDER ERROR:",
        error
      );

      Alert.alert(
        "Connection Error",
        "Could not connect to the server. Please check your internet connection and try again."
      );

    } finally {

      setPlacingOrder(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (

      <View
        style={styles.loadingContainer}
      >

        <ActivityIndicator
          size="large"
        />

        <Text
          style={styles.loadingText}
        >
          Loading checkout...
        </Text>

      </View>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <View
      style={styles.container}
    >

      {/* HEADER */}

      <View
        style={styles.header}
      >

        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.backButton}
        >

          <Ionicons
            name="arrow-back"
            size={24}
            color="#000"
          />

        </Pressable>

        <Text
          style={styles.headerTitle}
        >
          Checkout
        </Text>

        <View
          style={styles.headerSpacer}
        />

      </View>

      {/* CONTENT */}

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* CUSTOMER INFORMATION */}

        <View
          style={styles.section}
        >

          <View
            style={styles.sectionHeader}
          >

            <Text
              style={styles.sectionTitle}
            >
              Customer Information
            </Text>

            <Pressable
              onPress={
                handleEditInformation
              }
            >

              <Text
                style={styles.editText}
              >
                Edit
              </Text>

            </Pressable>

          </View>

          {user ? (

            <View
              style={styles.infoCard}
            >

              {/* NAME */}

              <View
                style={styles.infoRow}
              >

                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#555"
                />

                <View
                  style={
                    styles.infoTextContainer
                  }
                >

                  <Text
                    style={
                      styles.infoLabel
                    }
                  >
                    Name
                  </Text>

                  <Text
                    style={
                      styles.infoValue
                    }
                  >
                    {displayName ||
                      "Not provided"}
                  </Text>

                </View>

              </View>

              {/* PHONE */}

              <View
                style={styles.infoRow}
              >

                <Ionicons
                  name="call-outline"
                  size={20}
                  color="#555"
                />

                <View
                  style={
                    styles.infoTextContainer
                  }
                >

                  <Text
                    style={
                      styles.infoLabel
                    }
                  >
                    Phone
                  </Text>

                  <Text
                    style={
                      styles.infoValue
                    }
                  >
                    {user.phone ||
                      "Not provided"}
                  </Text>

                </View>

              </View>

              {/* EMAIL */}

              {user.email ? (

                <View
                  style={styles.infoRow}
                >

                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#555"
                  />

                  <View
                    style={
                      styles.infoTextContainer
                    }
                  >

                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Email
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {user.email}
                    </Text>

                  </View>

                </View>

              ) : null}

              {/* ADDRESS */}

              <View
                style={styles.infoRow}
              >

                <Ionicons
                  name="location-outline"
                  size={20}
                  color="#555"
                />

                <View
                  style={
                    styles.infoTextContainer
                  }
                >

                  <Text
                    style={
                      styles.infoLabel
                    }
                  >
                    Address
                  </Text>

                  <Text
                    style={
                      styles.infoValue
                    }
                  >
                    {user.address ||
                      "Not provided"}
                  </Text>

                </View>

              </View>

            </View>

          ) : (

            <View
              style={styles.emptyInfoCard}
            >

              <Text
                style={styles.emptyInfoText}
              >
                Please login to continue.
              </Text>

              <Pressable
                onPress={() =>
                  router.replace("/login")
                }
                style={
                  styles.loginButton
                }
              >

                <Text
                  style={
                    styles.loginButtonText
                  }
                >
                  Login
                </Text>

              </Pressable>

            </View>

          )}

        </View>

        {/* ORDER ITEMS */}

        <View
          style={styles.section}
        >

          <Text
            style={styles.sectionTitle}
          >
            Order Summary
          </Text>

          {cart.length === 0 ? (

            <View
              style={styles.emptyCartCard}
            >

              <Text
                style={styles.emptyCartText}
              >
                Your cart is empty.
              </Text>

            </View>

          ) : (

            cart.map(
              (item, index) => {

                const itemTotal =
                  getItemTotal(item);

                return (

                  <View
                    key={
                      `${item.product._id}-${index}`
                    }
                    style={styles.itemCard}
                  >

                    <View
                      style={
                        styles.itemInfo
                      }
                    >

                      <Text
                        numberOfLines={2}
                        style={
                          styles.productName
                        }
                      >
                        {item.product.name}
                      </Text>

                      <Text
                        style={
                          styles.quantityText
                        }
                      >
                        Quantity:{" "}
                        {item.quantity}
                      </Text>

                      <Text
                        style={
                          styles.unitPrice
                        }
                      >
                        $
                        {Number(
                          item.price
                        ).toFixed(2)}
                        {" "}each
                      </Text>

                    </View>

                    <Text
                      style={
                        styles.itemTotal
                      }
                    >
                      $
                      {itemTotal.toFixed(2)}
                    </Text>

                  </View>
                );
              }
            )
          )}

        </View>

        {/* TOTAL */}

        <View
          style={styles.totalCard}
        >

          <Text
            style={styles.totalLabel}
          >
            Total
          </Text>

          <Text
            style={styles.totalValue}
          >
            ${formattedTotal}
          </Text>

        </View>

        {/* PAYMENT */}

        <View
          style={styles.paymentCard}
        >

          <Ionicons
            name="cash-outline"
            size={24}
            color="#333"
          />

          <View
            style={
              styles.paymentTextContainer
            }
          >

            <Text
              style={
                styles.paymentTitle
              }
            >
              Cash on Delivery
            </Text>

            <Text
              style={
                styles.paymentSubtitle
              }
            >
              Pay when your order is delivered.
            </Text>

          </View>

        </View>

      </ScrollView>

      {/* PLACE ORDER */}

      <View
        style={styles.bottomContainer}
      >

        <View
          style={styles.bottomTotal}
        >

          <Text
            style={
              styles.bottomTotalLabel
            }
          >
            Total
          </Text>

          <Text
            style={
              styles.bottomTotalValue
            }
          >
            ${formattedTotal}
          </Text>

        </View>

        <Pressable
          onPress={placeOrder}
          disabled={placingOrder}
          style={[
            styles.placeOrderButton,
            placingOrder &&
              styles.placeOrderButtonDisabled,
          ]}
        >

          {placingOrder ? (

            <ActivityIndicator
              size="small"
              color="#fff"
            />

          ) : (

            <Text
              style={
                styles.placeOrderText
              }
            >
              Place Order
            </Text>

          )}

        </Pressable>

      </View>

    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: "#F7F7F7",
    },

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F7F7F7",
    },

    loadingText: {
      marginTop: 10,
      fontSize: 14,
      color: "#555",
    },

    header: {
      height: 60,
      backgroundColor: "#FFFFFF",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#E5E5E5",
    },

    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },

    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#000000",
    },

    headerSpacer: {
      width: 40,
    },

    content: {
      padding: 16,
      paddingBottom: 140,
    },

    section: {
      marginBottom: 20,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#000000",
      marginBottom: 10,
    },

    editText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#8A6D1D",
    },

    infoCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      padding: 16,
    },

    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
    },

    infoTextContainer: {
      flex: 1,
      marginLeft: 12,
    },

    infoLabel: {
      fontSize: 12,
      color: "#777",
      marginBottom: 3,
    },

    infoValue: {
      fontSize: 15,
      color: "#111",
      fontWeight: "500",
    },

    emptyInfoCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      padding: 18,
      alignItems: "center",
    },

    emptyInfoText: {
      fontSize: 14,
      color: "#555",
      marginBottom: 12,
    },

    loginButton: {
      backgroundColor: "#000000",
      paddingHorizontal: 25,
      paddingVertical: 10,
      borderRadius: 8,
    },

    loginButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },

    itemCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      padding: 15,
      marginBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    emptyCartCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      padding: 18,
      alignItems: "center",
    },

    emptyCartText: {
      fontSize: 14,
      color: "#666",
    },

    itemInfo: {
      flex: 1,
      paddingRight: 15,
    },

    productName: {
      fontSize: 15,
      fontWeight: "600",
      color: "#000000",
      marginBottom: 6,
    },

    quantityText: {
      fontSize: 13,
      color: "#666",
      marginBottom: 3,
    },

    unitPrice: {
      fontSize: 13,
      color: "#666",
    },

    itemTotal: {
      fontSize: 16,
      fontWeight: "700",
      color: "#000000",
    },

    totalCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      padding: 18,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },

    totalLabel: {
      fontSize: 18,
      fontWeight: "700",
      color: "#000000",
    },

    totalValue: {
      fontSize: 20,
      fontWeight: "800",
      color: "#000000",
    },

    paymentCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
    },

    paymentTextContainer: {
      marginLeft: 12,
      flex: 1,
    },

    paymentTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#000000",
      marginBottom: 3,
    },

    paymentSubtitle: {
      fontSize: 13,
      color: "#666",
    },

    bottomContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 25,
      borderTopWidth: 1,
      borderTopColor: "#E5E5E5",
    },

    bottomTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },

    bottomTotalLabel: {
      fontSize: 14,
      color: "#666",
    },

    bottomTotalValue: {
      fontSize: 18,
      fontWeight: "800",
      color: "#000000",
    },

    placeOrderButton: {
      height: 52,
      borderRadius: 12,
      backgroundColor: "#000000",
      justifyContent: "center",
      alignItems: "center",
    },

    placeOrderButtonDisabled: {
      opacity: 0.45,
    },

    placeOrderText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },

  });