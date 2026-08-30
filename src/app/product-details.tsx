import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Animated,
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


/* =========================================================
   API
========================================================= */

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';


/* =========================================================
   TYPES
========================================================= */

type Category = {
  _id?: string;
  name?: string;
};


type Brand = {
  _id?: string;
  name?: string;
};


type Product = {
  _id: string;

  name: string;

  description?: string;

  price?: number;

  discount?: number;

  discountedPrice?: number;

  image: string;

  category?: Category | string;

  brand?: Brand | string;

  availability?: boolean;
};


/* =========================================================
   IMAGE URL
========================================================= */

const getImageUrl = (
  image?: string
): string => {

  if (!image) {
    return '';
  }


  if (
    image.startsWith('http://') ||
    image.startsWith('https://')
  ) {

    return image;

  }


  let value =
    image.trim();


  if (!value) {
    return '';
  }


  /* -------------------------------------------------------
     Handle file:/// paths
  ------------------------------------------------------- */

  if (
    value.startsWith('file:///')
  ) {

    value =
      value.replace(
        'file:///',
        ''
      );

  }


  /* -------------------------------------------------------
     Handle Windows paths
  ------------------------------------------------------- */

  if (
    /^[A-Za-z]:[\\/]/.test(value)
  ) {

    const parts =
      value.split(
        /[\\/]/
      );


    value =
      parts[
        parts.length - 1
      ];

  }


  value =
    value.replace(
      /^\/+/,
      ''
    );


  /* -------------------------------------------------------
     uploads/...
  ------------------------------------------------------- */

  if (
    value.startsWith('uploads/')
  ) {

    return `${API_URL}/${value}`;

  }


  /* -------------------------------------------------------
     uploads\...
  ------------------------------------------------------- */

  if (
    value.startsWith('uploads\\')
  ) {

    value =
      value.replace(
        /\\/g,
        '/'
      );


    return `${API_URL}/${value}`;

  }


  /* -------------------------------------------------------
     images/...
  ------------------------------------------------------- */

  if (
    value.startsWith('images/')
  ) {

    return `${API_URL}/uploads/${value}`;

  }


  /* -------------------------------------------------------
     filename only
  ------------------------------------------------------- */

  return `${API_URL}/uploads/${value}`;

};


/* =========================================================
   CATEGORY NAME
========================================================= */

const getCategoryName = (
  category?: Category | string
): string => {

  if (!category) {
    return '';
  }


  if (
    typeof category === 'string'
  ) {

    return category;

  }


  return category.name || '';

};


/* =========================================================
   BRAND NAME
========================================================= */

const getBrandName = (
  brand?: Brand | string
): string => {

  if (!brand) {
    return '';
  }


  if (
    typeof brand === 'string'
  ) {

    return brand;

  }


  return brand.name || '';

};


/* =========================================================
   FINAL PRICE
========================================================= */

const getFinalPrice = (
  product: Product
): number => {

  const originalPrice =
    Number(
      product.price
    ) || 0;


  const discount =
    Number(
      product.discount
    ) || 0;


  /* -------------------------------------------------------
     Backend discounted USD price
  ------------------------------------------------------- */

  if (
    product.discountedPrice !== undefined &&
    product.discountedPrice !== null
  ) {

    const backendPrice =
      Number(
        product.discountedPrice
      );


    if (
      Number.isFinite(
        backendPrice
      )
    ) {

      return backendPrice;

    }

  }


  /* -------------------------------------------------------
     No discount
  ------------------------------------------------------- */

  if (
    discount <= 0
  ) {

    return Number(
      originalPrice.toFixed(2)
    );

  }


  /* -------------------------------------------------------
     Calculate USD discount
  ------------------------------------------------------- */

  const finalPrice =
    originalPrice -
    (
      originalPrice *
      discount
    ) / 100;


  return Number(
    finalPrice.toFixed(2)
  );

};


/* =========================================================
   FORMAT USD PRICE
========================================================= */

const formatPrice = (
  amount: number
): string => {

  const safeAmount =
    Number(
      amount
    ) || 0;


  return `$${safeAmount.toFixed(2)}`;

};


/* =========================================================
   PRODUCT DETAILS
========================================================= */

export default function ProductDetails() {


  /* =======================================================
     ROUTE PARAMS
  ======================================================= */

  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();


  const productId =
    Array.isArray(
      params.id
    )
      ? params.id[0]
      : params.id;


  /* =======================================================
     STATE
  ======================================================= */

  const [
    product,
    setProduct,
  ] = useState<Product | null>(null);


  const [
    productLoaded,
    setProductLoaded,
  ] = useState(false);


  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false);


  const [
    addingToCart,
    setAddingToCart,
  ] = useState(false);


  /* =======================================================
     ALERT
  ======================================================= */

  const [
    alertVisible,
    setAlertVisible,
  ] = useState(false);


  const [
    alertMessage,
    setAlertMessage,
  ] = useState('');


  const alertOpacity =
    useRef(
      new Animated.Value(0)
    ).current;


  const alertTranslateY =
    useRef(
      new Animated.Value(-40)
    ).current;


  /* =======================================================
     SHOW ALERT
  ======================================================= */

  const showAlert = (
    message: string
  ) => {

    setAlertMessage(
      message
    );


    setAlertVisible(
      true
    );


    alertOpacity.setValue(
      0
    );


    alertTranslateY.setValue(
      -40
    );


    Animated.parallel([

      Animated.timing(
        alertOpacity,
        {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }
      ),

      Animated.spring(
        alertTranslateY,
        {
          toValue: 0,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }
      ),

    ]).start();


    setTimeout(() => {

      Animated.parallel([

        Animated.timing(
          alertOpacity,
          {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          alertTranslateY,
          {
            toValue: -25,
            duration: 200,
            useNativeDriver: true,
          }
        ),

      ]).start(() => {

        setAlertVisible(
          false
        );

      });

    }, 2200);

  };


  /* =======================================================
     CHECK LOGIN
  ======================================================= */

  const checkLogin = async () => {

    try {

      const [
        accessToken,
        loginStatus,
        savedUser,
      ] = await Promise.all([

        AsyncStorage.getItem(
          'accessToken'
        ),

        AsyncStorage.getItem(
          'isLoggedIn'
        ),

        AsyncStorage.getItem(
          'user'
        ),

      ]);


      const loggedIn =
        !!accessToken &&
        (
          loginStatus === 'true' ||
          !!savedUser
        );


      setIsLoggedIn(
        loggedIn
      );


      return accessToken;

    } catch (error) {

      setIsLoggedIn(
        false
      );


      return null;

    }

  };


  /* =======================================================
     LOAD PRODUCT
  ======================================================= */

  const loadProduct = async () => {

    setProductLoaded(
      false
    );


    if (!productId) {

      setProduct(
        null
      );

      setProductLoaded(
        true
      );

      return;

    }


    const controller =
      new AbortController();


    const timeout =
      setTimeout(() => {

        controller.abort();

      }, 8000);


    try {

      const accessToken =
        await checkLogin();


      const headers:
        Record<string, string> = {

        Accept:
          'application/json',

      };


      if (accessToken) {

        headers.Authorization =
          `Bearer ${accessToken}`;

      }


      const response =
        await fetch(
          `${API_URL}/products/${productId}`,
          {
            method: 'GET',
            headers,
            signal:
              controller.signal,
          }
        );


      clearTimeout(
        timeout
      );


      if (!response.ok) {

        setProduct(
          null
        );

        setProductLoaded(
          true
        );

        return;

      }


      const data =
        await response.json();


      if (
        !data?.product
      ) {

        setProduct(
          null
        );

        setProductLoaded(
          true
        );

        return;

      }


      setProduct(
        data.product
      );


      setProductLoaded(
        true
      );

    } catch (error: any) {

      clearTimeout(
        timeout
      );


      if (
        error?.name !==
        'AbortError'
      ) {

        console.log(
          'LOAD PRODUCT ERROR:',
          error
        );

      }


      setProduct(
        null
      );


      setProductLoaded(
        true
      );

    }

  };


  /* =======================================================
     PAGE FOCUS
  ======================================================= */

  useFocusEffect(
    useCallback(() => {

      loadProduct();

    }, [productId])
  );


  /* =======================================================
     ADD TO CART
  ======================================================= */

  const addToCart = async () => {

    if (!isLoggedIn) {

      router.push(
        '/login'
      );

      return;

    }


    if (!product) {
      return;
    }


    if (
      product.availability === false
    ) {

      showAlert(
        `${product.name} is currently out of stock.`
      );

      return;

    }


    try {

      setAddingToCart(
        true
      );


      const accessToken =
        await AsyncStorage.getItem(
          'accessToken'
        );


      if (!accessToken) {

        router.push(
          '/login'
        );

        return;

      }


      const response =
        await fetch(
          `${API_URL}/cart/add`,
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

                productId:
                  product._id,

                quantity:
                  1,

              }),

          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        showAlert(
          data?.message ||
          'Unable to add product to cart.'
        );

        return;

      }


      showAlert(
        `${product.name} has been added to your cart.`
      );


    } catch (error) {

      console.log(
        'ADD TO CART ERROR:',
        error
      );


      showAlert(
        'Unable to add product to cart.'
      );


    } finally {

      setAddingToCart(
        false
      );

    }

  };


  /* =======================================================
     GO HOME
  ======================================================= */

  const goBackHome = () => {

    router.replace(
      '/'
    );

  };


  /* =======================================================
     PREVENT "PRODUCT NOT FOUND" DURING FETCH
  ======================================================= */

  if (!productLoaded) {

    return (
      <View
        style={
          styles.container
        }
      />
    );

  }


  /* =======================================================
     PRODUCT NOT FOUND
  ======================================================= */

  if (!product) {

    return (

      <View
        style={
          styles.errorContainer
        }
      >

        <Ionicons
          name="cube-outline"
          size={65}
          color="#D4AF37"
        />


        <Text
          style={
            styles.errorTitle
          }
        >
          Product not found
        </Text>


        <Pressable
          style={
            styles.backHomeButton
          }

          onPress={
            goBackHome
          }
        >

          <Text
            style={
              styles.backHomeText
            }
          >
            Back to Home
          </Text>

        </Pressable>

      </View>

    );

  }


  /* =======================================================
     PRODUCT VALUES
  ======================================================= */

  const categoryName =
    getCategoryName(
      product.category
    );


  const brandName =
    getBrandName(
      product.brand
    );


  const imageUrl =
    getImageUrl(
      product.image
    );


  const isOutOfStock =
    product.availability === false;


  /* =======================================================
     PRICE
  ======================================================= */

  const originalPrice =
    Number(
      product.price
    ) || 0;


  const discount =
    Number(
      product.discount
    ) || 0;


  const finalPrice =
    getFinalPrice(
      product
    );


  const hasDiscount =
    discount > 0 &&
    originalPrice > finalPrice;


  const displayedOriginalPrice =
    formatPrice(
      originalPrice
    );


  const displayedFinalPrice =
    formatPrice(
      finalPrice
    );


  /* =======================================================
     UI
  ======================================================= */

  return (

    <View
      style={
        styles.container
      }
    >

      {/* =================================================
          ALERT
      ================================================= */}

      {alertVisible && (

        <Animated.View
          style={[
            styles.productAlert,

            {
              opacity:
                alertOpacity,

              transform: [

                {
                  translateY:
                    alertTranslateY,
                },

              ],

            },

          ]}
        >

          <View
            style={
              styles.productAlertIcon
            }
          >

            <Ionicons
              name="checkmark"
              size={21}
              color="#FFFFFF"
            />

          </View>


          <View
            style={
              styles.productAlertContent
            }
          >

            <Text
              style={
                styles.productAlertTitle
              }
            >
              Added to Cart
            </Text>


            <Text
              style={
                styles.productAlertMessage
              }

              numberOfLines={2}
            >
              {alertMessage}
            </Text>

          </View>


          <Ionicons
            name="cart-outline"
            size={21}
            color="#4CAF50"
          />

        </Animated.View>

      )}


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

            onPress={
              goBackHome
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
              styles.headerTitle
            }

            numberOfLines={1}
          >
            Product Details
          </Text>

        </View>


        {/* =================================================
            IMAGE
        ================================================= */}

        <View
          style={
            styles.image
          }
        >

          {imageUrl ? (

            <Image
              source={{
                uri:
                  imageUrl,
              }}

              style={
                styles.productImage
              }

              resizeMode="contain"
            />

          ) : (

            <View
              style={
                styles.imagePlaceholder
              }
            >

              <Ionicons
                name="cube-outline"
                size={80}
                color="#D4AF37"
              />


              <Text
                style={
                  styles.imageText
                }
              >
                Product Image
              </Text>

            </View>

          )}

        </View>


        {/* =================================================
            INFO CARD
        ================================================= */}

        <View
          style={
            styles.infoCard
          }
        >

          {/* NAME */}

          <Text
            style={
              styles.name
            }
          >
            {product.name}
          </Text>


          {/* CATEGORY */}

          {categoryName ? (

            <View
              style={
                styles.categoryBadge
              }
            >

              <Text
                style={
                  styles.categoryText
                }
              >
                {categoryName}
              </Text>

            </View>

          ) : null}


          {/* BRAND */}

          {brandName ? (

            <Text
              style={
                styles.productBrand
              }
            >
              {brandName}
            </Text>

          ) : null}


          {/* =================================================
              PRICE - USD ONLY
          ================================================= */}

          {isLoggedIn ? (

            product.price !== undefined ? (

              <View
                style={
                  styles.priceSection
                }
              >

                {hasDiscount ? (

                  <>

                    <View
                      style={
                        styles.discountRow
                      }
                    >

                      <Text
                        style={
                          styles.oldPrice
                        }
                      >
                        {
                          displayedOriginalPrice
                        }
                      </Text>


                      <View
                        style={
                          styles.discountBadge
                        }
                      >

                        <Text
                          style={
                            styles.discountText
                          }
                        >
                          -{discount}%
                        </Text>

                      </View>

                    </View>


                    <Text
                      style={
                        styles.discountedPrice
                      }
                    >
                      {
                        displayedFinalPrice
                      }
                    </Text>

                  </>

                ) : (

                  <Text
                    style={
                      styles.price
                    }
                  >
                    {
                      displayedFinalPrice
                    }
                  </Text>

                )}

              </View>

            ) : (

              <Text
                style={
                  styles.price
                }
              >
                Price unavailable
              </Text>

            )

          ) : (

            <Pressable
              onPress={() =>
                router.push(
                  '/login'
                )
              }
            >

              <Text
                style={
                  styles.signInText
                }
              >
                Sign in to see prices
              </Text>

            </Pressable>

          )}


          {/* =================================================
              OUT OF STOCK
          ================================================= */}

          {isOutOfStock && (

            <View
              style={
                styles.outOfStockBadge
              }
            >

              <Ionicons
                name="close-circle-outline"
                size={16}
                color="#C62828"
              />


              <Text
                style={
                  styles.outOfStockText
                }
              >
                Out of Stock
              </Text>

            </View>

          )}


          {/* =================================================
              DIVIDER
          ================================================= */}

          <View
            style={
              styles.divider
            }
          />


          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <Text
            style={
              styles.descriptionTitle
            }
          >
            Description
          </Text>


          <Text
            style={
              styles.description
            }
          >
            {product.description ||
              'No description available for this product.'}
          </Text>


          {/* =================================================
              ADD TO CART
          ================================================= */}

          <Pressable
            style={[
              styles.cartButton,

              (
                addingToCart ||
                isOutOfStock
              ) &&
                styles.cartButtonDisabled,
            ]}

            onPress={
              addToCart
            }

            disabled={
              addingToCart ||
              isOutOfStock
            }
          >

            <Ionicons
              name={
                isOutOfStock
                  ? 'close-circle-outline'
                  : 'cart-outline'
              }

              size={20}

              color="#FFFFFF"
            />


            <Text
              style={
                styles.cartButtonText
              }
            >
              {addingToCart
                ? 'Adding...'
                : isOutOfStock
                  ? 'Out of Stock'
                  : 'Add to Cart'}
            </Text>

          </Pressable>

        </View>

      </ScrollView>

    </View>

  );

}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

  /* =======================================================
     MAIN
  ======================================================= */

  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    paddingTop: 20,
  },


  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 35,
  },


  /* =======================================================
     ERROR
  ======================================================= */

  errorContainer: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },


  errorTitle: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },


  backHomeButton: {
    marginTop: 20,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },


  backHomeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },


  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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


  headerTitle: {
    flex: 1,
    fontSize: 25,
    fontWeight: '800',
    color: '#000000',
  },


  /* =======================================================
     IMAGE
  ======================================================= */

  image: {
    height: 310,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },


  productImage: {
    width: '90%',
    height: '90%',
  },


  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },


  imageText: {
    marginTop: 10,
    color: '#AAAAAA',
    fontSize: 13,
  },


  /* =======================================================
     INFO CARD
  ======================================================= */

  infoCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 20,
  },


  name: {
    fontSize: 26,
    fontWeight: '800',
    color: '#000000',
  },


  categoryBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },


  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
  },


  productBrand: {
    marginTop: 7,
    fontSize: 13,
    color: '#D4AF37',
    fontWeight: '700',
  },


  /* =======================================================
     PRICE
  ======================================================= */

  priceSection: {
    marginTop: 15,
  },


  price: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
  },


  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },


  oldPrice: {
    fontSize: 15,
    color: '#999999',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },


  discountBadge: {
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F3C2C2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },


  discountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C62828',
  },


  discountedPrice: {
    marginTop: 4,
    fontSize: 25,
    fontWeight: '900',
    color: '#000000',
  },


  signInText: {
    marginTop: 15,
    fontSize: 15,
    fontWeight: '700',
    color: '#D4AF37',
  },


  /* =======================================================
     OUT OF STOCK
  ======================================================= */

  outOfStockBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F3C2C2',
    gap: 6,
  },


  outOfStockText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C62828',
  },


  /* =======================================================
     DESCRIPTION
  ======================================================= */

  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 20,
    marginBottom: 18,
  },


  descriptionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
  },


  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#777777',
  },


  /* =======================================================
     CART
  ======================================================= */

  cartButton: {
    marginTop: 24,
    backgroundColor: '#000000',
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },


  cartButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },


  cartButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },


  /* =======================================================
     ALERT
  ======================================================= */

  productAlert: {
    position: 'absolute',
    top: 55,
    left: 18,
    right: 18,
    zIndex: 9999,
    minHeight: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 10,
  },


  productAlertIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },


  productAlertContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },


  productAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 3,
  },


  productAlertMessage: {
    fontSize: 11.5,
    color: '#777777',
    lineHeight: 16,
  },

});
