import { request } from '../services/request';
import { cartTotal, currentCartPrices } from '../services/cartPricing';
import { getCheckoutAttempt } from '../services/checkoutAttempt';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useRef,
  useState,
} from 'react';

import { getValidAccessToken, logoutLocal } from '../services/authService';


// =========================================================
// API
// =========================================================

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';


// =========================================================
// TYPES
// =========================================================

type BackendProduct = {
  discountedPrice?: number;
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
  updatedAt?: string;
  user: string;
  items: CartItem[];
};


type User = {
  _id?: string;
  id?: string;
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
  return await getValidAccessToken();
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
  const orderInFlight = useRef(false);

  const [user, setUser] =
    useState<User | null>(null);


  const [cart, setCart] =
    useState<CartItem[]>([]);
  const [cartRevision, setCartRevision] = useState<string | undefined>();


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


      if (__DEV__) { console.log(
        "CHECKOUT STORED USER:",
        storedUser
      ); }


      if (!storedUser) {

        setUser(null);

        return;

      }


      const parsedUser =
        JSON.parse(storedUser);


      if (__DEV__) { console.log(
        "CHECKOUT USER:",
        parsedUser
      ); }


      setUser(parsedUser);

    } catch (error) {

      if (__DEV__) { console.log(
        "LOAD USER ERROR:",
        error
      ); }


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


      if (__DEV__) { console.log(
        "CHECKOUT TOKEN EXISTS:",
        !!token
      ); }


      if (!token) {

        setCart([]);

        router.replace("/login");

        return;

      }


      const response =
        await request(
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


      if (__DEV__) { console.log(
        "GET CART RESPONSE:",
        response.status,
        data
      ); }


      // ======================================================
      // TOKEN EXPIRED
      // ======================================================

      if (
        response.status === 401
      ) {

        await logoutLocal(token);


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


        if (__DEV__) { console.log(
          "CHECKOUT CART ITEMS:",
          items.length
        ); }


        setCart(currentCartPrices(items));
        setCartRevision(cartData.updatedAt ? `${cartData._id}:${cartData.updatedAt}` : undefined);

      } else {

        if (__DEV__) { console.log(
          "CHECKOUT: NO CART"
        ); }


        setCart([]);

      }

    } catch (error) {

      if (__DEV__) { console.log(
        "LOAD CART ERROR:",
        error
      ); }


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

      if (__DEV__) { console.log(
        "LOAD CHECKOUT DATA ERROR:",
        error
      ); }

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
    cartTotal(cart);


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

    if (__DEV__) { console.log(
      "================================"
    ); }


    if (__DEV__) { console.log(
      "PLACE ORDER BUTTON PRESSED"
    ); }


    if (__DEV__) { console.log(
      "USER:",
      user
    ); }


    if (__DEV__) { console.log(
      "DISPLAY NAME:",
      displayName
    ); }


    if (__DEV__) { console.log(
      "CART LENGTH:",
      cart.length
    ); }


    if (__DEV__) { console.log(
      "PLACING ORDER:",
      placingOrder
    ); }


    if (__DEV__) { console.log(
      "================================"
    ); }


    if (orderInFlight.current) {
      return;
    }


    if (cart.length === 0) {

      Alert.alert(
        "Cart is Empty",
        "Please add products to your cart first."
      );


      return;

    }


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


    try {

      orderInFlight.current = true;
      setPlacingOrder(true);


      const token =
        await getAccessToken();


      if (__DEV__) { console.log(
        "ACCESS TOKEN EXISTS:",
        !!token
      ); }


      if (!token) {

        await logoutLocal(token);


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


      if (__DEV__) { console.log(
        "CREATING ORDER..."
      ); }


      if (__DEV__) { console.log(
        "SHIPPING ADDRESS:",
        user.address
      ); }

      const userId = user._id || user.id;
      if (!userId) {
        Alert.alert('Account Error', 'Please sign in again before placing your order.');
        return;
      }
      const attempt = await getCheckoutAttempt(userId, user.address, cart.map(item => ({
        productId: item.product?._id || '', quantity: item.quantity,
      })), cartRevision);

      const response =
        await request(
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
                idempotencyKey: attempt.key,
                shippingAddress:
                  user.address.trim(),
              }),
          }
        );


      const data =
        await readJsonResponse(
          response
        );


      if (__DEV__) { console.log(
        "CREATE ORDER RESPONSE:",
        response.status,
        data
      ); }


      if (
        response.status === 401
      ) {

        await logoutLocal(token);


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


      if (!response.ok) {

        Alert.alert(
          "Order Failed",
          data?.message ||
            data?.error ||
            "Unable to place your order."
        );


        return;

      }


      if (
        response.status === 201 &&
        data?.order
      ) {

        if (__DEV__) { console.log(
          "ORDER CREATED SUCCESSFULLY:",
          data.order
        ); }

        // The server already confirmed success. Local cleanup failure must not
        // turn it into a failed-order message or invite another submission.
        await AsyncStorage.multiRemove([attempt.storageKey, "cart"]).catch(() => {});


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


      Alert.alert(
        "Order",
        data?.message ||
          "Order created successfully."
      );


    } catch (error) {

      if (__DEV__) { console.log(
        "PLACE ORDER ERROR:",
        error
      ); }


      Alert.alert(
        "Connection Error",
        "We could not confirm the result. Please check My Orders before trying again, because your order may already have been placed."
      );


    } finally {

      orderInFlight.current = false;
      setPlacingOrder(false);

    }

  };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (

      <View
        style={
          styles.loadingContainer
        }
      >

        <View
          style={
            styles.loadingIconContainer
          }
        >

          <Ionicons
            name="bag-check-outline"
            size={34}
            color="#E35B3F"
          />

        </View>


        <Text
          style={
            styles.loadingText
          }
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
      style={
        styles.container
      }
    >

      {/* ====================================================
          HEADER
      ==================================================== */}

      <View
        style={
          styles.header
        }
      >

        <Pressable
          onPress={() =>
            router.back()
          }

          style={
            styles.backButton
          }
        >

          <Ionicons
            name="arrow-back"
            size={22}
            color="#171717"
          />

        </Pressable>


        <View
          style={
            styles.headerTextContainer
          }
        >

          <Text
            style={
              styles.headerTitle
            }
          >
            Checkout
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Review your order
          </Text>

        </View>


        <View
          style={
            styles.headerSpacer
          }
        />

      </View>


      {/* ====================================================
          CONTENT
      ==================================================== */}

      <ScrollView
        contentContainerStyle={
          styles.content
        }

        showsVerticalScrollIndicator={
          false
        }
      >

        {/* ==================================================
            CUSTOMER INFORMATION
        ================================================== */}

        <View
          style={
            styles.section
          }
        >

          <View
            style={
              styles.sectionHeader
            }
          >

            <View
              style={
                styles.sectionTitleRow
              }
            >

              <View
                style={
                  styles.sectionAccent
                }
              />

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Customer Information
              </Text>

            </View>


            <Pressable
              onPress={
                handleEditInformation
              }

              style={
                styles.editButton
              }
            >

              <Ionicons
                name="create-outline"
                size={15}
                color="#E35B3F"
              />

              <Text
                style={
                  styles.editText
                }
              >
                Edit
              </Text>

            </Pressable>

          </View>


          {user ? (

            <View
              style={
                styles.infoCard
              }
            >

              {/* NAME */}

              <View
                style={
                  styles.infoRow
                }
              >

                <View
                  style={
                    styles.infoIcon
                  }
                >

                  <Ionicons
                    name="person-outline"
                    size={18}
                    color="#E35B3F"
                  />

                </View>


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
                style={
                  styles.infoRow
                }
              >

                <View
                  style={
                    styles.infoIcon
                  }
                >

                  <Ionicons
                    name="call-outline"
                    size={18}
                    color="#E35B3F"
                  />

                </View>


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
                  style={
                    styles.infoRow
                  }
                >

                  <View
                    style={
                      styles.infoIcon
                    }
                  >

                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color="#E35B3F"
                    />

                  </View>


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
                style={[
                  styles.infoRow,
                  styles.infoRowLast,
                ]}
              >

                <View
                  style={
                    styles.infoIcon
                  }
                >

                  <Ionicons
                    name="location-outline"
                    size={18}
                    color="#E35B3F"
                  />

                </View>


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
              style={
                styles.emptyInfoCard
              }
            >

              <View
                style={
                  styles.emptyInfoIcon
                }
              >

                <Ionicons
                  name="person-outline"
                  size={24}
                  color="#E35B3F"
                />

              </View>


              <Text
                style={
                  styles.emptyInfoText
                }
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


                <Ionicons
                  name="arrow-forward"
                  size={17}
                  color="#FFFFFF"
                />

              </Pressable>

            </View>

          )}

        </View>


        {/* ==================================================
            ORDER SUMMARY
        ================================================== */}

        <View
          style={
            styles.section
          }
        >

          <View
            style={
              styles.sectionTitleRow
            }
          >

            <View
              style={
                styles.sectionAccent
              }
            />

            <Text
              style={
                styles.sectionTitle
              }
            >
              Order Summary
            </Text>
           

          </View>


          {cart.length === 0 ? (

            <View
              style={
                styles.emptyCartCard
              }
            >

              <View
                style={
                  styles.emptyCartIcon
                }
              >

                <Ionicons
                  name="cart-outline"
                  size={27}
                  color="#E35B3F"
                />

              </View>


              <Text
                style={
                  styles.emptyCartText
                }
              >
                Your cart is empty.
              </Text>

            </View>

          ) : (

            cart.map(
              (
                item,
                index
              ) => {

                const itemTotal =
                  getItemTotal(item);


                return (

                  <View
                    key={
                      `${item.product._id}-${index}`
                    }

                    style={
                      styles.itemCard
                    }
                  >

                    <View
                      style={
                        styles.itemIcon
                      }
                    >

                      <Ionicons
                        name="cube-outline"
                        size={23}
                        color="#E35B3F"
                      />

                    </View>


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


                      <View
                        style={
                          styles.itemMeta
                        }
                      >

                        <Text
                          style={
                            styles.quantityText
                          }
                        >
                          Qty {item.quantity}
                        </Text>


                        <View
                          style={
                            styles.metaDot
                          }
                        />


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


        {/* ==================================================
            TOTAL
        ================================================== */}

        <View
          style={
            styles.totalCard
          }
        >

          <View>

            <Text
              style={
                styles.totalLabel
              }
            >
              Total
            </Text>


            <Text
              style={
                styles.totalSubtext
              }
            >
              Including all items
            </Text>

          </View>


          <Text
            style={
              styles.totalValue
            }
          >
            ${formattedTotal}
          </Text>

        </View>


        {/* ==================================================
            PAYMENT
        ================================================== */}

        <View
          style={
            styles.paymentCard
          }
        >

          <View
            style={
              styles.paymentIcon
            }
          >

            <Ionicons
              name="cash-outline"
              size={24}
              color="#E35B3F"
            />

          </View>


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


          <View
            style={
              styles.paymentCheck
            }
          >

            <Ionicons
              name="checkmark"
              size={16}
              color="#E35B3F"
            />

          </View>

        </View>


      </ScrollView>


      {/* ====================================================
          PLACE ORDER
      ==================================================== */}

      <View
        style={
          styles.bottomContainer
        }
      >

        <View
          style={
            styles.bottomInner
          }
        >

          <View
            style={
              styles.bottomTotal
            }
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
            onPress={
              placeOrder
            }

            disabled={
              placingOrder
            }

            style={[
              styles.placeOrderButton,

              placingOrder &&
                styles.placeOrderButtonDisabled,
            ]}
          >

            {placingOrder ? (

              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

            ) : (

              <>
                <Text
                  style={
                    styles.placeOrderText
                  }
                >
                  Place Order
                </Text>


                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color="#FFFFFF"
                />
              </>

            )}

          </Pressable>

        </View>

      </View>

    </View>

  );

}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // CONTAINER
    // ========================================================

    container: {
      flex: 1,
      backgroundColor: "#F7F3EC",
      paddingHorizontal: 18,
      paddingTop: 18,
    },


    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F7F3EC",
    },


    loadingIconContainer: {
      width: 76,
      height: 76,
      borderRadius: 23,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E7DED1",
      alignItems: "center",
      justifyContent: "center",

      shadowColor: "#171717",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.06,
      shadowRadius: 9,
      elevation: 2,
    },


    loadingText: {
      marginTop: 13,
      fontSize: 13,
      fontWeight: "700",
      color: "#817B71",
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
    },


    backButton: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E7DED1",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,

      shadowColor: "#171717",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },


    headerTextContainer: {
      justifyContent: "center",
    },


    headerTitle: {
      fontSize: 29,
      fontWeight: "900",
      color: "#171717",
      letterSpacing: -0.8,
    },


    headerSubtitle: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "600",
      color: "#817B71",
    },


    headerSpacer: {
      width: 46,
      marginLeft: "auto",
    },


    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      paddingBottom: 155,
    },


    // ========================================================
    // SECTION
    // ========================================================

    section: {
      marginBottom: 20,
    },


    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 11,
    },


    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      paddingBottom:10,
    },


    sectionAccent: {
      width: 5,
      height: 22,
      borderRadius: 3,
      backgroundColor: "#E35B3F",
      marginRight: 9,
    },


    sectionTitle: {
      fontSize: 19,
      fontWeight: "900",
      color: "#171717",
      letterSpacing: -0.3,
    },


    // ========================================================
    // EDIT
    // ========================================================

    editButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: "#FFF7F3",
      borderWidth: 1,
      borderColor: "#F0CFC4",
    },


    editText: {
      marginLeft: 4,
      fontSize: 12,
      fontWeight: "800",
      color: "#E35B3F",
    },


    // ========================================================
    // CUSTOMER INFO
    // ========================================================

    infoCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 21,
      padding: 15,
      borderWidth: 1,
      borderColor: "#E7DED1",

      shadowColor: "#171717",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.07,
      shadowRadius: 9,
      elevation: 2,
    },


    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 14,
    },


    infoRowLast: {
      marginBottom: 0,
    },


    infoIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "#FFF7F3",
      borderWidth: 1,
      borderColor: "#F0CFC4",
      alignItems: "center",
      justifyContent: "center",
    },


    infoTextContainer: {
      flex: 1,
      marginLeft: 10,
      paddingTop: 2,
    },


    infoLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: "#9A9186",
      marginBottom: 3,
    },


    infoValue: {
      fontSize: 14,
      fontWeight: "700",
      color: "#24221E",
      lineHeight: 19,
    },


    // ========================================================
    // EMPTY INFO
    // ========================================================

    emptyInfoCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 21,
      padding: 18,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E7DED1",

      shadowColor: "#171717",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.06,
      shadowRadius: 9,
      elevation: 2,
    },


    emptyInfoIcon: {
      width: 58,
      height: 58,
      borderRadius: 17,
      backgroundColor: "#FFF7F3",
      borderWidth: 1,
      borderColor: "#F0CFC4",
      alignItems: "center",
      justifyContent: "center",
    },


    emptyInfoText: {
      marginTop: 10,
      fontSize: 13,
      fontWeight: "600",
      color: "#817B71",
      marginBottom: 13,
    },


    loginButton: {
      minHeight: 44,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor: "#171717",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },


    loginButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
      marginRight: 8,
    },


    // ========================================================
    // ORDER ITEM
    // ========================================================

    itemCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 12,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E7DED1",

      shadowColor: "#171717",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },


    itemIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: "#F8F2EA",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },


    itemInfo: {
      flex: 1,
      paddingRight: 8,
    },


    productName: {
      fontSize: 14,
      fontWeight: "800",
      color: "#171717",
      lineHeight: 19,
      marginBottom: 5,
    },


    itemMeta: {
      flexDirection: "row",
      alignItems: "center",
    },


    quantityText: {
      fontSize: 11,
      fontWeight: "700",
      color: "#817B71",
    },


    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: "#C9C0B5",
      marginHorizontal: 6,
    },


    unitPrice: {
      fontSize: 11,
      fontWeight: "600",
      color: "#9A9186",
    },


    itemTotal: {
      fontSize: 15,
      fontWeight: "900",
      color: "#171717",
    },


    // ========================================================
    // EMPTY CART
    // ========================================================

    emptyCartCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E7DED1",
    },


    emptyCartIcon: {
      width: 58,
      height: 58,
      borderRadius: 17,
      backgroundColor: "#FFF7F3",
      borderWidth: 1,
      borderColor: "#F0CFC4",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },


    emptyCartText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#817B71",
    },


    // ========================================================
    // TOTAL
    // ========================================================

    totalCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 21,
      padding: 17,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 13,
      borderWidth: 1,
      borderColor: "#E7DED1",

      shadowColor: "#171717",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.07,
      shadowRadius: 9,
      elevation: 2,
    },


    totalLabel: {
      fontSize: 19,
      fontWeight: "900",
      color: "#171717",
    },


    totalSubtext: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
      color: "#9A9186",
    },


    totalValue: {
      fontSize: 24,
      fontWeight: "900",
      color: "#E35B3F",
      letterSpacing: -0.4,
    },


    // ========================================================
    // PAYMENT
    // ========================================================

    paymentCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E7DED1",

      shadowColor: "#171717",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.06,
      shadowRadius: 9,
      elevation: 2,
    },


    paymentIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: "#FFF7F3",
      borderWidth: 1,
      borderColor: "#F0CFC4",
      alignItems: "center",
      justifyContent: "center",
    },


    paymentTextContainer: {
      marginLeft: 11,
      flex: 1,
    },


    paymentTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: "#171717",
      marginBottom: 3,
    },


    paymentSubtitle: {
      fontSize: 11,
      fontWeight: "600",
      color: "#817B71",
      lineHeight: 16,
    },


    paymentCheck: {
      width: 27,
      height: 27,
      borderRadius: 10,
      backgroundColor: "#FFF7F3",
      alignItems: "center",
      justifyContent: "center",
    },


    // ========================================================
    // BOTTOM
    // ========================================================

    bottomContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#F7F3EC",
      paddingHorizontal: 18,
      paddingTop: 9,
      paddingBottom: 14,
    },


    bottomInner: {
      backgroundColor: "#FFFFFF",
      borderRadius: 21,
      padding: 13,
      borderWidth: 1,
      borderColor: "#E7DED1",

      shadowColor: "#171717",
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.06,
      shadowRadius: 9,
      elevation: 4,
    },


    bottomTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 9,
      paddingHorizontal: 3,
    },


    bottomTotalLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: "#817B71",
    },


    bottomTotalValue: {
      fontSize: 18,
      fontWeight: "900",
      color: "#171717",
    },


    placeOrderButton: {
      height: 52,
      borderRadius: 16,
      backgroundColor: "#E35B3F",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      shadowColor: "#E35B3F",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.18,
      shadowRadius: 9,
      elevation: 3,
    },


    placeOrderButtonDisabled: {
      opacity: 0.55,
    },


    placeOrderText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "900",
      marginRight: 9,
    },

  });
