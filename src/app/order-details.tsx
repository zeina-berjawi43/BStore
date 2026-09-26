import { request } from '../services/request';
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

import { getValidAccessToken, logoutLocal } from '../services/authService';

import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';


// =========================================================
// API
// =========================================================

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';


// =========================================================
// TYPES
// =========================================================

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


// =========================================================
// PRICE FORMATTER
// =========================================================

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


// =========================================================
// DATE FORMATTER
// =========================================================

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


// =========================================================
// IMAGE URL
// =========================================================

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

    const path = image.trim().replace(/\\/g, '/').replace(/^\/+/, '');
    return `${API_URL}/${path.startsWith('uploads/') ? path : `uploads/${path}`}`;
};


// =========================================================
// STATUS STYLES
// =========================================================

const getStatusStyles = (
  status: BackendOrder['status']
) => {

  switch (status) {

    case 'Confirmed':

      return {
        backgroundColor: '#EFFAF3',
        borderColor: '#CFE8D8',
        dotColor: '#3A8F5B',
        textColor: '#317A4D',
      };


    case 'Preparing':

      return {
        backgroundColor: '#FFF7F3',
        borderColor: '#F0CFC4',
        dotColor: '#E35B3F',
        textColor: '#C94C35',
      };


    case 'Shipped':

      return {
        backgroundColor: '#F1F6FC',
        borderColor: '#D6E3F1',
        dotColor: '#4A7FB8',
        textColor: '#3D6B9D',
      };


    case 'Delivered':

      return {
        backgroundColor: '#EFFAF3',
        borderColor: '#CFE8D8',
        dotColor: '#3A8F5B',
        textColor: '#317A4D',
      };


    case 'Cancelled':

      return {
        backgroundColor: '#FFF1F1',
        borderColor: '#F0CCCC',
        dotColor: '#C94C4C',
        textColor: '#B33F3F',
      };


    case 'Pending':
    default:

      return {
        backgroundColor: '#FFF7F3',
        borderColor: '#F0CFC4',
        dotColor: '#E35B3F',
        textColor: '#C94C35',
      };

  }

};


// =========================================================
// COMPONENT
// =========================================================

export default function OrderDetails() {

  const {
    orderId,
  } =
    useLocalSearchParams<{
      orderId: string;
    }>();


  // =======================================================
  // STATE
  // =======================================================

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


  // =======================================================
  // GET ACCESS TOKEN
  // =======================================================

  const getAccessToken =
    async () => {

      try {

        return await getValidAccessToken();

      } catch (error) {

        if (__DEV__) { console.log(
          'GET TOKEN ERROR:',
          error
        ); }

        throw error;

      }

    };


  // =======================================================
  // LOAD ORDER
  // =======================================================

  const loadOrder =
    async () => {

      try {

        setLoading(true);


        // =================================================
        // CHECK ORDER ID
        // =================================================

        if (!orderId) {

          setOrder(null);

          return;

        }


        // =================================================
        // TOKEN
        // =================================================

        const accessToken =
          await getAccessToken();


        if (!accessToken) {

          router.replace(
            '/login'
          );

          return;

        }


        // =================================================
        // GET ORDER
        // =================================================

        const response =
          await request(
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


        if (__DEV__) { console.log(
          'ORDER DETAILS RESPONSE:',
          data
        ); }


        // =================================================
        // TOKEN EXPIRED
        // =================================================

        if (
          response.status === 401
        ) {

          await logoutLocal(accessToken);

          router.replace(
            '/login'
          );

          return;

        }


        // =================================================
        // ERROR
        // =================================================

        if (!response.ok) {

          if (__DEV__) { console.log(
            'GET ORDER DETAILS ERROR:',
            data
          ); }

          setOrder(null);

          return;

        }


        // =================================================
        // SAVE ORDER
        // =================================================

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

        if (__DEV__) { console.log(
          'LOAD ORDER ERROR:',
          error
        ); }

        setOrder(null);

      } finally {

        setLoading(false);

      }

    };


  // =======================================================
  // REFRESH ON FOCUS
  // =======================================================

  useFocusEffect(
    useCallback(
      () => {

        loadOrder();

      },
      [orderId]
    )
  );


  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {

    return (

      <View
        style={
          styles.loadingContainer
        }
      >

        <View
          style={
            styles.loadingIcon
          }
        >

          <Ionicons
            name="receipt-outline"
            size={28}
            color="#E35B3F"
          />

        </View>


        <ActivityIndicator
          size="small"
          color="#E35B3F"
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


  // =======================================================
  // ORDER NOT FOUND
  // =======================================================

  if (!order) {

    return (

      <View
        style={
          styles.emptyContainer
        }
      >

        <View
          style={
            styles.emptyIconContainer
          }
        >

          <Ionicons
            name="receipt-outline"
            size={48}
            color="#E35B3F"
          />

        </View>


        <Text
          style={
            styles.emptyTitle
          }
        >
          Order not found
        </Text>


        <Text
          style={
            styles.emptySubtitle
          }
        >
          We couldn't find the order you're looking for.
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

          <Ionicons
            name="arrow-back"
            size={18}
            color="#FFFFFF"
          />


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


  // =======================================================
  // CUSTOMER
  // =======================================================

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


  // =======================================================
  // STATUS
  // =======================================================

  const statusStyles =
    getStatusStyles(
      order.status
    );


  // =======================================================
  // TOTAL ITEMS
  // =======================================================

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


  // =======================================================
  // ORDER TOTAL
  // =======================================================

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


  // =======================================================
  // MAIN UI
  // =======================================================

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
              size={22}
              color="#171717"
            />

          </Pressable>


          <View
            style={
              styles.headerText
            }
          >

            <Text
              style={
                styles.title
              }
            >
              Order Details
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Review your order information
            </Text>

          </View>

        </View>


        {/* =================================================
            ORDER HEADER
        ================================================= */}

        <View
          style={
            styles.orderHeaderCard
          }
        >

          <View
            style={
              styles.orderHeaderLeft
            }
          >

            <View
              style={
                styles.receiptIcon
              }
            >

              <Ionicons
                name="receipt-outline"
                size={23}
                color="#E35B3F"
              />

            </View>


            <View
              style={
                styles.orderHeaderText
              }
            >

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


              <View
                style={
                  styles.orderDateRow
                }
              >

                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color="#9A9186"
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

        <View
          style={
            styles.sectionHeader
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
            Delivery Information
          </Text>

        </View>


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
                color="#E35B3F"
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
                color="#E35B3F"
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
                color="#E35B3F"
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
                color="#E35B3F"
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

        <View
          style={
            styles.sectionHeader
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
            Products
          </Text>

        </View>


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
                      color="#E35B3F"
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
            color="#171717"
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


// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({

    // =====================================================
    // CONTAINER
    // =====================================================

    container: {

      flex: 1,

      backgroundColor:
        '#F7F3EC',

    },


    scrollContent: {

      paddingHorizontal: 18,

      paddingTop: 18,

      paddingBottom: 45,

    },


    // =====================================================
    // HEADER
    // =====================================================

    header: {

      flexDirection:
        'row',

      alignItems:
        'center',

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

      alignItems:
        'center',

      justifyContent:
        'center',

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


    headerText: {

      flex: 1,

    },


    title: {

      fontSize: 29,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.8,

    },


    subtitle: {

      marginTop: 3,

      fontSize: 12,

      fontWeight:
        '500',

      color:
        '#817B71',

    },


    // =====================================================
    // ORDER HEADER
    // =====================================================

    orderHeaderCard: {

      backgroundColor:
        '#FFFFFF',

      borderRadius: 21,

      padding: 16,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.07,

      shadowRadius: 9,

      elevation: 2,

    },


    orderHeaderLeft: {

      flexDirection:
        'row',

      alignItems:
        'center',

      flex: 1,

      marginRight: 10,

    },


    receiptIcon: {

      width: 50,

      height: 50,

      borderRadius: 16,

      backgroundColor:
        '#FFF7F3',

      borderWidth: 1,

      borderColor:
        '#F0CFC4',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    orderHeaderText: {

      flex: 1,

      marginLeft: 12,

    },


    orderLabel: {

      fontSize: 11,

      fontWeight:
        '600',

      color:
        '#9A9186',

    },


    orderNumber: {

      marginTop: 3,

      fontSize: 15,

      fontWeight:
        '800',

      color:
        '#24221E',

      maxWidth: 200,

    },


    orderDateRow: {

      marginTop: 5,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,

    },


    date: {

      fontSize: 11,

      fontWeight:
        '500',

      color:
        '#9A9186',

    },


    // =====================================================
    // STATUS
    // =====================================================

    statusContainer: {

      paddingHorizontal: 10,

      paddingVertical: 8,

      borderRadius: 15,

      borderWidth: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,

    },


    statusDot: {

      width: 7,

      height: 7,

      borderRadius: 4,

    },


    statusText: {

      fontSize: 11,

      fontWeight:
        '800',

    },


    // =====================================================
    // SECTION HEADER
    // =====================================================

    sectionHeader: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop: 25,

      marginBottom: 11,

      paddingLeft: 2,

    },


    sectionAccent: {

      width: 4,

      height: 21,

      borderRadius: 3,

      backgroundColor:
        '#E35B3F',

      marginRight: 9,

    },


    sectionTitle: {

      fontSize: 20,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.3,

    },


    // =====================================================
    // DELIVERY INFORMATION
    // =====================================================

    infoCard: {

      backgroundColor:
        '#FFFFFF',

      borderRadius: 21,

      padding: 16,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

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


    infoRow: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 15,

    },


    infoRowLast: {

      marginBottom: 0,

    },


    infoIcon: {

      width: 44,

      height: 44,

      borderRadius: 14,

      backgroundColor:
        '#FFF7F3',

      borderWidth: 1,

      borderColor:
        '#F0CFC4',

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

      fontWeight:
        '600',

      color:
        '#9A9186',

    },


    infoValue: {

      marginTop: 3,

      fontSize: 14,

      fontWeight:
        '700',

      color:
        '#24221E',

    },


    // =====================================================
    // PRODUCTS
    // =====================================================

    productCard: {

      backgroundColor:
        '#FFFFFF',

      borderRadius: 20,

      padding: 12,

      marginBottom: 12,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      flexDirection:
        'row',

      alignItems:
        'center',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.05,

      shadowRadius: 8,

      elevation: 2,

    },


    productImage: {

      width: 70,

      height: 70,

      paddingHorizontal: 5,

      borderRadius: 15,

      backgroundColor:
        '#F8F2EA',

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

    },


    realProductImage: {

      width: '100%',

      height: '100%',

    },


    productInfo: {

      flex: 1,

      marginLeft: 12,

      paddingRight: 6,

    },


    productName: {

      fontSize: 15,

      fontWeight:
        '800',

      color:
        '#24221E',

    },


    productCategory: {

      marginTop: 3,

      fontSize: 11,

      fontWeight:
        '500',

      color:
        '#9A9186',

    },


    quantity: {

      marginTop: 5,

      fontSize: 12,

      fontWeight:
        '600',

      color:
        '#817B71',

    },


    productTotal: {

      marginLeft: 5,

      fontSize: 15,

      fontWeight:
        '900',

      color:
        '#E35B3F',

      maxWidth: 100,

      textAlign:
        'right',

    },


    // =====================================================
    // TOTAL
    // =====================================================

    totalCard: {

      marginTop: 4,

      padding: 18,

      backgroundColor:
        '#FFFFFF',

      borderRadius: 21,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

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


    totalLabel: {

      fontSize: 20,

      fontWeight:
        '900',

      color:
        '#171717',

    },


    totalItems: {

      marginTop: 3,

      fontSize: 11,

      fontWeight:
        '500',

      color:
        '#9A9186',

    },


    total: {

      fontSize: 23,

      fontWeight:
        '900',

      color:
        '#E35B3F',

      maxWidth: 170,

      textAlign:
        'right',

    },


    // =====================================================
    // BACK TO ORDERS
    // =====================================================

    backOrdersButton: {

      marginTop: 18,

      minHeight: 52,

      borderRadius: 16,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',

      gap: 8,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.05,

      shadowRadius: 8,

      elevation: 2,

    },


    backOrdersText: {

      fontSize: 14,

      fontWeight:
        '800',

      color:
        '#171717',

    },


    // =====================================================
    // LOADING
    // =====================================================

    loadingContainer: {

      flex: 1,

      backgroundColor:
        '#F7F3EC',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    loadingIcon: {

      width: 62,

      height: 62,

      borderRadius: 20,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom: 14,

    },


    loadingText: {

      marginTop: 10,

      fontSize: 14,

      fontWeight:
        '600',

      color:
        '#817B71',

    },


    // =====================================================
    // EMPTY
    // =====================================================

    emptyContainer: {

      flex: 1,

      backgroundColor:
        '#F7F3EC',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 30,

    },


    emptyIconContainer: {

      width: 88,

      height: 88,

      borderRadius: 25,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      alignItems:
        'center',

      justifyContent:
        'center',

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

      fontWeight:
        '900',

      color:
        '#171717',

    },


    emptySubtitle: {

      marginTop: 7,

      fontSize: 13,

      lineHeight: 19,

      fontWeight:
        '500',

      color:
        '#817B71',

      textAlign:
        'center',

    },


    backHomeButton: {

      marginTop: 24,

      minHeight: 50,

      paddingHorizontal: 24,

      borderRadius: 16,

      backgroundColor:
        '#171717',

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',

      gap: 8,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.16,

      shadowRadius: 9,

      elevation: 3,

    },


    backHomeText: {

      color:
        '#FFFFFF',

      fontSize: 14,

      fontWeight:
        '800',

    },

  });
