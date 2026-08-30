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


  /* =======================================================
     COMPLETE URL
  ======================================================= */

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {

    return value;

  }


  /* =======================================================
     NORMALIZE PATH
  ======================================================= */

  value =
    value
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');


  /* =======================================================
     OLD LOCAL UPLOAD PATH
  ======================================================= */

  if (
    value.startsWith('uploads/')
  ) {

    return `${API_URL}/${value}`;

  }


  /* =======================================================
     SUPABASE STORAGE PATH
  ======================================================= */

  if (
    value.startsWith('product-images/')
  ) {

    return `${API_URL}/${value}`;

  }


  /* =======================================================
     OLD IMAGE FORMAT
  ======================================================= */

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


  /* =======================================================
     BACKEND DISCOUNTED PRICE
  ======================================================= */

  if (
    product.discountedPrice !== undefined &&
    product.discountedPrice !== null
  ) {

    return Number(
      product.discountedPrice
    );

  }


  /* =======================================================
     NO DISCOUNT
  ======================================================= */

  if (
    discount <= 0
  ) {

    return Number(
      originalPrice.toFixed(2)
    );

  }


  /* =======================================================
     CALCULATE DISCOUNT
  ======================================================= */

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


  /*
   * IMPORTANT:
   *
   * This loading state is only true when we have
   * NO products yet.
   *
   * When the page comes back into focus and products
   * already exist, they remain visible.
   */

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


  const [
    updatingFavorite,
    setUpdatingFavorite,
  ] = useState<string | null>(null);


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
     
     IMPORTANT:
     
     This function DOES NOT reset products to [] while
     refreshing.
     
     It also DOES NOT show loading if products already
     exist.
  ======================================================= */

  const loadProducts = async () => {

    try {

      /*
       * Only show the loading screen when there are
       * currently no products.
       */

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

        /*
         * IMPORTANT:
         *
         * Do NOT erase old products here.
         *
         * If the refresh fails, the user can still
         * see the products already loaded.
         */

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


      /*
       * Replace data only after the complete response
       * has arrived.
       */

      setProducts(
        receivedProducts
      );


    } catch (error) {

      console.log(
        'LOAD PRODUCTS ERROR:',
        error
      );

      /*
       * IMPORTANT:
       *
       * Don't clear existing products when a refresh
       * fails.
       */

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
     
     IMPORTANT:
     
     All independent requests start together.
  ======================================================= */

  const loadData = async () => {

    /*
     * Don't wait for checkLogin before starting
     * the products request.
     *
     * This saves unnecessary time.
     */

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
     
     Every time the page gets focus:
     
     - Existing products stay visible.
     * New data is fetched in background.
  ======================================================= */

  useFocusEffect(
    useCallback(() => {

      loadData();

    }, [])
  );


  /* =======================================================
     FILTER + SORT PRODUCTS
     
     Highest price → Lowest price
     
     Uses final price after discount.
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
     TOGGLE FAVORITE
  ======================================================= */

  const toggleFavorite = async (
    product: Product
  ) => {

    if (!isLoggedIn) {

      router.push(
        '/login'
      );

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


      const alreadyFavorite =
        favorites.includes(
          product._id
        );


      setUpdatingFavorite(
        product._id
      );


      const endpoint =
        alreadyFavorite
          ? `${API_URL}/favorites/remove`
          : `${API_URL}/favorites/add`;


      const method =
        alreadyFavorite
          ? 'DELETE'
          : 'POST';


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
        await response.json();


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        setIsLoggedIn(
          false
        );


        setFavorites(
          []
        );


        router.push(
          '/login'
        );


        return;

      }


      if (!response.ok) {

        showAlert(
          data?.message ||
          'Could not update favorites.'
        );


        return;

      }


      if (alreadyFavorite) {

        setFavorites(
          previous =>
            previous.filter(
              id =>
                id !== product._id
            )
        );


        showAlert(
          `${product.name} removed from favorites.`
        );

      } else {

        setFavorites(
          previous => [

            ...previous,

            product._id,

          ]
        );


        showAlert(
          `${product.name} added to favorites.`
        );

      }

    } catch (error) {

      console.log(
        'TOGGLE FAVORITE ERROR:',
        error
      );


      showAlert(
        'Could not update favorites.'
      );

    } finally {

      setUpdatingFavorite(
        null
      );

    }

  };


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

      {/* ===================================================
          ALERT
      =================================================== */}

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
            color="#D4AF37"
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


          <View
            style={
              styles.headerText
            }
          >

            <Text
              style={
                styles.smallTitle
              }
            >
              Category
            </Text>


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
              size={23}
              color="#000000"
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

          <Text
            style={
              styles.resultsTitle
            }
          >
            Products
          </Text>


          {!loadingProducts && (

            <Text
              style={
                styles.resultsCount
              }
            >
              {filteredProducts.length}{' '}
              products
            </Text>

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

          /* =================================================
             EMPTY
          ================================================= */

          <View
            style={
              styles.emptyContainer
            }
          >

            <Ionicons
              name="cube-outline"
              size={55}
              color="#D4AF37"
            />


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

          /* =================================================
             PRODUCTS GRID
          ================================================= */

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


                const favoriteUpdating =
                  updatingFavorite ===
                  product._id;


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
                            color="#D4AF37"
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

                    <Pressable
                      style={
                        styles.favoriteButton
                      }

                      onPress={(event) => {

                        event.stopPropagation();


                        if (
                          !favoriteUpdating
                        ) {

                          toggleFavorite(
                            product
                          );

                        }

                      }}

                      hitSlop={5}
                    >

                      {favoriteUpdating ? (

                        <View
                          style={
                            styles.favoriteLoading
                          }
                        />

                      ) : (

                        <Ionicons
                          name={
                            favorite
                              ? 'heart'
                              : 'heart-outline'
                          }

                          size={21}

                          color={
                            favorite
                              ? '#D4AF37'
                              : '#000000'
                          }

                        />

                      )}

                    </Pressable>


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

  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },


  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },


  /* =======================================================
     ALERT
  ======================================================= */

  homeAlert: {
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


  homeAlertIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4CAF50',
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
    color: '#1A1A1A',
    marginBottom: 3,
  },


  homeAlertMessage: {
    fontSize: 11.5,
    color: '#777777',
    lineHeight: 16,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },


  headerText: {
    flex: 1,
  },


  smallTitle: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },


  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#000000',
  },


  headerCartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    position: 'relative',
  },


  headerCartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },


  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
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


  resultsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },


  resultsCount: {
    fontSize: 12,
    color: '#888888',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#E5E5E5',
    borderTopColor: '#000000',
  },


  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#888888',
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
    width: '48%',
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 10,
    position: 'relative',
  },


  productImage: {
    height: 145,
    borderRadius: 14,
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
    backgroundColor: '#C62828',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 4,
  },


  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },


  favoriteLoading: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },


  /* =======================================================
     PRODUCT INFO
  ======================================================= */

  productName: {
    marginTop: 11,
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },


  productCategory: {
    marginTop: 5,
    fontSize: 12,
    color: '#888888',
  },


  outOfStockText: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '700',
    color: '#D32F2F',
  },


  /* =======================================================
     PRICE
  ======================================================= */

  productBottom: {
    marginTop: 9,
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
    color: '#999999',
    textDecorationLine: 'line-through',
    fontWeight: '600',
    marginBottom: 2,
  },


  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },


  loginPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1A1A',
  },


  /* =======================================================
     ADD TO CART
  ======================================================= */

  addButton: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },


  addButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },


  /* =======================================================
     EMPTY
  ======================================================= */

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },


  emptyTitle: {
    marginTop: 15,
    fontSize: 19,
    fontWeight: '700',
    color: '#000000',
  },


  emptyText: {
    marginTop: 7,
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
  },


  bottomSpace: {
    height: 30,
  },

});
