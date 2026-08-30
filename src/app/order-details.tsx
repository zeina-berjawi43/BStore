
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
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

type Product = {
  _id: string;

  name: string;

  image?: string;

  category?: {
    _id?: string;
    name?: string;
  };

  brand?: {
    _id?: string;
    name?: string;
  };
};


type OrderItem = {
  product: Product | null;

  quantity: number;

  price: number;
};


type BackendOrder = {
  _id: string;

  user:
    | {
        _id?: string;
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
      }
    | string;

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
   PRICE FORMATTER
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
   DATE FORMATTER
========================================================= */

const formatOrderDate = (
  date?: string
) => {

  if (!date) {
    return 'Not available';
  }

  const parsedDate =
    new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return 'Not available';
  }

  return parsedDate.toLocaleDateString(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );
};


/* =========================================================
   IMAGE URL
========================================================= */

const getImageUrl = (
  image?: string
) => {

  if (!image) {
    return '';
  }

  if (
    image.startsWith('http://') ||
    image.startsWith('https://')
  ) {

    return image;

  }

  return `${API_URL}/uploads/${image}`;
};


/* =========================================================
   STATUS STYLES
========================================================= */

const getStatusStyles = (
  status: BackendOrder['status']
) => {

  switch (status) {

    case 'Confirmed':

      return {
        backgroundColor: '#EEF7EE',
        borderColor: '#CFE5CF',
        dotColor: '#4CAF50',
        textColor: '#3D7A3D',
      };


    case 'Preparing':

      return {
        backgroundColor: '#FFF8E7',
        borderColor: '#F1E3B5',
        dotColor: '#D4AF37',
        textColor: '#A47F00',
      };


    case 'Shipped':

      return {
        backgroundColor: '#EEF5FF',
        borderColor: '#D2E2F8',
        dotColor: '#4A90E2',
        textColor: '#3570B2',
      };


    case 'Delivered':

      return {
        backgroundColor: '#EEF8F2',
        borderColor: '#CFE8D8',
        dotColor: '#2E9B57',
        textColor: '#287A46',
      };


    case 'Cancelled':

      return {
        backgroundColor: '#FFF0F0',
        borderColor: '#F0CCCC',
        dotColor: '#D9534F',
        textColor: '#B33A37',
      };


    case 'Pending':
    default:

      return {
        backgroundColor: '#FFF8E7',
        borderColor: '#F1E3B5',
        dotColor: '#D4AF37',
        textColor: '#D4AF37',
      };

  }

};


/* =========================================================
   COMPONENT
========================================================= */

export default function OrderDetails() {

  const {
    orderId,
  } =
    useLocalSearchParams<{
      orderId: string;
    }>();


  /* =======================================================
     STATE
  ======================================================= */

  const [
    order,
    setOrder
  ] =
    useState<
      BackendOrder | null
    >(null);


  const [
    loading,
    setLoading
  ] =
    useState(true);


  /* =======================================================
     GET ACCESS TOKEN
  ======================================================= */

  const getAccessToken =
    async () => {

      try {

        return await AsyncStorage.getItem(
          'accessToken'
        );

      } catch (error) {

        console.log(
          'GET TOKEN ERROR:',
          error
        );

        return null;

      }

    };


  /* =======================================================
     LOAD ORDER
  ======================================================= */

  const loadOrder =
    async () => {

      try {

        setLoading(true);


        /* ================================================
           CHECK ORDER ID
        ================================================ */

        if (!orderId) {

          setOrder(null);

          return;

        }


        /* ================================================
           TOKEN
        ================================================ */

        const accessToken =
          await getAccessToken();


        if (!accessToken) {

          router.replace(
            '/login'
          );

          return;

        }


        /* ================================================
           GET ORDER
        ================================================ */

        const response =
          await fetch(
            `${API_URL}/orders/${orderId}`,
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
          'ORDER DETAILS RESPONSE:',
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
            'GET ORDER DETAILS ERROR:',
            data
          );

          setOrder(null);

          return;

        }


        /* ================================================
           SAVE ORDER
        ================================================ */

        if (
          data.order
        ) {

          setOrder(
            data.order
          );

        } else {

          setOrder(null);

        }


      } catch (error) {

        console.log(
          'LOAD ORDER ERROR:',
          error
        );

        setOrder(null);

      } finally {

        setLoading(false);

      }

    };


  /* =======================================================
     REFRESH ON FOCUS
  ======================================================= */

  useFocusEffect(
    useCallback(
      () => {

        loadOrder();

      },
      [orderId]
    )
  );


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

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
          Loading order...
        </Text>

      </View>

    );

  }


  /* =======================================================
     ORDER NOT FOUND
  ======================================================= */

  if (!order) {

    return (

      <View
        style={
          styles.emptyContainer
        }
      >

        <Ionicons
          name="receipt-outline"
          size={60}
          color="#D4AF37"
        />


        <Text
          style={
            styles.emptyTitle
          }
        >
          Order not found
        </Text>


        <Pressable
          style={
            styles.backHomeButton
          }
          onPress={() =>
            router.replace(
              '/orders'
            )
          }
        >

          <Text
            style={
              styles.backHomeText
            }
          >
            Back to Orders
          </Text>

        </Pressable>

      </View>

    );

  }


  /* =======================================================
     CUSTOMER
  ======================================================= */

  const customer =
    typeof order.user === 'object'
      ? order.user
      : null;


  const customerName =
    customer?.name ||
    'Customer';


  const customerEmail =
    customer?.email ||
    '';


  const customerPhone =
    customer?.phone ||
    '';


  const shippingAddress =
    order.shippingAddress ||
    customer?.address ||
    '';


  /* =======================================================
     STATUS
  ======================================================= */

  const statusStyles =
    getStatusStyles(
      order.status
    );


  /* =======================================================
     TOTAL ITEMS
  ======================================================= */

  const totalItems =
    Array.isArray(
      order.items
    )
      ? order.items.reduce(
          (
            sum,
            item
          ) => {

            return (
              sum +
              Number(
                item.quantity
              )
            );

          },
          0
        )
      : 0;


  /* =======================================================
     ORDER TOTAL
  ======================================================= */

  const orderTotal =
    Array.isArray(
      order.items
    ) &&
    order.items.length > 0
      ? order.items.reduce(
          (
            total,
            item
          ) => {

            const price =
              Number(
                item.price
              ) || 0;

            const quantity =
              Number(
                item.quantity
              ) || 0;

            return (
              total +
              price *
              quantity
            );

          },
          0
        )
      : Number(
          order.totalPrice
        ) || 0;


  /* =======================================================
     MAIN UI
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
            Order Details
          </Text>


          <View
            style={
              styles.headerSpace
            }
          />

        </View>


        {/* =================================================
            ORDER HEADER
        ================================================= */}

        <View
          style={
            styles.orderHeaderCard
          }
        >

          <View>

            <Text
              style={
                styles.orderLabel
              }
            >
              Order
            </Text>


            <Text
              style={
                styles.orderNumber
              }
              numberOfLines={1}
            >
              #{order._id}
            </Text>


            {/* =================================================
                ORDER DATE
            ================================================= */}

            <View
              style={
                styles.orderDateRow
              }
            >

              <Ionicons
                name="calendar-outline"
                size={15}
                color="#A3948A"
              />

              <Text
                style={
                  styles.date
                }
              >
                {formatOrderDate(
                  order.createdAt
                )}
              </Text>

            </View>

          </View>


          {/* STATUS */}

          <View
            style={[
              styles.statusContainer,
              {
                backgroundColor:
                  statusStyles.backgroundColor,

                borderColor:
                  statusStyles.borderColor,
              },
            ]}
          >

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    statusStyles.dotColor,
                },
              ]}
            />


            <Text
              style={[
                styles.statusText,
                {
                  color:
                    statusStyles.textColor,
                },
              ]}
            >
              {order.status}
            </Text>

          </View>

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
                {customerName}
              </Text>

            </View>

          </View>


          {/* EMAIL */}

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
                {customerEmail ||
                  'Not available'}
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
                {customerPhone ||
                  'Not available'}
              </Text>

            </View>

          </View>


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
                {shippingAddress ||
                  'Not available'}
              </Text>

            </View>

          </View>

        </View>


        {/* =================================================
            PRODUCTS
        ================================================= */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Products
        </Text>


        {order.items.map(
          (
            item,
            index
          ) => {

            const product =
              item.product;


            const itemPrice =
              Number(
                item.price
              ) || 0;


            const quantity =
              Number(
                item.quantity
              ) || 0;


            const productTotal =
              itemPrice *
              quantity;


            const imageUrl =
              getImageUrl(
                product?.image
              );


            return (

              <View
                key={
                  `${product?._id || 'product'}-${index}`
                }
                style={
                  styles.productCard
                }
              >

                {/* PRODUCT IMAGE */}

                <View
                  style={
                    styles.productImage
                  }
                >

                  {imageUrl ? (

                    <Image
                      source={{
                        uri:
                          imageUrl,
                      }}
                      style={
                        styles.realProductImage
                      }
                      resizeMode="contain"
                    />

                  ) : (

                    <Ionicons
                      name="cube-outline"
                      size={30}
                      color="#D4AF37"
                    />

                  )}

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
                    {product?.name ||
                      'Product'}
                  </Text>


                  <Text
                    style={
                      styles.productCategory
                    }
                  >
                    {product?.category?.name ||
                      product?.brand?.name ||
                      ''}
                  </Text>


                  <Text
                    style={
                      styles.quantity
                    }
                  >

                    {formatPrice(
                      itemPrice
                    )}

                    {' × '}

                    {quantity}

                  </Text>

                </View>


                {/* PRODUCT TOTAL */}

                <Text
                  style={
                    styles.productTotal
                  }
                >
                  {formatPrice(
                    productTotal
                  )}
                </Text>

              </View>

            );

          }
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
              {totalItems}{' '}

              {totalItems === 1
                ? 'item'
                : 'items'}

            </Text>

          </View>


          <Text
            style={
              styles.total
            }
          >
            {formatPrice(
              orderTotal
            )}
          </Text>

        </View>


        {/* =================================================
            BACK TO ORDERS
        ================================================= */}

        <Pressable
          style={
            styles.backOrdersButton
          }
          onPress={() =>
            router.replace(
              '/orders'
            )
          }
        >

          <Ionicons
            name="arrow-back"
            size={18}
            color="#5A3A2A"
          />


          <Text
            style={
              styles.backOrdersText
            }
          >
            Back to My Orders
          </Text>

        </Pressable>

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
      backgroundColor: '#FFFCF8',
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
      marginBottom: 22,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F0E4DA',
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
       ORDER HEADER
    ===================================================== */

    orderHeaderCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: '#F0E4DA',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    orderLabel: {
      fontSize: 12,
      color: '#A3948A',
    },

    orderNumber: {
      marginTop: 3,
      fontSize: 16,
      fontWeight: '700',
      color: '#5A3A2A',
      maxWidth: 220,
    },

    orderDateRow: {
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    date: {
      fontSize: 13,
      color: '#A3948A',
    },


    /* =====================================================
       STATUS
    ===================================================== */

    statusContainer: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    statusText: {
      fontSize: 13,
      fontWeight: '700',
    },


    /* =====================================================
       SECTIONS
    ===================================================== */

    sectionTitle: {
      marginTop: 25,
      marginBottom: 12,
      fontSize: 20,
      fontWeight: '800',
      color: '#000000',
    },


    /* =====================================================
       DELIVERY INFORMATION
    ===================================================== */

    infoCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: '#F0E4DA',
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },

    infoRowLast: {
      marginBottom: 0,
    },

    infoIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#FFF8E7',
      borderWidth: 1,
      borderColor: '#F0E4DA',
      alignItems: 'center',
      justifyContent: 'center',
    },

    infoContent: {
      flex: 1,
      marginLeft: 12,
    },

    infoLabel: {
      fontSize: 12,
      color: '#A3948A',
    },

    infoValue: {
      marginTop: 3,
      fontSize: 15,
      fontWeight: '600',
      color: '#5A3A2A',
    },


    /* =====================================================
       PRODUCTS
    ===================================================== */

    productCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#F0E4DA',
      flexDirection: 'row',
      alignItems: 'center',
    },

    productImage: {
      width: 65,
      height: 65,
      paddingLeft:5,
      paddingRight:5,
      borderRadius: 13,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F0E4DA',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    realProductImage: {
      width: '100%',
      height: '100%',
    },

    productInfo: {
      flex: 1,
      marginLeft: 12,
    },

    productName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#000000',
    },

    productCategory: {
      marginTop: 3,
      fontSize: 12,
      color: '#A3948A',
    },

    quantity: {
      marginTop: 5,
      fontSize: 13,
      color: '#A3948A',
    },

    productTotal: {
      marginLeft: 8,
      fontSize: 15,
      fontWeight: '800',
      color: '#D4AF37',
      maxWidth: 120,
      textAlign: 'right',
    },


    /* =====================================================
       TOTAL
    ===================================================== */

    totalCard: {
      marginTop: 5,
      padding: 18,
      backgroundColor: '#FFF8E7',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#F1E3B5',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    totalLabel: {
      fontSize: 20,
      fontWeight: '800',
      color: '#5A3A2A',
    },

    totalItems: {
      marginTop: 3,
      fontSize: 11,
      color: '#A3948A',
    },

    total: {
      fontSize: 22,
      fontWeight: '800',
      color: '#D4AF37',
      maxWidth: 190,
      textAlign: 'right',
    },


    /* =====================================================
       BACK TO ORDERS
    ===================================================== */

    backOrdersButton: {
      marginTop: 20,
      paddingVertical: 14,
      borderRadius: 25,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F0E4DA',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },

    backOrdersText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#5A3A2A',
    },


    /* =====================================================
       API LOADING
    ===================================================== */

    loadingContainer: {
      flex: 1,
      backgroundColor: '#FFFCF8',
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: '#A3948A',
    },


    /* =====================================================
       EMPTY
    ===================================================== */

    emptyContainer: {
      flex: 1,
      backgroundColor: '#FFFCF8',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
    },

    emptyTitle: {
      marginTop: 20,
      fontSize: 22,
      fontWeight: '800',
      color: '#5A3A2A',
    },

    backHomeButton: {
      marginTop: 25,
      paddingHorizontal: 25,
      paddingVertical: 13,
      borderRadius: 25,
      backgroundColor: '#D4AF37',
    },

    backHomeText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },

  });
