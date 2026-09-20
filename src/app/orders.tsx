import { request } from '../services/request';
import {
  View,
  Alert,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';


import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';

import { getValidAccessToken, logoutLocal } from '../services/authService';


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

      if (loading) {
        return;
      }


      try {

        setLoading(true);


        /* ================================================
           GET ACCESS TOKEN
        ================================================ */

        const accessToken =
          await getValidAccessToken();


        if (!accessToken) {

          setOrders([]);

          router.replace(
            '/login'
          );

          return;

        }


        const response =
          await request(
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


        if (__DEV__) { console.log(
          'ORDERS RESPONSE:',
          data
        ); }


        if (
          response.status === 401
        ) {

          await logoutLocal();

          setOrders([]);

          router.replace(
            '/login'
          );

          return;

        }


        if (!response.ok) {
          Alert.alert('Orders unavailable', data.message || 'Please try again.');

          if (__DEV__) { console.log(
            'GET ORDERS ERROR:',
            data
          ); }

          setOrders([]);

          return;

        }


        setOrders(

          Array.isArray(
            data.orders
          )
            ? data.orders
            : []

        );


      } catch (error) {
        Alert.alert('Orders unavailable', error instanceof Error ? error.message : 'Please try again.');

        if (__DEV__) { console.log(
          'LOAD ORDERS ERROR:',
          error
        ); }

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

          return '#E35B3F';

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

        return '#FFF1F1';

      }


      if (
        status === 'Delivered'
      ) {

        return '#EFFAF3';

      }


      return '#FFF7F3';

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
                styles.title
              }
            >
              My Orders
            </Text>

            {orders.length > 0 && (

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                {orders.length}{' '}
                {orders.length === 1
                  ? 'order'
                  : 'orders'}
              </Text>

            )}

          </View>


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
                color="#E35B3F"
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


                const statusColor =
                  getStatusColor(
                    order.status
                  );


                const statusBackground =
                  getStatusBackground(
                    order.status
                  );


                const displayTotal =
                  formatPrice(
                    order.totalPrice
                  );


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
                          color="#E35B3F"
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
                              statusColor,
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
                          style={[
                            styles.statusText,

                            {
                              color:
                                statusColor,
                            },

                          ]}
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
      paddingTop: 20,
      backgroundColor:
        '#F7F3EC',
    },


    scrollContent: {
      paddingHorizontal: 18,

      paddingTop: 18,

      paddingBottom: 40,
    },


    header: {
      flexDirection: 'row',

      alignItems: 'center',

      marginBottom: 20,
    },


    backButton: {
      width: 46,

      height: 46,

      borderRadius: 16,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      alignItems: 'center',

      justifyContent: 'center',

      marginRight: 13,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.06,

      shadowRadius: 8,

      elevation: 2,
    },


    headerTextContainer: {
      flex: 1,
    },


    title: {
      fontSize: 29,

      fontWeight: '900',

      color: '#171717',

      letterSpacing: -0.8,
    },


    headerSubtitle: {
      marginTop: 2,

      fontSize: 13,

      fontWeight: '600',

      color: '#817B71',
    },


    headerSpace: {
      width: 46,
    },


    orderCard: {
      backgroundColor:
        '#FFFFFF',

      borderRadius: 21,

      padding: 16,

      marginBottom: 14,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.07,

      shadowRadius: 10,

      elevation: 2,
    },


    orderTop: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
    },


    orderTitleContainer: {
      flex: 1,

      paddingRight: 12,
    },


    orderNumber: {
      fontSize: 17,

      fontWeight: '900',

      color: '#171717',

      letterSpacing: -0.2,
    },


    orderDate: {
      marginTop: 5,

      fontSize: 13,

      fontWeight: '600',

      color: '#817B71',
    },


    arrowContainer: {
      width: 38,

      height: 38,

      borderRadius: 13,

      backgroundColor:
        '#FFF7F3',

      borderWidth: 1,

      borderColor:
        '#F0CFC4',

      alignItems: 'center',

      justifyContent: 'center',
    },


    divider: {
      height: 1,

      backgroundColor:
        '#EEE4D7',

      marginVertical: 15,
    },


    orderInfo: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',
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

      fontWeight: '700',

      color: '#9A9186',

      marginBottom: 5,

      letterSpacing: 0.2,
    },


    infoValue: {
      fontSize: 14,

      fontWeight: '800',

      color: '#24221E',
    },


    total: {
      fontSize: 17,

      fontWeight: '900',

      color: '#171717',
    },


    statusContainer: {
      paddingHorizontal: 11,

      paddingVertical: 8,

      borderRadius: 14,

      borderWidth: 1,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 6,
    },


    statusDot: {
      width: 7,

      height: 7,

      borderRadius: 4,
    },


    statusText: {
      fontSize: 12,

      fontWeight: '800',
    },


    emptyContainer: {
      alignItems: 'center',

      justifyContent: 'center',

      marginTop: 95,

      paddingHorizontal: 25,
    },


    emptyIcon: {
      width: 76,

      height: 76,

      borderRadius: 22,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      alignItems: 'center',

      justifyContent: 'center',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.06,

      shadowRadius: 9,

      elevation: 2,
    },


    emptyTitle: {
      marginTop: 20,

      fontSize: 23,

      fontWeight: '900',

      color: '#171717',

      letterSpacing: -0.4,
    },


    emptyText: {
      marginTop: 8,

      fontSize: 14,

      lineHeight: 21,

      textAlign: 'center',

      color: '#817B71',

      fontWeight: '500',

      maxWidth: 290,
    },


    shopButton: {
      marginTop: 25,

      minHeight: 50,

      paddingHorizontal: 22,

      borderRadius: 16,

      backgroundColor:
        '#171717',

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 8,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.14,

      shadowRadius: 8,

      elevation: 3,
    },


    shopButtonText: {
      color: '#FFFFFF',

      fontSize: 14,

      fontWeight: '800',

      letterSpacing: 0.1,
    },

  });