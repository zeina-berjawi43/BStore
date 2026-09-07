import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Image,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import {
  memo,
  useCallback,
  useEffect,
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

type Product = {
  _id: string;

  name: string;

  description?: string;

  price?: number;

  discount?: number;

  discountedPrice?: number;

  image: string;

  category?: {
    _id?: string;
    name?: string;
  } | string;

  brand?: {
    _id?: string;
    name?: string;
  } | string;

  availability?: boolean;
};


type CartProduct = Product & {
  quantity: number;
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


  let value =
    image.trim();


  if (!value) {
    return '';
  }


  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {

    return value;

  }


  value =
    value
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');


  if (
    value.startsWith('uploads/')
  ) {

    return `${API_URL}/${value}`;

  }


  if (
    value.startsWith('product-images/')
  ) {

    return `${API_URL}/${value}`;

  }


  return `${API_URL}/uploads/${value}`;

};


/* =========================================================
   FINAL PRICE
========================================================= */

const getFinalPrice = (
  product: Product
) => {

  const originalPrice =
    Number(product.price) || 0;


  const discount =
    Number(product.discount) || 0;


  if (
    product.discountedPrice !== undefined &&
    product.discountedPrice !== null
  ) {

    return Number(
      product.discountedPrice
    );

  }


  if (
    discount <= 0
  ) {

    return Number(
      originalPrice.toFixed(2)
    );

  }


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
  price: number | undefined
): string => {

  if (
    price === undefined ||
    price === null ||
    !Number.isFinite(
      Number(price)
    )
  ) {

    return '';

  }


  return `$${Number(price).toFixed(2)}`;

};


/* =========================================================
   FAVORITE BUTTON
========================================================= */

type FavoriteButtonProps = {
  productId: string;
  initialFavorite: boolean;
  isLoggedIn: boolean;

  /*
   * The PAGE owns the favorite alert.
   * This button only reports whether the
   * favorite was added or removed.
   */
  onFavoriteChange: (
    type: 'added' | 'removed'
  ) => void;
};


const FavoriteButton = memo(
  ({
    productId,
    initialFavorite,
    isLoggedIn,
    onFavoriteChange,
  }: FavoriteButtonProps) => {

    const [
      isFavorite,
      setIsFavorite,
    ] = useState(
      initialFavorite
    );


    const [
      isRequesting,
      setIsRequesting,
    ] = useState(false);


    const pendingRef =
      useRef(false);


    const favoriteRef =
      useRef(
        initialFavorite
      );


    /*
     * Keep local state synchronized with
     * the server favorite state.
     *
     * Never overwrite the local optimistic
     * state while a request is running.
     */

    useEffect(() => {

      if (
        pendingRef.current
      ) {

        return;

      }


      favoriteRef.current =
        initialFavorite;


      setIsFavorite(
        initialFavorite
      );

    }, [
      initialFavorite,
    ]);


    const handlePress = (
      event: any
    ) => {

      event.stopPropagation();


      if (!isLoggedIn) {

        router.push(
          '/login'
        );

        return;

      }


      /*
       * Prevent double taps while
       * the request is running.
       */

      if (
        pendingRef.current
      ) {

        return;

      }


      const previousFavorite =
        favoriteRef.current;


      const nextFavorite =
        !previousFavorite;


      /*
       * ===================================================
       * OPTIMISTIC UI
       *
       * THE HEART CHANGES FIRST.
       *
       * No await.
       * No AsyncStorage.
       * No API.
       *
       * The alert is intentionally NOT triggered
       * at the same time.
       * ===================================================
       */

      favoriteRef.current =
        nextFavorite;


      setIsFavorite(
        nextFavorite
      );


      pendingRef.current =
        true;


      setIsRequesting(
        true
      );


      /*
       * ===================================================
       * SHOW FAVORITE ALERT AFTER THE HEART UI UPDATE
       *
       * requestAnimationFrame allows React Native
       * to render the new heart state first.
       *
       * HEART:
       *   ❤️ changes first
       *
       * THEN:
       *   🔔 favorite alert appears
       * ===================================================
       */

      requestAnimationFrame(() => {

        onFavoriteChange(
          nextFavorite
            ? 'added'
            : 'removed'
        );

      });


      /*
       * ===================================================
       * API RUNS IN THE BACKGROUND
       * ===================================================
       */

      (async () => {

        try {

          const accessToken =
            await AsyncStorage.getItem(
              'accessToken'
            );


          if (!accessToken) {

            /*
             * Rollback if session is missing.
             */

            favoriteRef.current =
              previousFavorite;


            setIsFavorite(
              previousFavorite
            );


            pendingRef.current =
              false;


            setIsRequesting(
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

                    productId,

                  }),

              }
            );


          let data:
            any = null;


          try {

            data =
              await response.json();

          } catch {

            data =
              null;

          }


          /*
           * =================================================
           * SESSION EXPIRED
           * =================================================
           */

          if (
            response.status === 401 ||
            response.status === 403
          ) {

            favoriteRef.current =
              previousFavorite;


            setIsFavorite(
              previousFavorite
            );


            pendingRef.current =
              false;


            setIsRequesting(
              false
            );


            router.push(
              '/login'
            );

            return;

          }


          /*
           * =================================================
           * API FAILED
           * =================================================
           */

          if (!response.ok) {

            console.log(
              'UPDATE FAVORITES ERROR:',
              data
            );


            /*
             * Rollback only if this action
             * is still the current local state.
             */

            if (
              favoriteRef.current ===
              nextFavorite
            ) {

              favoriteRef.current =
                previousFavorite;


              setIsFavorite(
                previousFavorite
              );

            }


            return;

          }


          /*
           * =================================================
           * SUCCESS
           *
           * DO NOTHING.
           *
           * The optimistic state is already correct.
           *
           * We intentionally DO NOT call loadFavorites().
           * =================================================
           */

        } catch (error) {

          console.log(
            'TOGGLE FAVORITE ERROR:',
            error
          );


          /*
           * NETWORK ERROR
           */

          if (
            favoriteRef.current ===
            nextFavorite
          ) {

            favoriteRef.current =
              previousFavorite;


            setIsFavorite(
              previousFavorite
            );

          }

        } finally {

          pendingRef.current =
            false;


          setIsRequesting(
            false
          );

        }

      })();

    };


    return (

      <Pressable
        style={[
          styles.favoriteButton,

          isRequesting &&
            styles.favoriteButtonActive,
        ]}

        onPress={
          handlePress
        }

        hitSlop={5}

        disabled={
          isRequesting
        }
      >

        <Ionicons
          name={
            isFavorite
              ? 'heart'
              : 'heart-outline'
          }

          size={20}

          color={
            isFavorite
              ? '#E35B3F'
              : '#171717'
          }

        />

      </Pressable>

    );

  }
);


/* =========================================================
   CATEGORY PRODUCTS
========================================================= */

export default function CategoryProducts() {

  const params =
    useLocalSearchParams<{
      category?: string;
    }>();


  const category =
    typeof params.category === 'string'
      ? params.category
      : 'ALL';


  /* =======================================================
     STATES
  ======================================================= */

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);


  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(true);


  const [
    favorites,
    setFavorites,
  ] = useState<string[]>([]);


  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false);


  const [
    cartCount,
    setCartCount,
  ] = useState(0);


  /* =======================================================
     CART ALERT
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

     SAME AS PRODUCT DETAILS
  ======================================================= */

  const [
    favoriteAlertVisible,
    setFavoriteAlertVisible,
  ] = useState(false);


  const [
    favoriteAlertType,
    setFavoriteAlertType,
  ] = useState<
    'added' | 'removed'
  >('added');


  const favoriteAlertOpacity =
    useRef(
      new Animated.Value(0)
    ).current;


  const favoriteAlertTranslateY =
    useRef(
      new Animated.Value(-40)
    ).current;


  /* =======================================================
     SHOW CART ALERT
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
          duration: 250,
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
            duration: 250,
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          alertTranslateY,
          {
            toValue: -25,
            duration: 250,
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

     SAME AS PRODUCT DETAILS
  ======================================================= */

  const showFavoriteAlert = useCallback(
    (
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

    },
    []
  );


  /* =======================================================
     CHECK LOGIN
  ======================================================= */

  const checkLogin = async () => {

    try {

      const accessToken =
        await AsyncStorage.getItem(
          'accessToken'
        );


      const loginStatus =
        await AsyncStorage.getItem(
          'isLoggedIn'
        );


      const savedUser =
        await AsyncStorage.getItem(
          'user'
        );


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

      console.log(
        'CHECK LOGIN ERROR:',
        error
      );


      setIsLoggedIn(
        false
      );


      return null;

    }

  };


  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  const loadProducts = async () => {

    try {

      if (products.length === 0) {

        setLoadingProducts(
          true
        );

      }


      const accessToken =
        await AsyncStorage.getItem(
          'accessToken'
        );


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
          `${API_URL}/products`,
          {
            method: 'GET',
            headers,
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        console.log(
          'GET PRODUCTS ERROR:',
          data
        );

        return;

      }


      const receivedProducts =
        Array.isArray(data)
          ? data
          : Array.isArray(
              data?.products
            )
            ? data.products
            : [];


      console.log(
        'PRODUCTS FROM DATABASE:',
        receivedProducts.length
      );


      setProducts(
        receivedProducts
      );


    } catch (error) {

      console.log(
        'LOAD PRODUCTS ERROR:',
        error
      );

    } finally {

      setLoadingProducts(
        false
      );

    }

  };


  /* =======================================================
     LOAD CART
  ======================================================= */

  const loadCart = async () => {

    try {

      const accessToken =
        await AsyncStorage.getItem(
          'accessToken'
        );


      if (!accessToken) {

        setCartCount(
          0
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


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        setCartCount(
          0
        );


        setIsLoggedIn(
          false
        );


        return;

      }


      if (!response.ok) {

        console.log(
          'GET CART ERROR:',
          data
        );

        return;

      }


      const items =
        Array.isArray(
          data?.cart?.items
        )
          ? data.cart.items
          : [];


      const count =
        items.reduce(
          (
            total: number,
            item: CartProduct
          ) =>
            total +
            (
              Number(
                item.quantity
              ) || 0
            ),
          0
        );


      setCartCount(
        count
      );


    } catch (error) {

      console.log(
        'LOAD CART ERROR:',
        error
      );

    }

  };


  /* =======================================================
     LOAD FAVORITES
  ======================================================= */

  const loadFavorites = async () => {

    try {

      const accessToken =
        await AsyncStorage.getItem(
          'accessToken'
        );


      if (!accessToken) {

        setFavorites(
          []
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


      const data =
        await response.json();


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        setFavorites(
          []
        );


        setIsLoggedIn(
          false
        );


        return;

      }


      if (!response.ok) {

        console.log(
          'GET FAVORITES ERROR:',
          data
        );

        return;

      }


      const favoriteIds =
        (data?.favorites || [])
          .map(
            (favorite: any) =>
              favorite?.product?._id
          )
          .filter(
            (id: any) =>
              !!id
          );


      setFavorites(
        favoriteIds
      );


    } catch (error) {

      console.log(
        'LOAD FAVORITES ERROR:',
        error
      );

    }

  };


  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */

  const loadData = async () => {

    const loginPromise =
      checkLogin();


    const productsPromise =
      loadProducts();


    const cartPromise =
      loadCart();


    const favoritesPromise =
      loadFavorites();


    await Promise.all([
      loginPromise,
      productsPromise,
      cartPromise,
      favoritesPromise,
    ]);

  };


  /* =======================================================
     PAGE FOCUS
  ======================================================= */

  useFocusEffect(
    useCallback(() => {

      loadData();

    }, [])
  );


  /* =======================================================
     FILTER + SORT PRODUCTS
  ======================================================= */

  const filteredProducts =
    (
      category.toUpperCase() === 'ALL'

        ? products

        : products.filter(
            product => {

              const productCategory =
                typeof product.category ===
                'object'
                  ? product.category?.name
                  : product.category;


              return (
                productCategory
                  ?.toLowerCase()
                  .trim() ===

                category
                  .toLowerCase()
                  .trim()
              );

            }
          )
    )
      .slice()
      .sort(
        (a, b) =>
          getFinalPrice(b) -
          getFinalPrice(a)
      );


  /* =======================================================
     ADD TO CART
  ======================================================= */

  const addToCart = async (
    product: Product
  ) => {

    if (!isLoggedIn) {

      router.push(
        '/login'
      );

      return;

    }


    if (
      product.availability ===
      false
    ) {

      return;

    }


    try {

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


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        setIsLoggedIn(
          false
        );


        router.push(
          '/login'
        );


        return;

      }


      if (!response.ok) {

        console.log(
          'ADD TO CART ERROR:',
          data
        );


        showAlert(
          data?.message ||
          'Could not add product to cart.'
        );


        return;

      }


      if (
        data?.cart?.items &&
        Array.isArray(
          data.cart.items
        )
      ) {

        const count =
          data.cart.items.reduce(
            (
              total: number,
              item: any
            ) =>
              total +
              (
                Number(
                  item.quantity
                ) || 0
              ),
            0
          );


        setCartCount(
          count
        );

      } else {

        await loadCart();

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
        'Could not add product to cart.'
      );

    }

  };


  /* =======================================================
     OPEN PRODUCT
  ======================================================= */

  const openProduct = (
    product: Product
  ) => {

    router.push({

      pathname:
        '/product-details',

      params: {

        id:
          product._id,

      },

    });

  };


  /* =======================================================
     PAGE TITLE
  ======================================================= */

  const pageTitle =
    category.toUpperCase() ===
    'ALL'

      ? 'All Products'

      : category;


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <View
      style={
        styles.container
      }
    >

      {/* =================================================
          CART ALERT
      ================================================= */}

      {alertVisible && (

        <Animated.View
          style={[
            styles.homeAlert,

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
              styles.homeAlertIcon
            }
          >

            <Ionicons
              name="checkmark"
              size={22}
              color="#FFFFFF"
            />

          </View>


          <View
            style={
              styles.homeAlertContent
            }
          >

            <Text
              style={
                styles.homeAlertTitle
              }
            >
              Updated
            </Text>


            <Text
              style={
                styles.homeAlertMessage
              }

              numberOfLines={2}
            >
              {alertMessage}
            </Text>

          </View>


          <Ionicons
            name="heart-outline"
            size={21}
            color="#E35B3F"
          />

        </Animated.View>

      )}


      {/* =================================================
          FAVORITE ALERT

          ONE PAGE-LEVEL ALERT ONLY
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

              numberOfLines={1}
            >
              {pageTitle}
            </Text>

          </View>


          <Pressable
            style={
              styles.headerCartButton
            }

            onPress={() => {

              if (!isLoggedIn) {

                router.push(
                  '/login'
                );

              } else {

                router.push(
                  '/cart'
                );

              }

            }}
          >

            <Ionicons
              name="cart-outline"
              size={22}
              color="#171717"
            />


            {isLoggedIn &&
              cartCount > 0 && (

              <View
                style={
                  styles.headerCartBadge
                }
              >

                <Text
                  style={
                    styles.headerCartBadgeText
                  }
                >
                  {cartCount}
                </Text>

              </View>

            )}

          </Pressable>

        </View>


        {/* =================================================
            RESULTS
        ================================================= */}

        <View
          style={
            styles.resultsHeader
          }
        >

          <View
            style={
              styles.resultsTitleWrap
            }
          >

            <View
              style={
                styles.resultsAccent
              }
            />

            <Text
              style={
                styles.resultsTitle
              }
            >
              Products
            </Text>

          </View>


          {!loadingProducts && (

            <View
              style={
                styles.resultsCountChip
              }
            >

              <Text
                style={
                  styles.resultsCount
                }
              >
                {filteredProducts.length}{' '}
                products
              </Text>

            </View>

          )}

        </View>


        {/* =================================================
            LOADING PRODUCTS
        ================================================= */}

        {loadingProducts &&
        products.length === 0 ? (

          <View
            style={
              styles.loadingContainer
            }
          >

            <View
              style={
                styles.loadingSpinner
              }
            />


            <Text
              style={
                styles.loadingText
              }
            >
              Loading products...
            </Text>

          </View>

        ) : filteredProducts.length ===
          0 ? (

          <View
            style={
              styles.emptyContainer
            }
          >

            <View
              style={
                styles.emptyIconBox
              }
            >

              <Ionicons
                name="cube-outline"
                size={45}
                color="#E35B3F"
              />

            </View>


            <Text
              style={
                styles.emptyTitle
              }
            >
              No products found
            </Text>


            <Text
              style={
                styles.emptyText
              }
            >
              There are no products in this
              category yet.
            </Text>

          </View>

        ) : (

          <View
            style={
              styles.productsGrid
            }
          >

            {filteredProducts.map(
              product => {

                const favorite =
                  favorites.includes(
                    product._id
                  );


                const imageUrl =
                  getImageUrl(
                    product.image
                  );


                const isOutOfStock =
                  product.availability ===
                  false;


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
                  originalPrice >
                    finalPrice;


                return (

                  <Pressable
                    key={
                      product._id
                    }

                    style={
                      styles.productCard
                    }

                    onPress={() =>
                      openProduct(
                        product
                      )
                    }
                  >

                    {/* IMAGE */}

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
                            styles.productImageReal
                          }

                          resizeMode="contain"

                          onError={(event) => {

                            console.log(
                              'PRODUCT IMAGE ERROR:',
                              product.name,
                              imageUrl,
                              event.nativeEvent.error
                            );

                          }}
                        />

                      ) : (

                        <View
                          style={
                            styles.imagePlaceholder
                          }
                        >

                          <Ionicons
                            name="cube-outline"
                            size={45}
                            color="#E35B3F"
                          />

                        </View>

                      )}

                    </View>


                    {/* DISCOUNT */}

                    {hasDiscount && (

                      <View
                        style={
                          styles.discountBadge
                        }
                      >

                        <Text
                          style={
                            styles.discountBadgeText
                          }
                        >
                          -{discount}%
                        </Text>

                      </View>

                    )}


                    {/* FAVORITE */}

                    <FavoriteButton
                      productId={
                        product._id
                      }

                      initialFavorite={
                        favorite
                      }

                      isLoggedIn={
                        isLoggedIn
                      }

                      onFavoriteChange={
                        showFavoriteAlert
                      }
                    />


                    {/* NAME */}

                    <Text
                      style={
                        styles.productName
                      }

                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>


                    {/* BRAND */}

                    <Text
                      style={
                        styles.productCategory
                      }

                      numberOfLines={1}
                    >

                      {
                        typeof product.brand ===
                        'object'

                          ? product.brand?.name ||
                            'No brand'

                          : 'No brand'
                      }

                    </Text>


                    {/* OUT OF STOCK */}

                    {isOutOfStock && (

                      <Text
                        style={
                          styles.outOfStockText
                        }
                      >
                        Out of Stock
                      </Text>

                    )}


                    {/* BOTTOM */}

                    <View
                      style={
                        styles.productBottom
                      }
                    >

                      <View
                        style={
                          styles.priceContainer
                        }
                      >

                        {isLoggedIn ? (

                          product.price !==
                          undefined ? (

                            hasDiscount ? (

                              <View
                                style={
                                  styles.discountPriceContainer
                                }
                              >

                                <Text
                                  style={
                                    styles.oldPrice
                                  }
                                >
                                  {
                                    formatPrice(
                                      originalPrice
                                    )
                                  }
                                </Text>


                                <Text
                                  style={
                                    styles.productPrice
                                  }
                                >
                                  {
                                    formatPrice(
                                      finalPrice
                                    )
                                  }
                                </Text>

                              </View>

                            ) : (

                              <Text
                                style={
                                  styles.productPrice
                                }
                              >
                                {
                                  formatPrice(
                                    originalPrice
                                  )
                                }
                              </Text>

                            )

                          ) : (

                            <Text
                              style={
                                styles.loginPrice
                              }
                            >
                              Price unavailable
                            </Text>

                          )

                        ) : (

                          <Text
                            style={
                              styles.loginPrice
                            }

                            numberOfLines={2}
                          >
                            Login to see price
                          </Text>

                        )}

                      </View>


                      <Pressable
                        style={[

                          styles.addButton,

                          isOutOfStock &&
                            styles.addButtonDisabled,

                        ]}

                        onPress={(event) => {

                          event.stopPropagation();


                          addToCart(
                            product
                          );

                        }}

                        hitSlop={5}

                        disabled={
                          isOutOfStock
                        }
                      >

                        <Ionicons
                          name="add"
                          size={20}
                          color="#FFFFFF"
                        />

                      </Pressable>

                    </View>

                  </Pressable>

                );

              }
            )}

          </View>

        )}


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

  /* =======================================================
     MAIN
  ======================================================= */

  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#F7F3EC',
  },


  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },


  /* =======================================================
     CART ALERT
  ======================================================= */

  homeAlert: {
    position: 'absolute',
    top: 58,
    left: 18,
    right: 18,
    zIndex: 9999,
    minHeight: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7DED1',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },


  homeAlertIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#E35B3F',
    alignItems: 'center',
    justifyContent: 'center',
  },


  homeAlertContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },


  homeAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#24221E',
    marginBottom: 3,
  },


  homeAlertMessage: {
    fontSize: 11.5,
    color: '#817B71',
    lineHeight: 16,
  },


  /* =======================================================
     FAVORITE ALERT

     SAME DESIGN AS PRODUCT DETAILS
  ======================================================= */

  favoriteAlert: {
    position: 'absolute',
    top: 55,
    left: 18,
    right: 18,
    zIndex: 10000,
    minHeight: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7DED1',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },


  favoriteAlertIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E35B3F',
    alignItems: 'center',
    justifyContent: 'center',
  },


  favoriteAlertContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },


  favoriteAlertTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#24221E',
    marginBottom: 3,
  },


  favoriteAlertMessage: {
    fontSize: 11.5,
    color: '#817B71',
    lineHeight: 16,
    fontWeight: '600',
  },


  favoriteAlertBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF7F3',
    borderWidth: 1,
    borderColor: '#F0CFC4',
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },


  backButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#171717',
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


  smallTitle: {
    fontSize: 12,
    color: '#817B71',
    fontWeight: '600',
    marginBottom: 2,
  },


  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.7,
  },


  headerCartButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    position: 'relative',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },


  headerCartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#E35B3F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#F7F3EC',
  },


  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },


  /* =======================================================
     RESULTS
  ======================================================= */

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },


  resultsTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },


  resultsAccent: {
    width: 4,
    height: 20,
    borderRadius: 3,
    backgroundColor: '#E35B3F',
    marginRight: 9,
  },


  resultsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.3,
  },


  resultsCountChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    backgroundColor: '#FFF7F3',
    borderWidth: 1,
    borderColor: '#F0CFC4',
  },


  resultsCount: {
    fontSize: 11,
    color: '#817B71',
    fontWeight: '700',
  },


  /* =======================================================
     LOADING
  ======================================================= */

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },


  loadingSpinner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#E7DED1',
    borderTopColor: '#E35B3F',
  },


  loadingText: {
    marginTop: 13,
    fontSize: 12,
    color: '#817B71',
    fontWeight: '600',
  },


  /* =======================================================
     PRODUCTS GRID
  ======================================================= */

  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },


  productCard: {
    width: '48.2%',
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DED1',
    padding: 11,
    position: 'relative',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 2,
  },


  productImage: {
    height: 145,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },


  productImageReal: {
    width: '100%',
    height: '100%',
  },


  imagePlaceholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* =======================================================
     DISCOUNT
  ======================================================= */

  discountBadge: {
    position: 'absolute',
    top: 17,
    left: 17,
    backgroundColor: '#E35B3F',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    zIndex: 4,
  },


  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },


  /* =======================================================
     FAVORITE
  ======================================================= */

  favoriteButton: {
    position: 'absolute',
    top: 17,
    right: 17,
    width: 35,
    height: 35,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED1',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },


  favoriteButtonActive: {
    opacity: 0.98,
  },


  /* =======================================================
     PRODUCT INFO
  ======================================================= */

  productName: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '800',
    color: '#24221E',
    letterSpacing: -0.1,
  },


  productCategory: {
    marginTop: 5,
    fontSize: 12,
    color: '#817B71',
    fontWeight: '600',
  },


  outOfStockText: {
    marginTop: 7,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#C94C4C',
  },


  /* =======================================================
     PRICE
  ======================================================= */

  productBottom: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },


  priceContainer: {
    flex: 1,
    paddingRight: 5,
  },


  discountPriceContainer: {
    justifyContent: 'center',
  },


  oldPrice: {
    fontSize: 11,
    color: '#9A9186',
    textDecorationLine: 'line-through',
    fontWeight: '600',
    marginBottom: 2,
  },


  productPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.2,
  },


  loginPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#817B71',
    lineHeight: 15,
  },


  /* =======================================================
     ADD TO CART
  ======================================================= */

  addButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
  },


  addButtonDisabled: {
    backgroundColor: '#B8B2A9',
  },


  /* =======================================================
     EMPTY
  ======================================================= */

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 75,
    paddingHorizontal: 25,
  },


  emptyIconBox: {
    width: 82,
    height: 82,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },


  emptyTitle: {
    marginTop: 17,
    fontSize: 20,
    fontWeight: '900',
    color: '#171717',
  },


  emptyText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: '#817B71',
    textAlign: 'center',
  },


  bottomSpace: {
    height: 30,
  },

});