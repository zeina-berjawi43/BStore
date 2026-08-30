import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';


/* =========================================================
   API
========================================================= */

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';


/* =========================================================
   TYPES
========================================================= */

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
  name: string;

  email?: string;

  password?: string;

  phone: string;

  address: string;
};


/* =========================================================
   CHECKOUT
========================================================= */

export default function Checkout() {


  /* =======================================================
     STATE
  ======================================================= */

  const [cart, setCart] =
    useState<CartItem[]>([]);


  const [user, setUser] =
    useState<User | null>(null);


  const [loading, setLoading] =
    useState(true);


  const [placingOrder, setPlacingOrder] =
    useState(false);


  /* =======================================================
     GET ACCESS TOKEN
  ======================================================= */

  const getAccessToken =
    async () => {

      try {

        const token =
          await AsyncStorage.getItem(
            'accessToken'
          );


        return token;

      } catch (error) {

        console.log(
          'GET TOKEN ERROR:',
          error
        );


        return null;
      }
    };


  /* =======================================================
     LOAD USER
  ======================================================= */

  const loadUser = async () => {

    try {

      const savedUser =
        await AsyncStorage.getItem(
          'user'
        );


      if (savedUser) {

        const parsedUser =
          JSON.parse(
            savedUser
          );


        setUser(
          parsedUser
        );

      } else {

        setUser(
          null
        );

      }

    } catch (error) {

      console.log(
        'LOAD USER ERROR:',
        error
      );


      setUser(
        null
      );

    }

  };


  /* =======================================================
     LOAD CART FROM DATABASE
  ======================================================= */

  const loadCart =
    async () => {

      try {

        const accessToken =
          await getAccessToken();


        if (!accessToken) {

          setCart(
            []
          );


          router.replace(
            '/login'
          );


          return;
        }


        const response =
          await fetch(
            `${API_URL}/cart`,
            {
              method: 'GET',

              headers: {

                Accept:
                  'application/json',

                Authorization:
                  `Bearer ${accessToken}`,

              },

            }
          );


        const data =
          await response.json();


        console.log(
          'CART RESPONSE:',
          data
        );


        /* ===============================================
           TOKEN EXPIRED
        =============================================== */

        if (
          response.status === 401 ||
          response.status === 403
        ) {

          setCart(
            []
          );


          await AsyncStorage.removeItem(
            'accessToken'
          );


          router.replace(
            '/login'
          );


          return;
        }


        /* ===============================================
           OTHER ERROR
        =============================================== */

        if (!response.ok) {

          console.log(
            'GET CART ERROR:',
            data
          );


          setCart(
            []
          );


          return;
        }


        /* ===============================================
           CART
        =============================================== */

        if (
          data.cart
        ) {

          setCart(
            data.cart.items || []
          );

        } else {

          setCart(
            []
          );

        }

      } catch (error) {

        console.log(
          'LOAD CART ERROR:',
          error
        );


        setCart(
          []
        );

      }

    };


  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  const loadData =
    async () => {

      setLoading(
        true
      );


      await Promise.all([

        loadUser(),

        loadCart(),

      ]);


      setLoading(
        false
      );

    };


  /* =======================================================
     LOAD WHEN SCREEN OPENS / FOCUSES
  ======================================================= */

  useFocusEffect(
    useCallback(() => {

      loadData();

    }, [])
  );


  /* =======================================================
     PRICE
  ======================================================= */

  /*
   * Prices are stored in USD.
   *
   * No currency conversion.
   *
   * No LBP.
   *
   * No exchange rate.
   */

  const getPrice = (
    price: string | number
  ) => {

    if (
      typeof price === 'number'
    ) {

      return price;

    }


    const cleanedPrice =
      String(price)
        .replace('$', '')
        .replace(',', '.')
        .trim();


    const numberPrice =
      Number(
        cleanedPrice
      );


    return Number.isNaN(
      numberPrice
    )
      ? 0
      : numberPrice;

  };


  /* =======================================================
     FORMAT USD
  ======================================================= */

  const formatUSD = (
    amount: number
  ) => {

    const safeAmount =
      Number(amount) || 0;


    return `$${safeAmount.toFixed(2)}`;

  };


  /* =======================================================
     TOTAL
  ======================================================= */

  /*
   * Total is calculated directly in USD.
   */

  const total =
    cart.reduce(
      (
        sum,
        item
      ) => {

        const price =
          getPrice(
            item.price
          );


        const quantity =
          Number(
            item.quantity
          ) || 0;


        return (
          sum +
          price *
          quantity
        );

      },
      0
    );


  /* =======================================================
     CUSTOMER INFORMATION
  ======================================================= */

  /*
   * Email is OPTIONAL.
   *
   * Required information:
   * - Name
   * - Phone
   * - Address
   */

  const hasCompleteInformation =
    !!(
      user &&
      user.name?.trim() &&
      user.phone?.trim() &&
      user.address?.trim()
    );


  /* =======================================================
     PLACE ORDER
  ======================================================= */

  const placeOrder =
    async () => {

      /* ===============================================
         CHECK CART
      =============================================== */

      if (
        cart.length === 0
      ) {

        Alert.alert(
          'Empty Cart',
          'Your cart is empty.'
        );


        return;

      }


      /* ===============================================
         CHECK LOGIN
      =============================================== */

      if (!user) {

        Alert.alert(
          'Login Required',
          'Please login before placing an order.'
        );


        router.push(
          '/login'
        );


        return;

      }


      /* ===============================================
         CHECK USER INFORMATION
      =============================================== */

      /*
       * Email is NOT required anymore.
       */

      if (
        !user.name?.trim() ||
        !user.phone?.trim() ||
        !user.address?.trim()
      ) {

        Alert.alert(
          'Missing Information',
          'Please complete your name, phone number, and address before placing the order.',
          [

            {
              text: 'Edit Information',

              onPress: () =>
                router.push(
                  '/edit-account'
                ),

            },

            {
              text: 'Cancel',

              style: 'cancel',

            },

          ]
        );


        return;

      }


      try {

        setPlacingOrder(
          true
        );


        /* =============================================
           GET TOKEN
        ============================================= */

        const accessToken =
          await getAccessToken();


        if (!accessToken) {

          Alert.alert(
            'Login Required',
            'Your session has expired. Please login again.'
          );


          router.replace(
            '/login'
          );


          return;

        }


        /* =============================================
           CREATE ORDER
           BACKEND:
           POST /orders/create
        ============================================= */

        /*
         * We only send the shipping address.
         *
         * The backend gets the real product
         * prices from MongoDB.
         *
         * No LBP.
         *
         * No exchange rate.
         *
         * No converted price.
         */

        const response =
          await fetch(
            `${API_URL}/orders/create`,
            {
              method: 'POST',

              headers: {

                Accept:
                  'application/json',

                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${accessToken}`,

              },

              body:
                JSON.stringify({

                  shippingAddress:
                    user.address.trim(),

                }),

            }
          );


        const data =
          await response.json();


        console.log(
          'CREATE ORDER RESPONSE:',
          data
        );


        /* =============================================
           AUTH ERROR
        ============================================= */

        if (
          response.status === 401 ||
          response.status === 403
        ) {

          Alert.alert(
            'Session Expired',
            'Please login again.'
          );


          await AsyncStorage.removeItem(
            'accessToken'
          );


          router.replace(
            '/login'
          );


          return;

        }


        /* =============================================
           CART NOT FOUND
        ============================================= */

        if (
          response.status === 404
        ) {

          Alert.alert(
            'Cart Error',
            data.message ||
              'Cart not found.'
          );


          return;

        }


        /* =============================================
           OTHER BACKEND ERROR
        ============================================= */

        if (
          !response.ok
        ) {

          console.log(
            'CREATE ORDER ERROR:',
            data
          );


          Alert.alert(
            'Order Failed',
            data.message ||
              'Something went wrong while creating your order.'
          );


          return;

        }


        /* =============================================
           SUCCESS
        ============================================= */

        if (
          response.status === 201 &&
          data.order
        ) {

          /*
           * Backend clears MongoDB cart
           * after successful order creation.
           *
           * Remove old prototype cart too.
           */

          await AsyncStorage.removeItem(
            'cart'
          );


          Alert.alert(
            'Order Placed 🎉',
            'Your order has been placed successfully.',
            [

              {
                text: 'OK',

                onPress: () =>
                  router.replace(
                    '/orders'
                  ),

              },

            ]
          );


          return;

        }


        /* =============================================
           FALLBACK
        ============================================= */

        Alert.alert(
          'Order',
          data.message ||
            'Order created successfully.'
        );


      } catch (error) {

        console.log(
          'PLACE ORDER ERROR:',
          error
        );


        Alert.alert(
          'Connection Error',
          'Could not connect to the server. Please make sure the backend is running.'
        );


      } finally {

        setPlacingOrder(
          false
        );

      }

    };


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {

    return (

      <View
        style={
          styles.loadingContainer
        }
      >

        <ActivityIndicator
          size="large"
          color="#D4AF37"
        />


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


  /* =======================================================
     UI
  ======================================================= */

  return (

    <View
      style={
        styles.container
      }
    >

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={
            styles.header
          }
        >

          <Pressable
            style={
              styles.backIconButton
            }
            onPress={() =>
              router.back()
            }
          >

            <Ionicons
              name="arrow-back"
              size={22}
              color="#000000"
            />

          </Pressable>


          <Text
            style={
              styles.title
            }
          >
            Checkout
          </Text>


          <View
            style={
              styles.headerSpace
            }
          />

        </View>


        {/* =================================================
            DELIVERY INFORMATION
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Delivery Information
        </Text>


        {user ? (

          <View
            style={
              styles.customerCard
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
                  size={20}
                  color="#D4AF37"
                />

              </View>


              <View
                style={
                  styles.infoContent
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
                  {user.name}
                </Text>

              </View>

            </View>


            {/* EMAIL */}

            {user.email?.trim() ? (

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
                    size={20}
                    color="#D4AF37"
                  />

                </View>


                <View
                  style={
                    styles.infoContent
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
                  size={20}
                  color="#D4AF37"
                />

              </View>


              <View
                style={
                  styles.infoContent
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
                    'Phone number not added'}
                </Text>

              </View>

            </View>


            {/* ADDRESS */}

            <View
              style={[
                styles.infoRow,
                styles.lastInfoRow,
              ]}
            >

              <View
                style={
                  styles.infoIcon
                }
              >

                <Ionicons
                  name="location-outline"
                  size={20}
                  color="#D4AF37"
                />

              </View>


              <View
                style={
                  styles.infoContent
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
                    'Address not added'}
                </Text>

              </View>

            </View>


            {/* WARNING */}

            {!hasCompleteInformation && (

              <View
                style={
                  styles.warningBox
                }
              >

                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#8A6A00"
                />


                <Text
                  style={
                    styles.warningText
                  }
                >
                  Please complete your
                  name, phone number, and
                  address before placing
                  the order.
                </Text>

              </View>

            )}


            {/* EDIT */}

            <Pressable
              style={
                styles.editButton
              }
              onPress={() =>
                router.push(
                  '/edit-account'
                )
              }
            >

              <Text
                style={
                  styles.editText
                }
              >
                Edit Information
              </Text>


              <Ionicons
                name="chevron-forward"
                size={17}
                color="#B0B0B0"
              />

            </Pressable>

          </View>

        ) : (

          /* =================================================
             LOGIN
          ================================================= */

          <View
            style={
              styles.loginCard
            }
          >

            <View
              style={
                styles.loginIcon
              }
            >

              <Ionicons
                name="person-outline"
                size={28}
                color="#D4AF37"
              />

            </View>


            <Text
              style={
                styles.loginTitle
              }
            >
              Login Required
            </Text>


            <Text
              style={
                styles.loginMessage
              }
            >
              Please login to continue
              with your order.
            </Text>


            <Pressable
              style={
                styles.loginButton
              }
              onPress={() =>
                router.push(
                  '/login'
                )
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


        {/* =================================================
            ORDER SUMMARY
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Order Summary
        </Text>


        {cart.length === 0 ? (

          <View
            style={
              styles.emptyCart
            }
          >

            <Ionicons
              name="cart-outline"
              size={45}
              color="#B0B0B0"
            />


            <Text
              style={
                styles.emptyCartTitle
              }
            >
              Your cart is empty
            </Text>


            <Text
              style={
                styles.emptyCartText
              }
            >
              Add some products before
              checking out.
            </Text>

          </View>

        ) : (

          cart.map(
            (
              item,
              index
            ) => {

              const product =
                item.product;


              /*
               * item.price is USD.
               */

              const unitPrice =
                getPrice(
                  item.price
                );


              /*
               * Total remains USD.
               */

              const productTotal =
                unitPrice *
                Number(
                  item.quantity
                );


              return (

                <View
                  key={`${product._id}-${index}`}
                  style={
                    styles.productRow
                  }
                >

                  {/* PRODUCT ICON */}

                  <View
                    style={
                      styles.productIcon
                    }
                  >

                    <Ionicons
                      name="cube-outline"
                      size={28}
                      color="#D4AF37"
                    />

                  </View>


                  {/* PRODUCT INFO */}

                  <View
                    style={
                      styles.productInfo
                    }
                  >

                    <Text
                      style={
                        styles.productName
                      }
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>


                    <Text
                      style={
                        styles.productCategory
                      }
                    >
                      {product.category?.name ||
                        ''}
                    </Text>


                    <Text
                      style={
                        styles.quantity
                      }
                    >
                      {formatUSD(
                        unitPrice
                      )}{' '}
                      ×{' '}
                      {item.quantity}
                    </Text>

                  </View>


                  {/* PRODUCT TOTAL */}

                  <Text
                    style={
                      styles.productTotal
                    }
                  >
                    {formatUSD(
                      productTotal
                    )}
                  </Text>

                </View>

              );

            }
          )

        )}


        {/* =================================================
            TOTAL
        ================================================= */}

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
                styles.totalItems
              }
            >
              {cart.reduce(
                (
                  sum,
                  item
                ) =>
                  sum +
                  Number(
                    item.quantity
                  ),
                0
              )}{' '}
              items
            </Text>

          </View>


          <Text
            style={
              styles.total
            }
          >
            {formatUSD(
              total
            )}
          </Text>

        </View>


        {/* =================================================
            PLACE ORDER
        ================================================= */}

        <Pressable
          style={[
            styles.placeOrderButton,

            (!user ||
              !hasCompleteInformation ||
              cart.length === 0 ||
              placingOrder) &&
              styles.disabledButton,
          ]}
          onPress={
            placeOrder
          }
          disabled={
            !user ||
            !hasCompleteInformation ||
            cart.length === 0 ||
            placingOrder
          }
        >

          {placingOrder ? (

            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />

          ) : (

            <Ionicons
              name="checkmark-circle-outline"
              size={21}
              color="#FFFFFF"
            />

          )}


          <Text
            style={
              styles.placeOrderText
            }
          >
            {placingOrder
              ? 'Placing Order...'
              : 'Place Order'}
          </Text>

        </Pressable>


        {/* =================================================
            BACK TO CART
        ================================================= */}

        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >

          <Ionicons
            name="arrow-back"
            size={18}
            color="#000000"
          />


          <Text
            style={
              styles.backButtonText
            }
          >
            Back to Cart
          </Text>

        </Pressable>


        <View
          style={
            styles.bottomSpace
          }
        />

      </ScrollView>

    </View>

  );

}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    /* =====================================================
       LOADING
    ===================================================== */

    loadingContainer: {
      flex: 1,

      backgroundColor:
        '#F7F7F7',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    loadingText: {
      marginTop: 12,

      fontSize: 14,

      color:
        '#1A1A1A',

      fontWeight:
        '600',
    },


    /* =====================================================
       CONTAINER
    ===================================================== */

    container: {
      flex: 1,

      backgroundColor:
        '#F7F7F7',

      paddingTop: 20,
    },


    scrollContent: {
      paddingHorizontal: 20,

      paddingTop: 18,

      paddingBottom: 40,
    },


    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 25,
    },


    backIconButton: {
      width: 44,

      height: 44,

      borderRadius: 22,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    title: {
      fontSize: 26,

      fontWeight:
        '800',

      color:
        '#000000',

      marginLeft: 12,
    },


    headerSpace: {
      width: 44,
    },


    /* =====================================================
       SECTIONS
    ===================================================== */

    sectionTitle: {
      fontSize: 20,

      fontWeight:
        '800',

      color:
        '#000000',

      marginTop: 5,

      marginBottom: 13,
    },


    /* =====================================================
       CUSTOMER CARD
    ===================================================== */

    customerCard: {
      backgroundColor:
        '#FFFFFF',

      borderRadius: 18,

      padding: 16,

      borderWidth: 1,

      borderColor:
        '#E0E0E0',
    },


    infoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 15,
    },


    lastInfoRow: {
      marginBottom: 0,
    },


    infoIcon: {
      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor:
        '#F7F7F7',

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    infoContent: {
      flex: 1,

      marginLeft: 12,
    },


    infoLabel: {
      fontSize: 11,

      color:
        '#888888',

      marginBottom: 3,
    },


    infoValue: {
      fontSize: 14,

      fontWeight:
        '600',

      color:
        '#000000',
    },


    warningBox: {
      marginTop: 16,

      padding: 12,

      borderRadius: 12,

      backgroundColor:
        '#FFF8E6',

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,
    },


    warningText: {
      flex: 1,

      fontSize: 12,

      lineHeight: 18,

      color:
        '#8A6A00',
    },


    editButton: {
      marginTop: 15,

      paddingVertical: 10,

      paddingHorizontal: 14,

      borderRadius: 12,

      backgroundColor:
        '#F7F7F7',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      alignSelf:
        'flex-start',

      gap: 5,
    },


    editText: {
      color:
        '#000000',

      fontSize: 13,

      fontWeight:
        '700',
    },


    /* =====================================================
       LOGIN
    ===================================================== */

    loginCard: {
      backgroundColor:
        '#FFFFFF',

      borderRadius: 18,

      padding: 22,

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      alignItems:
        'center',
    },


    loginIcon: {
      width: 58,

      height: 58,

      borderRadius: 29,

      backgroundColor:
        '#F7F7F7',

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 12,
    },


    loginTitle: {
      fontSize: 18,

      fontWeight:
        '800',

      color:
        '#000000',

      marginBottom: 6,
    },


    loginMessage: {
      fontSize: 13,

      lineHeight: 20,

      color:
        '#888888',

      textAlign:
        'center',

      marginBottom: 16,
    },


    loginButton: {
      backgroundColor:
        '#000000',

      paddingHorizontal: 24,

      paddingVertical: 11,

      borderRadius: 22,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,
    },


    loginButtonText: {
      color:
        '#FFFFFF',

      fontSize: 14,

      fontWeight:
        '700',
    },


    /* =====================================================
       EMPTY CART
    ===================================================== */

    emptyCart: {
      backgroundColor:
        '#FFFFFF',

      borderRadius: 18,

      padding: 25,

      alignItems:
        'center',

      borderWidth: 1,

      borderColor:
        '#E0E0E0',
    },


    emptyCartTitle: {
      marginTop: 10,

      fontSize: 17,

      fontWeight:
        '700',

      color:
        '#000000',
    },


    emptyCartText: {
      marginTop: 5,

      fontSize: 13,

      color:
        '#888888',

      textAlign:
        'center',
    },


    /* =====================================================
       PRODUCTS
    ===================================================== */

    productRow: {
      backgroundColor:
        '#FFFFFF',

      borderRadius: 16,

      padding: 12,

      marginBottom: 10,

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    productIcon: {
      width: 58,

      height: 58,

      borderRadius: 13,

      backgroundColor:
        '#F7F7F7',

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    productInfo: {
      flex: 1,

      marginLeft: 12,
    },


    productName: {
      fontSize: 14,

      fontWeight:
        '700',

      color:
        '#000000',
    },


    productCategory: {
      marginTop: 3,

      fontSize: 11,

      color:
        '#888888',
    },


    quantity: {
      marginTop: 5,

      fontSize: 12,

      color:
        '#777777',

      fontWeight:
        '600',
    },


    productTotal: {
      marginLeft: 8,

      fontSize: 13,

      fontWeight:
        '800',

      color:
        '#000000',

      maxWidth: 105,

      textAlign:
        'right',
    },


    /* =====================================================
       TOTAL
    ===================================================== */

    totalCard: {
      marginTop: 8,

      padding: 18,

      backgroundColor:
        '#000000',

      borderRadius: 18,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    totalLabel: {
      fontSize: 20,

      fontWeight:
        '800',

      color:
        '#FFFFFF',
    },


    totalItems: {
      marginTop: 3,

      fontSize: 11,

      color:
        '#CFCFCF',
    },


    total: {
      fontSize: 18,

      fontWeight:
        '800',

      color:
        '#D4AF37',

      maxWidth: 170,

      textAlign:
        'right',
    },


    /* =====================================================
       PLACE ORDER
    ===================================================== */

    placeOrderButton: {
      marginTop: 18,

      backgroundColor:
        '#D4AF37',

      paddingVertical: 15,

      borderRadius: 25,

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',

      gap: 8,
    },


    disabledButton: {
      backgroundColor:
        '#CFCFCF',
    },


    placeOrderText: {
      color:
        '#FFFFFF',

      fontSize: 16,

      fontWeight:
        '800',
    },


    /* =====================================================
       BACK
    ===================================================== */

    backButton: {
      marginTop: 12,

      paddingVertical: 14,

      borderRadius: 25,

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',

      gap: 7,

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      backgroundColor:
        '#FFFFFF',
    },


    backButtonText: {
      color:
        '#000000',

      fontSize: 14,

      fontWeight:
        '700',
    },


    bottomSpace: {
      height: 20,
    },

  });
