import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ionicons } from '@expo/vector-icons';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useRef,
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

type FavoriteProduct = {
  id: string;

  name: string;

  description?: string;

  image: string;

  category: string;

  brand: string;

  price?: number;

  discount?: number;

  discountedPrice?: number;

  availability?: boolean;
};


// =========================================================
// FINAL PRICE
// =========================================================

const getFinalPrice = (
  product: FavoriteProduct
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


  return Number(
    (
      originalPrice -
      (
        originalPrice *
        discount
      ) / 100
    ).toFixed(2)
  );

};


// =========================================================
// FORMAT USD PRICE
// =========================================================

const formatPrice = (
  price: number
) => {

  const safePrice =
    Number(price) || 0;

  return `$${safePrice.toFixed(2)}`;

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


  let value =
    image.trim();


  if (!value) {

    return '';

  }


  // Complete external URL

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {

    return value;

  }


  // Remove leading slash

  value =
    value.replace(
      /^\/+/,
      ''
    );


  // Old uploads path

  if (
    value.startsWith('uploads/')
  ) {

    return `${API_URL}/${value}`;

  }


  // Windows uploads path

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


  // Default old format

  return `${API_URL}/uploads/${value}`;

};


// =========================================================
// FAVORITES
// =========================================================

export default function Favorites() {


  // =======================================================
  // STATE
  // =======================================================

  const [
    favorites,
    setFavorites,
  ] = useState<FavoriteProduct[]>([]);


  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false);


  const [
    updatingProduct,
    setUpdatingProduct,
  ] = useState<string | null>(null);


  /*
   * Important:
   *
   * This is NOT a loading screen.
   *
   * It only tells us whether the first
   * favorites request has finished.
   *
   * We use it so "No favorites yet"
   * does not appear before the backend
   * response arrives.
   */

  const [
    initialLoadFinished,
    setInitialLoadFinished,
  ] = useState(false);


  /*
   * Keep the latest token in memory.
   *
   * This avoids reading AsyncStorage
   * repeatedly during the same screen session.
   */

  const accessTokenRef =
    useRef<string | null>(null);


  // =======================================================
  // GET TOKEN
  // =======================================================

  const getAccessToken =
    useCallback(
      async () => {

        if (
          accessTokenRef.current
        ) {

          return accessTokenRef.current;

        }


        try {

          const token =
            await AsyncStorage.getItem(
              'accessToken'
            );


          accessTokenRef.current =
            token;


          return token;

        } catch (error) {

          console.log(
            'GET TOKEN ERROR:',
            error
          );

          return null;

        }

      },
      []
    );


  // =======================================================
  // CHECK LOGIN
  // =======================================================

  const checkLogin =
    useCallback(
      async () => {

        try {

          const accessToken =
            await getAccessToken();


          const savedUser =
            await AsyncStorage.getItem(
              'user'
            );


          const loginStatus =
            await AsyncStorage.getItem(
              'isLoggedIn'
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


          return loggedIn;

        } catch (error) {

          console.log(
            'CHECK LOGIN ERROR:',
            error
          );


          setIsLoggedIn(
            false
          );


          return false;

        }

      },
      [
        getAccessToken,
      ]
    );


  // =======================================================
  // LOAD FAVORITES
  // =======================================================

  const loadFavorites =
    useCallback(
      async () => {

        try {

          const accessToken =
            await getAccessToken();


          if (!accessToken) {

            setFavorites([]);

            setIsLoggedIn(
              false
            );

            router.replace(
              '/login'
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


          // =================================================
          // SESSION EXPIRED
          // =================================================

          if (
            response.status === 401 ||
            response.status === 403
          ) {

            accessTokenRef.current =
              null;

            setFavorites([]);

            setIsLoggedIn(
              false
            );

            router.replace(
              '/login'
            );

            return;

          }


          // =================================================
          // SERVER ERROR
          // =================================================

          if (!response.ok) {

            console.log(
              'GET FAVORITES ERROR:',
              data
            );

            /*
             * We do NOT immediately show
             * the empty state as if there
             * are no favorites.
             */

            return;

          }


          // =================================================
          // CONVERT BACKEND DATA
          // =================================================

          const convertedFavorites:
            FavoriteProduct[] =

            (
              Array.isArray(
                data?.favorites
              )
                ? data.favorites
                : []
            )

              .filter(
                (
                  favorite: any
                ) =>
                  !!favorite?.product
              )

              .map(
                (
                  favorite: any
                ) => {

                  const product =
                    favorite.product;


                  return {

                    id:
                      product._id,

                    name:
                      product.name,

                    description:
                      product.description,

                    image:
                      getImageUrl(
                        product.image
                      ),

                    category:
                      product.category?.name ??
                      '',

                    brand:
                      product.brand?.name ??
                      '',

                    price:
                      product.price,

                    discount:
                      product.discount,

                    discountedPrice:
                      product.discountedPrice,

                    availability:
                      product.availability,

                  };

                }
              );


          setFavorites(
            convertedFavorites
          );


        } catch (error) {

          console.log(
            'LOAD FAVORITES ERROR:',
            error
          );

        } finally {

          /*
           * First request is finished.
           *
           * Only now are we allowed to decide
           * whether the favorites list is empty.
           */

          setInitialLoadFinished(
            true
          );

        }

      },
      [
        getAccessToken,
      ]
    );


  // =======================================================
  // REFRESH WHEN PAGE OPENS / FOCUSES
  // =======================================================

  useFocusEffect(
    useCallback(() => {

      let active =
        true;


      const refresh =
        async () => {

          /*
           * Do not show an empty state while
           * the first request is happening.
           */

          if (
            !initialLoadFinished
          ) {

            setInitialLoadFinished(
              false
            );

          }


          const loggedIn =
            await checkLogin();


          if (
            !active
          ) {

            return;

          }


          if (
            loggedIn
          ) {

            await loadFavorites();

          } else {

            setInitialLoadFinished(
              true
            );

          }

        };


      refresh();


      return () => {

        active =
          false;

      };

    }, [
      checkLogin,
      loadFavorites,
      initialLoadFinished,
    ])
  );


  // =======================================================
  // REMOVE FAVORITE
  // =======================================================

  const removeFavorite =
    async (
      productId: string
    ) => {

      if (
        updatingProduct ===
        productId
      ) {

        return;

      }


      try {

        const accessToken =
          await getAccessToken();


        if (!accessToken) {

          router.replace(
            '/login'
          );

          return;

        }


        setUpdatingProduct(
          productId
        );


        const response =
          await fetch(
            `${API_URL}/favorites/remove`,
            {
              method: 'DELETE',

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


        const data =
          await response.json();


        // =================================================
        // SESSION EXPIRED
        // =================================================

        if (
          response.status === 401 ||
          response.status === 403
        ) {

          accessTokenRef.current =
            null;

          setIsLoggedIn(
            false
          );

          setFavorites([]);

          router.replace(
            '/login'
          );

          return;

        }


        // =================================================
        // ERROR
        // =================================================

        if (!response.ok) {

          console.log(
            'REMOVE FAVORITE ERROR:',
            data
          );

          return;

        }


        // =================================================
        // UPDATE UI IMMEDIATELY
        // =================================================

        setFavorites(
          previous =>
            previous.filter(
              product =>
                product.id !==
                productId
            )
        );


      } catch (error) {

        console.log(
          'REMOVE FAVORITE ERROR:',
          error
        );

      } finally {

        setUpdatingProduct(
          null
        );

      }

    };


  // =======================================================
  // ADD TO CART
  // =======================================================

  const addToCart =
    async (
      product: FavoriteProduct
    ) => {

      if (
        !isLoggedIn
      ) {

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


      if (
        updatingProduct ===
        product.id
      ) {

        return;

      }


      try {

        const accessToken =
          await getAccessToken();


        if (!accessToken) {

          router.replace(
            '/login'
          );

          return;

        }


        setUpdatingProduct(
          product.id
        );


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
                    product.id,

                  quantity:
                    1,

                }),
            }
          );


        const data =
          await response.json();


        // =================================================
        // SESSION EXPIRED
        // =================================================

        if (
          response.status === 401 ||
          response.status === 403
        ) {

          accessTokenRef.current =
            null;

          setIsLoggedIn(
            false
          );

          router.replace(
            '/login'
          );

          return;

        }


        // =================================================
        // ERROR
        // =================================================

        if (!response.ok) {

          console.log(
            'ADD TO CART ERROR:',
            data
          );

          return;

        }


        // =================================================
        // OPEN CART
        // =================================================

        router.push(
          '/cart'
        );


      } catch (error) {

        console.log(
          'ADD TO CART ERROR:',
          error
        );

      } finally {

        setUpdatingProduct(
          null
        );

      }

    };


  // =======================================================
  // OPEN PRODUCT
  // =======================================================

  const openProduct =
    (
      product: FavoriteProduct
    ) => {

      router.push({

        pathname:
          '/product-details',

        params: {

          id:
            product.id,

        },

      });

    };


  // =======================================================
  // RETURN HOME
  // =======================================================

  const goBackHome =
    () => {

      router.replace(
        '/'
      );

    };


  // =======================================================
  // UI
  // =======================================================

  return (

    <View
      style={
        styles.container
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
            styles.title
          }
        >
          My Favorites
        </Text>

      </View>


      {/* =================================================
          CONTENT
      ================================================= */}

      {!initialLoadFinished ? (

        /*
         * IMPORTANT:
         *
         * No ActivityIndicator.
         * No loading text.
         * No loading page.
         *
         * We simply keep the content area blank
         * until the first backend request finishes.
         */

        <View
          style={
            styles.initialLoadSpace
          }
        />

      ) : favorites.length === 0 ? (

        /* =================================================
           EMPTY FAVORITES
        ================================================= */

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
              name="heart-outline"
              size={42}
              color="#D4AF37"
            />

          </View>


          <Text
            style={
              styles.emptyTitle
            }
          >
            No favorites yet
          </Text>


          <Text
            style={
              styles.emptyText
            }
          >
            Products you add to your
            favorites will appear here.
          </Text>


          <Pressable
            style={
              styles.shopButton
            }
            onPress={
              goBackHome
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
           FAVORITES LIST
        ================================================= */

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
          }
        >

          <Text
            style={
              styles.countText
            }
          >

            {favorites.length}{' '}

            {
              favorites.length === 1
                ? 'favorite'
                : 'favorites'
            }

          </Text>


          {favorites.map(
            product => {

              const itemUpdating =
                updatingProduct ===
                product.id;


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


              const outOfStock =
                product.availability ===
                false;


              return (

                <Pressable
                  key={
                    product.id
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

                  {/* =================================================
                      IMAGE
                  ================================================= */}

                  <View
                    style={
                      styles.productImage
                    }
                  >

                    {product.image ? (

                      <Image
                        source={{
                          uri:
                            product.image,
                        }}

                        style={
                          styles.productImageActual
                        }

                        resizeMode="contain"
                      />

                    ) : (

                      <Ionicons
                        name="cube-outline"
                        size={42}
                        color="#D4AF37"
                      />

                    )}

                  </View>


                  {/* =================================================
                      DISCOUNT BADGE
                  ================================================= */}

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


                  {/* =================================================
                      INFO
                  ================================================= */}

                  <View
                    style={
                      styles.info
                    }
                  >

                    <Text
                      style={
                        styles.name
                      }
                      numberOfLines={1}
                    >
                      {
                        product.name
                      }
                    </Text>


                    {product.brand ? (

                      <Text
                        style={
                          styles.brand
                        }
                        numberOfLines={1}
                      >
                        {
                          product.brand
                        }
                      </Text>

                    ) : null}


                    {product.category ? (

                      <Text
                        style={
                          styles.category
                        }
                        numberOfLines={1}
                      >
                        {
                          product.category
                        }
                      </Text>

                    ) : null}


                    {/* =================================================
                        OUT OF STOCK
                    ================================================= */}

                    {outOfStock && (

                      <Text
                        style={
                          styles.outOfStock
                        }
                      >
                        Out of Stock
                      </Text>

                    )}


                    {/* =================================================
                        PRICE
                    ================================================= */}

                    {product.price !==
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
                              styles.price
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
                            styles.price
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
                          styles.noPrice
                        }
                      >
                        Price unavailable
                      </Text>

                    )}


                    {/* =================================================
                        ACTIONS
                    ================================================= */}

                    <View
                      style={
                        styles.actions
                      }
                    >

                      {/* ADD TO CART */}

                      <Pressable
                        style={[
                          styles.addToCartButton,

                          outOfStock &&
                            styles.disabledButton,
                        ]}

                        onPress={(event) => {

                          event.stopPropagation();


                          if (
                            !itemUpdating
                          ) {

                            addToCart(
                              product
                            );

                          }

                        }}

                        disabled={
                          outOfStock ||
                          itemUpdating
                        }
                      >

                        {itemUpdating ? (

                          /*
                           * No ActivityIndicator.
                           *
                           * We use a simple disabled
                           * state instead of displaying
                           * a loading spinner.
                           */

                          <Text
                            style={
                              styles.addToCartText
                            }
                          >
                            Adding...
                          </Text>

                        ) : (

                          <>

                            <Ionicons
                              name="cart-outline"
                              size={17}
                              color="#FFFFFF"
                            />

                            <Text
                              style={
                                styles.addToCartText
                              }
                            >
                              Add to Cart
                            </Text>

                          </>

                        )}

                      </Pressable>


                      {/* REMOVE */}

                      <Pressable
                        style={
                          styles.removeButton
                        }

                        onPress={(event) => {

                          event.stopPropagation();


                          if (
                            !itemUpdating
                          ) {

                            removeFavorite(
                              product.id
                            );

                          }

                        }}

                        disabled={
                          itemUpdating
                        }
                      >

                        <Ionicons
                          name="heart"
                          size={18}
                          color="#B85C4A"
                        />

                      </Pressable>

                    </View>

                  </View>

                </Pressable>

              );

            }
          )}

        </ScrollView>

      )}

    </View>

  );

}


// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({

    // =======================================================
    // CONTAINER
    // =======================================================

    container: {

      flex: 1,

      backgroundColor:
        '#F7F7F7',

      paddingHorizontal:
        20,

      paddingTop:
        40,

    },


    // =======================================================
    // HEADER
    // =======================================================

    header: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        20,

    },


    backButton: {

      width:
        42,

      height:
        42,

      borderRadius:
        21,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#E0E0E0',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        12,

    },


    title: {

      fontSize:
        27,

      fontWeight:
        '800',

      color:
        '#000000',

    },


    // =======================================================
    // INITIAL LOAD
    // =======================================================

    /*
     * Empty space only.
     *
     * No spinner.
     * No loading text.
     * No "No favorites yet".
     */

    initialLoadSpace: {

      flex: 1,

    },


    // =======================================================
    // SCROLL
    // =======================================================

    scrollContent: {

      paddingBottom:
        35,

    },


    countText: {

      fontSize:
        13,

      color:
        '#888888',

      marginBottom:
        12,

    },


    // =======================================================
    // EMPTY STATE
    // =======================================================

    emptyContainer: {

      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        25,

      paddingBottom:
        80,

    },


    emptyIcon: {

      width:
        82,

      height:
        82,

      borderRadius:
        41,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#E0E0E0',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        18,

    },


    emptyTitle: {

      fontSize:
        20,

      fontWeight:
        '800',

      color:
        '#000000',

    },


    emptyText: {

      marginTop:
        8,

      fontSize:
        13,

      lineHeight:
        20,

      color:
        '#888888',

      textAlign:
        'center',

    },


    shopButton: {

      marginTop:
        20,

      backgroundColor:
        '#000000',

      paddingHorizontal:
        18,

      paddingVertical:
        12,

      borderRadius:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,

    },


    shopButtonText: {

      color:
        '#FFFFFF',

      fontSize:
        13,

      fontWeight:
        '700',

    },


    // =======================================================
    // PRODUCT CARD
    // =======================================================

    productCard: {

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        17,

      padding:
        12,

      flexDirection:
        'row',

      borderWidth:
        1,

      borderColor:
        '#E0E0E0',

      marginBottom:
        13,

      position:
        'relative',

    },


    // =======================================================
    // PRODUCT IMAGE
    // =======================================================

    productImage: {

      width:
        105,

      height:
        115,

      borderRadius:
        14,

      backgroundColor:
        '#FFFFFF',

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

    },


    productImageActual: {

      width:
        '100%',

      height:
        '100%',

    },


    // =======================================================
    // DISCOUNT
    // =======================================================

    discountBadge: {

      position:
        'absolute',

      top:
        17,

      left:
        17,

      backgroundColor:
        '#C62828',

      paddingHorizontal:
        7,

      paddingVertical:
        4,

      borderRadius:
        7,

      zIndex:
        5,

    },


    discountBadgeText: {

      color:
        '#FFFFFF',

      fontSize:
        9,

      fontWeight:
        '800',

    },


    // =======================================================
    // INFO
    // =======================================================

    info: {

      flex: 1,

      marginLeft:
        13,

      justifyContent:
        'center',

      minWidth:
        0,

    },


    name: {

      fontSize:
        16,

      fontWeight:
        '800',

      color:
        '#000000',

    },


    brand: {

      marginTop:
        4,

      fontSize:
        11,

      fontWeight:
        '700',

      color:
        '#1A1A1A',

    },


    category: {

      marginTop:
        3,

      fontSize:
        12,

      color:
        '#888888',

    },


    outOfStock: {

      marginTop:
        5,

      fontSize:
        11,

      fontWeight:
        '700',

      color:
        '#D32F2F',

    },


    // =======================================================
    // PRICE
    // =======================================================

    discountPriceContainer: {

      marginTop:
        8,

    },


    oldPrice: {

      fontSize:
        11,

      color:
        '#999999',

      textDecorationLine:
        'line-through',

      fontWeight:
        '600',

      marginBottom:
        2,

    },


    price: {

      fontSize:
        16,

      fontWeight:
        '800',

      color:
        '#000000',

    },


    noPrice: {

      marginTop:
        8,

      fontSize:
        12,

      fontWeight:
        '600',

      color:
        '#888888',

    },


    // =======================================================
    // ACTIONS
    // =======================================================

    actions: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        10,

    },


    addToCartButton: {

      flex: 1,

      backgroundColor:
        '#000000',

      minHeight:
        36,

      borderRadius:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,

    },


    disabledButton: {

      backgroundColor:
        '#A0A0A0',

    },


    addToCartText: {

      color:
        '#FFFFFF',

      fontSize:
        12,

      fontWeight:
        '700',

    },


    removeButton: {

      width:
        38,

      height:
        36,

      borderRadius:
        10,

      marginLeft:
        7,

      backgroundColor:
        '#FFF5F2',

      alignItems:
        'center',

      justifyContent:
        'center',

    },

  });
