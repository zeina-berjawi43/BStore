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
     FAVORITE STATE
  ======================================================= */

  const [
    isFavorite,
    setIsFavorite,
  ] = useState(false);


  const [
    updatingFavorite,
    setUpdatingFavorite,
  ] = useState(false);


  /* =======================================================
     CART / STOCK ALERT
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
     FAVORITE ALERT
  ======================================================= */

  const [
    favoriteAlertVisible,
    setFavoriteAlertVisible,
  ] = useState(false);


  const [
    favoriteAlertType,
    setFavoriteAlertType,
  ] = useState<'added' | 'removed'>('added');


  const favoriteAlertOpacity =
    useRef(
      new Animated.Value(0)
    ).current;


  const favoriteAlertTranslateY =
    useRef(
      new Animated.Value(-40)
    ).current;


  /* =======================================================
     SHOW CART / STOCK ALERT
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
     SHOW FAVORITE ALERT
  ======================================================= */

  const showFavoriteAlert = (
    type: 'added' | 'removed'
  ) => {

    setFavoriteAlertType(
      type
    );


    setFavoriteAlertVisible(
      true
    );


    favoriteAlertOpacity.setValue(
      0
    );


    favoriteAlertTranslateY.setValue(
      -40
    );


    Animated.parallel([

      Animated.timing(
        favoriteAlertOpacity,
        {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }
      ),

      Animated.spring(
        favoriteAlertTranslateY,
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
          favoriteAlertOpacity,
          {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          favoriteAlertTranslateY,
          {
            toValue: -25,
            duration: 220,
            useNativeDriver: true,
          }
        ),

      ]).start(() => {

        setFavoriteAlertVisible(
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
     LOAD FAVORITE STATUS
  ======================================================= */

  const loadFavoriteStatus = async () => {

    if (!productId) {

      setIsFavorite(
        false
      );

      return;

    }


    try {

      const accessToken =
        await AsyncStorage.getItem(
          'accessToken'
        );


      if (!accessToken) {

        setIsFavorite(
          false
        );

        return;

      }


      const response =
        await fetch(
          `${API_URL}/favorites`,
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


      if (!response.ok) {

        if (
          response.status === 401 ||
          response.status === 403
        ) {

          setIsFavorite(
            false
          );

        }

        return;

      }


      const data =
        await response.json();


      const favorites =
        Array.isArray(
          data?.favorites
        )
          ? data.favorites
          : [];


      const favoriteExists =
        favorites.some(
          (item: any) => {

            const favoriteProduct =
              item?.product ||
              item?.productId ||
              item;


            const favoriteId =
              typeof favoriteProduct === 'string'
                ? favoriteProduct
                : favoriteProduct?._id;


            return (
              String(
                favoriteId || ''
              ) ===
              String(
                productId
              )
            );

          }
        );


      setIsFavorite(
        favoriteExists
      );

    } catch (error) {

      console.log(
        'LOAD FAVORITE STATUS ERROR:',
        error
      );

    }

  };


  /* =======================================================
     PAGE FOCUS
  ======================================================= */

  useFocusEffect(
    useCallback(() => {

      loadProduct();

      loadFavoriteStatus();

    }, [productId])
  );


  /* =======================================================
     TOGGLE FAVORITE
     
     IMPORTANT:
     The heart changes IMMEDIATELY.
     The API request runs in the background.
  ======================================================= */

  const toggleFavorite = () => {

    if (updatingFavorite) {
      return;
    }


    if (!isLoggedIn) {

      router.push(
        '/login'
      );

      return;

    }


    if (!product) {
      return;
    }


    const previousFavorite =
      isFavorite;


    const nextFavorite =
      !previousFavorite;


    /*
     * =====================================================
     * OPTIMISTIC UI
     *
     * Change the heart immediately.
     * =====================================================
     */

    setIsFavorite(
      nextFavorite
    );


    setUpdatingFavorite(
      true
    );


    /*
     * =====================================================
     * BACKGROUND API REQUEST
     * =====================================================
     */

    (async () => {

      try {

        const accessToken =
          await AsyncStorage.getItem(
            'accessToken'
          );


        if (!accessToken) {

          setIsFavorite(
            previousFavorite
          );


          setIsLoggedIn(
            false
          );


          router.push(
            '/login'
          );


          return;

        }


        const endpoint =
          nextFavorite
            ? `${API_URL}/favorites/add`
            : `${API_URL}/favorites/remove`;


        const method =
          nextFavorite
            ? 'POST'
            : 'DELETE';


        const response =
          await fetch(
            endpoint,
            {

              method,

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

                }),

            }
          );


        const data =
          await response.json()
            .catch(() => null);


        if (!response.ok) {

          console.log(

            nextFavorite
              ? 'ADD FAVORITE ERROR:'
              : 'REMOVE FAVORITE ERROR:',

            data?.message ||
              'Unable to update favorite.'

          );


          /*
           * =================================================
           * ROLLBACK
           * =================================================
           */

          setIsFavorite(
            previousFavorite
          );


          if (
            response.status === 401 ||
            response.status === 403
          ) {

            setIsLoggedIn(
              false
            );

          }


          return;

        }


        /*
         * =================================================
         * SUCCESS
         *
         * Show a beautiful confirmation alert only
         * after the server confirms the action.
         * =================================================
         */

        showFavoriteAlert(
          nextFavorite
            ? 'added'
            : 'removed'
        );

      } catch (error) {

        console.log(
          'TOGGLE FAVORITE ERROR:',
          error
        );


        /*
         * Request failed completely.
         * Roll back the heart.
         */

        setIsFavorite(
          previousFavorite
        );

      } finally {

        setUpdatingFavorite(
          false
        );

      }

    })();

  };


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
     GO BACK
     
     IMPORTANT:
     Return to the screen that opened Product Details.
     
     Home:
       Home → Product Details → Back → Home
     
     Category:
       Category Products → Product Details → Back
       → Category Products
  ======================================================= */

  const goBackHome = () => {

    if (router.canGoBack()) {

      router.back();

      return;

    }


    /*
     * -------------------------------------------------------
     * Fallback:
     * If Product Details was opened without a previous
     * screen in the navigation stack, return to Home.
     * -------------------------------------------------------
     */

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

        <View
          style={
            styles.errorIconContainer
          }
        >

          <Ionicons
            name="cube-outline"
            size={58}
            color="#E35B3F"
          />

        </View>


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
          CART / STOCK ALERT
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


          <View
            style={
              styles.productAlertCart
            }
          >

            <Ionicons
              name="cart-outline"
              size={21}
              color="#E35B3F"
            />

          </View>

        </Animated.View>

      )}


      {/* =================================================
          FAVORITE ALERT
      ================================================= */}

      {favoriteAlertVisible && (

        <Animated.View
          style={[
            styles.favoriteAlert,

            {
              opacity:
                favoriteAlertOpacity,

              transform: [

                {
                  translateY:
                    favoriteAlertTranslateY,
                },

              ],

            },

          ]}
        >

          <View
            style={
              styles.favoriteAlertIcon
            }
          >

            <Ionicons
              name={
                favoriteAlertType === 'added'
                  ? 'heart'
                  : 'heart-outline'
              }

              size={21}

              color="#FFFFFF"
            />

          </View>


          <View
            style={
              styles.favoriteAlertContent
            }
          >

            <Text
              style={
                styles.favoriteAlertTitle
              }
            >
              {favoriteAlertType === 'added'
                ? 'Added to Favorites'
                : 'Removed from Favorites'}
            </Text>


            <Text
              style={
                styles.favoriteAlertMessage
              }

              numberOfLines={2}
            >
              {favoriteAlertType === 'added'
                ? 'Product has been added to your favorites.'
                : 'Product has been removed from your favorites.'}
            </Text>

          </View>


          <View
            style={
              styles.favoriteAlertBadge
            }
          >

            <Ionicons
              name={
                favoriteAlertType === 'added'
                  ? 'heart'
                  : 'heart-outline'
              }

              size={19}

              color="#E35B3F"
            />

          </View>

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
              color="#171717"
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
            IMAGE CARD
        ================================================= */}

        <View
          style={
            styles.image
          }
        >

          {/* =================================================
              FAVORITE BUTTON
          ================================================= */}

          <Pressable
            style={
              styles.favoriteButton
            }

            onPress={
              toggleFavorite
            }

            disabled={
              updatingFavorite
            }
          >

            <Ionicons
              name={
                isFavorite
                  ? 'heart'
                  : 'heart-outline'
              }

              size={
                isFavorite
                  ? 22
                  : 21
              }

              color={
                isFavorite
                  ? '#E35B3F'
                  : '#171717'
              }
            />

          </Pressable>


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

              <View
                style={
                  styles.placeholderIcon
                }
              >

                <Ionicons
                  name="cube-outline"
                  size={55}
                  color="#E35B3F"
                />

              </View>


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
                  styles.priceUnavailable
                }
              >
                Price unavailable
              </Text>

            )

          ) : (

            <Pressable
              style={
                styles.signInContainer
              }

              onPress={() =>
                router.push(
                  '/login'
                )
              }
            >

              <Ionicons
                name="lock-closed-outline"
                size={16}
                color="#E35B3F"
              />


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

          <View
            style={
              styles.descriptionHeader
            }
          >

            <View
              style={
                styles.descriptionAccent
              }
            />


            <Text
              style={
                styles.descriptionTitle
              }
            >
              Description
            </Text>

          </View>


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

    // ===================================================
    // MAIN
    // ===================================================

    container: {

      flex: 1,

      paddingTop:
        20,

      backgroundColor:
        '#F7F3EC',

    },


    scrollContent: {

      paddingHorizontal:
        18,

      paddingTop:
        18,

      paddingBottom:
        40,

    },


    // ===================================================
    // ERROR
    // ===================================================

    errorContainer: {

      flex: 1,

      backgroundColor:
        '#F7F3EC',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,

    },


    errorIconContainer: {

      width:
        92,

      height:
        92,

      borderRadius:
        24,

      backgroundColor:
        '#FFF7F3',

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

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

      shadowOpacity:
        0.07,

      shadowRadius:
        9,

      elevation:
        2,

    },


    errorTitle: {

      marginTop:
        16,

      fontSize:
        21,

      fontWeight:
        '900',

      color:
        '#171717',

    },


    backHomeButton: {

      marginTop:
        20,

      minHeight:
        50,

      paddingHorizontal:
        22,

      borderRadius:
        16,

      backgroundColor:
        '#171717',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        8,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity:
        0.14,

      shadowRadius:
        8,

      elevation:
        3,

    },


    backHomeText: {

      color:
        '#FFFFFF',

      fontSize:
        13,

      fontWeight:
        '800',

    },


    // ===================================================
    // HEADER
    // ===================================================

    header: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        18,

    },


    backButton: {

      width:
        46,

      height:
        46,

      borderRadius:
        16,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        13,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        8,

      elevation:
        2,

    },


    headerTitle: {

      flex: 1,

      fontSize:
        29,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.7,

    },


    // ===================================================
    // IMAGE
    // ===================================================

    image: {

      height:
        320,

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        21,

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity:
        0.07,

      shadowRadius:
        9,

      elevation:
        2,

    },


    productImage: {

      width:
        '90%',

      height:
        '90%',

    },


    /* =================================================
       FAVORITE BUTTON
    ================================================= */

    favoriteButton: {

      position:
        'absolute',

      top:
        14,

      right:
        14,

      width:
        42,

      height:
        42,

      borderRadius:
        50,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

      alignItems:
        'center',

      justifyContent:
        'center',

      zIndex:
        10,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity:
        0.08,

      shadowRadius:
        8,

      elevation:
        3,

    },


    imagePlaceholder: {

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    placeholderIcon: {

      width:
        82,

      height:
        82,

      borderRadius:
        22,

      backgroundColor:
        '#FFF7F3',

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    imageText: {

      marginTop:
        11,

      color:
        '#9A9186',

      fontSize:
        13,

      fontWeight:
        '600',

    },


    // ===================================================
    // INFO CARD
    // ===================================================

    infoCard: {

      marginTop:
        14,

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        21,

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

      padding:
        19,

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity:
        0.07,

      shadowRadius:
        9,

      elevation:
        2,

    },


    name: {

      fontSize:
        26,

      lineHeight:
        32,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.5,

    },


    categoryBadge: {

      alignSelf:
        'flex-start',

      marginTop:
        10,

      paddingHorizontal:
        12,

      paddingVertical:
        6,

      borderRadius:
        12,

      backgroundColor:
        '#F8F2EA',

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

    },


    categoryText: {

      fontSize:
        12,

      fontWeight:
        '700',

      color:
        '#817B71',

    },


    productBrand: {

      marginTop:
        8,

      fontSize:
        13,

      color:
        '#E35B3F',

      fontWeight:
        '800',

    },


    // ===================================================
    // PRICE
    // ===================================================

    priceSection: {

      marginTop:
        15,

    },


    price: {

      fontSize:
        26,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.4,

    },


    priceUnavailable: {

      marginTop:
        15,

      fontSize:
        14,

      fontWeight:
        '700',

      color:
        '#817B71',

    },


    discountRow: {

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

    },


    oldPrice: {

      fontSize:
        15,

      color:
        '#9A9186',

      textDecorationLine:
        'line-through',

      fontWeight:
        '600',

    },


    discountBadge: {

      backgroundColor:
        '#FFF7F3',

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

      paddingHorizontal:
        9,

      paddingVertical:
        5,

      borderRadius:
        9,

    },


    discountText: {

      fontSize:
        11,

      fontWeight:
        '900',

      color:
        '#E35B3F',

    },


    discountedPrice: {

      marginTop:
        4,

      fontSize:
        27,

      fontWeight:
        '900',

      color:
        '#E35B3F',

      letterSpacing:
        -0.4,

    },


    signInContainer: {

      alignSelf:
        'flex-start',

      marginTop:
        15,

      minHeight:
        42,

      paddingHorizontal:
        12,

      paddingVertical:
        9,

      borderRadius:
        13,

      backgroundColor:
        '#FFF7F3',

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,

    },


    signInText: {

      fontSize:
        14,

      fontWeight:
        '800',

      color:
        '#E35B3F',

    },


    // ===================================================
    // OUT OF STOCK
    // ===================================================

    outOfStockBadge: {

      alignSelf:
        'flex-start',

      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        12,

      paddingHorizontal:
        11,

      paddingVertical:
        7,

      borderRadius:
        10,

      backgroundColor:
        '#FFF1F1',

      borderWidth:
        1,

      borderColor:
        '#F0CCCC',

      gap:
        6,

    },


    outOfStockText: {

      fontSize:
        12,

      fontWeight:
        '800',

      color:
        '#C62828',

    },


    // ===================================================
    // DESCRIPTION
    // ===================================================

    divider: {

      height:
        1,

      backgroundColor:
        '#EEE4D7',

      marginTop:
        20,

      marginBottom:
        18,

    },


    descriptionHeader: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        9,

    },


    descriptionAccent: {

      width:
        4,

      height:
        20,

      borderRadius:
        2,

      backgroundColor:
        '#E35B3F',

      marginRight:
        9,

    },


    descriptionTitle: {

      fontSize:
        18,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.2,

    },


    description: {

      fontSize:
        14,

      lineHeight:
        22,

      fontWeight:
        '500',

      color:
        '#777168',

    },


    // ===================================================
    // CART
    // ===================================================

    cartButton: {

      marginTop:
        24,

      backgroundColor:
        '#E35B3F',

      minHeight:
        54,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',

      gap:
        8,

      shadowColor:
        '#E35B3F',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity:
        0.22,

      shadowRadius:
        8,

      elevation:
        3,

    },


    cartButtonDisabled: {

      backgroundColor:
        '#B8B1A8',

      shadowOpacity:
        0,

      elevation:
        0,

    },


    cartButtonText: {

      color:
        '#FFFFFF',

      fontSize:
        15,

      fontWeight:
        '900',

    },


    // ===================================================
    // CART / STOCK ALERT
    // ===================================================

    productAlert: {

      position:
        'absolute',

      top:
        55,

      left:
        18,

      right:
        18,

      zIndex:
        9999,

      minHeight:
        70,

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        18,

      paddingVertical:
        11,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity:
        0.12,

      shadowRadius:
        14,

      elevation:
        10,

    },


    productAlertIcon: {

      width:
        42,

      height:
        42,

      borderRadius:
        14,

      backgroundColor:
        '#E35B3F',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    productAlertContent: {

      flex: 1,

      marginLeft:
        12,

      marginRight:
        10,

    },


    productAlertTitle: {

      fontSize:
        14,

      fontWeight:
        '900',

      color:
        '#24221E',

      marginBottom:
        3,

    },


    productAlertMessage: {

      fontSize:
        11.5,

      color:
        '#817B71',

      lineHeight:
        16,

      fontWeight:
        '600',

    },


    productAlertCart: {

      width:
        36,

      height:
        36,

      borderRadius:
        12,

      backgroundColor:
        '#FFF7F3',

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    // ===================================================
    // FAVORITE ALERT
    // ===================================================

    favoriteAlert: {

      position:
        'absolute',

      top:
        55,

      left:
        18,

      right:
        18,

      zIndex:
        10000,

      minHeight:
        70,

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        18,

      paddingVertical:
        11,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

      shadowColor:
        '#171717',

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity:
        0.12,

      shadowRadius:
        14,

      elevation:
        10,

    },


    favoriteAlertIcon: {

      width:
        42,

      height:
        42,

      borderRadius:
        14,

      backgroundColor:
        '#E35B3F',

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    favoriteAlertContent: {

      flex: 1,

      marginLeft:
        12,

      marginRight:
        10,

    },


    favoriteAlertTitle: {

      fontSize:
        14,

      fontWeight:
        '900',

      color:
        '#24221E',

      marginBottom:
        3,

    },


    favoriteAlertMessage: {

      fontSize:
        11.5,

      color:
        '#817B71',

      lineHeight:
        16,

      fontWeight:
        '600',

    },


    favoriteAlertBadge: {

      width:
        36,

      height:
        36,

      borderRadius:
        12,

      backgroundColor:
        '#FFF7F3',

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

      alignItems:
        'center',

      justifyContent:
        'center',

    },

  });