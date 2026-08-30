import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
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

type OrderProduct = {
  _id: string;

  name: string;

  category?: {
    name?: string;
  };
};


type OrderItem = {
  product: OrderProduct | null;

  quantity: number;

  price: number;
};


type BackendOrder = {
  _id: string;

  user: string;

  items: OrderItem[];

  totalPrice: number;

  status:
    | 'Pending'
    | 'Confirmed'
    | 'Preparing'
    | 'Shipped'
    | 'Delivered'
    | 'Cancelled';

  shippingAddress: string;

  createdAt: string;

  updatedAt?: string;
};


/* =========================================================
   PRICE FORMAT
========================================================= */

/*
 * No currency conversion here.
 *
 * We simply display the totalPrice
 * saved inside the order.
 */

const formatPrice = (
  amount: number
) => {

  const safeAmount =
    Number(amount) || 0;

  return `$${safeAmount.toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};


/* =========================================================
   ORDERS
========================================================= */

export default function Orders() {

  const [
    orders,
    setOrders
  ] =
    useState<
      BackendOrder[]
    >([]);


  /*
   * Internal loading state only.
   *
   * We do NOT show a loading page anymore.
   */

  const [
    loading,
    setLoading
  ] =
    useState(false);


  /* =======================================================
     LOAD ORDERS
  ======================================================= */

  const loadOrders =
    async () => {

      /*
       * Prevent duplicate requests.
       */

      if (loading) {
        return;
      }


      try {

        setLoading(true);


        /* ================================================
           GET ACCESS TOKEN
        ================================================ */

        const accessToken =
          await AsyncStorage.getItem(
            'accessToken'
          );


        /* ================================================
           NO TOKEN
        ================================================ */

        if (!accessToken) {

          setOrders([]);

          router.replace(
            '/login'
          );

          return;

        }


        /* ================================================
           GET USER ORDERS
        ================================================ */

        const response =
          await fetch(
            `${API_URL}/orders`,
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
          'ORDERS RESPONSE:',
          data
        );


        /* ================================================
           TOKEN EXPIRED
        ================================================ */

        if (
          response.status === 401 ||
          response.status === 403
        ) {

          await AsyncStorage.removeItem(
            'accessToken'
          );

          setOrders([]);

          router.replace(
            '/login'
          );

          return;

        }


        /* ================================================
           ERROR
        ================================================ */

        if (!response.ok) {

          console.log(
            'GET ORDERS ERROR:',
            data
          );

          setOrders([]);

          return;

        }


        /* ================================================
           SAVE ORDERS
        ================================================ */

        setOrders(

          Array.isArray(
            data.orders
          )
            ? data.orders
            : []

        );


      } catch (error) {

        console.log(
          'LOAD ORDERS ERROR:',
          error
        );

        setOrders([]);

      } finally {

        setLoading(false);

      }

    };


  /* =======================================================
     LOAD WHEN SCREEN FOCUSES
  ======================================================= */

  useFocusEffect(
    useCallback(
      () => {

        loadOrders();

      },
      []
    )
  );


  /* =======================================================
     STATUS COLOR
  ======================================================= */

  const getStatusColor =
    (
      status: BackendOrder['status']
    ) => {

      switch (status) {

        case 'Delivered':

          return '#3A8F5B';


        case 'Cancelled':

          return '#C94C4C';


        case 'Confirmed':
        case 'Preparing':
        case 'Shipped':
        case 'Pending':
        default:

          return '#D4AF37';

      }

    };


  /* =======================================================
     STATUS BACKGROUND
  ======================================================= */

  const getStatusBackground =
    (
      status: BackendOrder['status']
    ) => {

      if (
        status === 'Cancelled'
      ) {

        return '#FFF0F0';

      }


      if (
        status === 'Delivered'
      ) {

        return '#EFFAF3';

      }


      return '#FFF8E6';

    };


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
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >

            <Ionicons
              name="arrow-back"
              size={23}
              color="#000000"
            />

          </Pressable>


          <Text
            style={
              styles.title
            }
          >
            My Orders
          </Text>


          <View
            style={
              styles.headerSpace
            }
          />

        </View>


        {/* =================================================
            EMPTY ORDERS
        ================================================= */}

        {orders.length === 0 ? (

          <View
            style={
              styles.emptyContainer
            }
          >

            <View
              style={
                styles.emptyIcon
              }
            >

              <Ionicons
                name="receipt-outline"
                size={32}
                color="#D4AF37"
              />

            </View>


            <Text
              style={
                styles.emptyTitle
              }
            >
              No orders yet
            </Text>


            <Text
              style={
                styles.emptyText
              }
            >
              Your orders will appear
              here after you place
              an order.
            </Text>


            <Pressable
              style={
                styles.shopButton
              }
              onPress={() =>
                router.replace('/')
              }
            >

              <Text
                style={
                  styles.shopButtonText
                }
              >
                Start Shopping
              </Text>


              <Ionicons
                name="arrow-forward"
                size={17}
                color="#FFFFFF"
              />

            </Pressable>

          </View>

        ) : (

          /* =================================================
             ORDERS
          ================================================= */

          <View>

            {orders.map(
              (
                order
              ) => {

                /* =========================================
                   TOTAL ITEMS
                ========================================= */

                const items =
                  Array.isArray(
                    order.items
                  )
                    ? order.items.reduce(
                        (
                          total,
                          item
                        ) => {

                          return (
                            total +
                            Number(
                              item.quantity
                            )
                          );

                        },
                        0
                      )
                    : 0;


                /* =========================================
                   DATE
                ========================================= */

                const date =
                  new Date(
                    order.createdAt
                  ).toLocaleDateString(
                    'en-US',
                    {
                      month:
                        'short',

                      day:
                        'numeric',

                      year:
                        'numeric',
                    }
                  );


                /* =========================================
                   STATUS
                ========================================= */

                const statusColor =
                  getStatusColor(
                    order.status
                  );


                const statusBackground =
                  getStatusBackground(
                    order.status
                  );


                /* =========================================
                   TOTAL
                ========================================= */

                const displayTotal =
                  formatPrice(
                    order.totalPrice
                  );


                /* =========================================
                   ORDER CARD
                ========================================= */

                return (

                  <Pressable
                    key={
                      order._id
                    }
                    style={
                      styles.orderCard
                    }
                    onPress={() =>
                      router.push({
                        pathname:
                          '/order-details',

                        params: {
                          orderId:
                            order._id,
                        },
                      })
                    }
                  >

                    {/* =================================
                        TOP
                    ================================= */}

                    <View
                      style={
                        styles.orderTop
                      }
                    >

                      <View
                        style={
                          styles.orderTitleContainer
                        }
                      >

                        <Text
                          style={
                            styles.orderNumber
                          }
                          numberOfLines={1}
                        >
                          Order #
                          {
                            order._id.slice(
                              -8
                            )
                          }
                        </Text>


                        <Text
                          style={
                            styles.orderDate
                          }
                        >
                          {date}
                        </Text>

                      </View>


                      <View
                        style={
                          styles.arrowContainer
                        }
                      >

                        <Ionicons
                          name="chevron-forward"
                          size={19}
                          color="#D4AF37"
                        />

                      </View>

                    </View>


                    {/* =================================
                        DIVIDER
                    ================================= */}

                    <View
                      style={
                        styles.divider
                      }
                    />


                    {/* =================================
                        INFO
                    ================================= */}

                    <View
                      style={
                        styles.orderInfo
                      }
                    >

                      {/* ITEMS */}

                      <View
                        style={
                          styles.infoBlock
                        }
                      >

                        <Text
                          style={
                            styles.infoLabel
                          }
                        >
                          Items
                        </Text>


                        <Text
                          style={
                            styles.infoValue
                          }
                        >
                          {items}{' '}

                          {items === 1
                            ? 'Product'
                            : 'Products'}
                        </Text>

                      </View>


                      {/* TOTAL */}

                      <View
                        style={
                          styles.totalBlock
                        }
                      >

                        <Text
                          style={
                            styles.infoLabel
                          }
                        >
                          Total
                        </Text>


                        <Text
                          style={
                            styles.total
                          }
                          numberOfLines={2}
                        >
                          {displayTotal}
                        </Text>

                      </View>


                      {/* STATUS */}

                      <View
                        style={[
                          styles.statusContainer,

                          {
                            backgroundColor:
                              statusBackground,

                            borderColor:
                              '#E0E0E0',
                          },

                        ]}
                      >

                        <View
                          style={[
                            styles.statusDot,

                            {
                              backgroundColor:
                                statusColor,
                            },

                          ]}
                        />


                        <Text
                          style={
                            styles.statusText
                          }
                        >
                          {
                            order.status
                          }
                        </Text>

                      </View>

                    </View>

                  </Pressable>

                );

              }
            )}

          </View>

        )}

      </ScrollView>

    </View>

  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: '#F7F7F7',
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
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 25,
    },


    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,

      backgroundColor: '#FFFFFF',

      borderWidth: 1,
      borderColor: '#E0E0E0',

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 12,
    },


    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#000000',
    },


    headerSpace: {
      flex: 1,
    },


    /* =====================================================
       ORDER CARD
    ===================================================== */

    orderCard: {
      backgroundColor: '#FFFFFF',

      borderRadius: 18,

      padding: 16,

      marginBottom: 15,

      borderWidth: 1,
      borderColor: '#E0E0E0',
    },


    orderTop: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',
    },


    orderTitleContainer: {
      flex: 1,
    },


    orderNumber: {
      fontSize: 16,

      fontWeight: '700',

      color: '#1A1A1A',
    },


    orderDate: {
      marginTop: 5,

      fontSize: 13,

      color: '#888888',
    },


    arrowContainer: {
      width: 34,
      height: 34,

      borderRadius: 17,

      backgroundColor: '#F7F7F7',

      borderWidth: 1,
      borderColor: '#E0E0E0',

      alignItems: 'center',
      justifyContent: 'center',
    },


    /* =====================================================
       DIVIDER
    ===================================================== */

    divider: {
      height: 1,

      backgroundColor: '#E0E0E0',

      marginVertical: 15,
    },


    /* =====================================================
       ORDER INFO
    ===================================================== */

    orderInfo: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',
    },


    infoBlock: {
      minWidth: 65,
    },


    totalBlock: {
      minWidth: 90,

      flex: 1,

      marginLeft: 8,
    },


    infoLabel: {
      fontSize: 12,

      color: '#888888',

      marginBottom: 4,
    },


    infoValue: {
      fontSize: 14,

      fontWeight: '600',

      color: '#1A1A1A',
    },


    total: {
      fontSize: 16,

      fontWeight: '800',

      color: '#D4AF37',
    },


    /* =====================================================
       STATUS
    ===================================================== */

    statusContainer: {
      paddingHorizontal: 10,

      paddingVertical: 7,

      borderRadius: 15,

      borderWidth: 1,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,
    },


    statusDot: {
      width: 7,

      height: 7,

      borderRadius: 4,
    },


    statusText: {
      fontSize: 12,

      fontWeight: '700',

      color: '#1A1A1A',
    },


    /* =====================================================
       EMPTY
    ===================================================== */

    emptyContainer: {
      alignItems: 'center',

      justifyContent: 'center',

      marginTop: 100,

      paddingHorizontal: 25,
    },


    emptyIcon: {
      width: 70,

      height: 70,

      borderRadius: 35,

      backgroundColor: '#FFFFFF',

      borderWidth: 1,

      borderColor: '#E0E0E0',

      alignItems: 'center',

      justifyContent: 'center',
    },


    emptyTitle: {
      marginTop: 20,

      fontSize: 22,

      fontWeight: '800',

      color: '#000000',
    },


    emptyText: {
      marginTop: 8,

      fontSize: 14,

      lineHeight: 21,

      textAlign: 'center',

      color: '#888888',
    },


    shopButton: {
      marginTop: 25,

      paddingHorizontal: 22,

      paddingVertical: 13,

      borderRadius: 25,

      backgroundColor: '#000000',

      flexDirection: 'row',

      alignItems: 'center',

      gap: 8,
    },


    shopButtonText: {
      color: '#FFFFFF',

      fontSize: 14,

      fontWeight: '700',
    },

  });
