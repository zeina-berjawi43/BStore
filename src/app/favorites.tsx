import { request } from '../services/request';
import {
  View,
  Alert,
  Text,
  Pressable,
  StyleSheet,
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

import { getValidAccessToken } from '../services/authService';


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

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {

    return value;

  }

  value =
    value.replace(
      /^\/+/,
      ''
    );

  if (
    value.startsWith('uploads/')
  ) {

    return `${API_URL}/${value}`;

  }

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

  const [
    initialLoadFinished,
    setInitialLoadFinished,
  ] = useState(false);

  const mutationBusy = useRef(false);
  const loadRevision = useRef(0);
  const accessTokenRef =
    useRef<string | null>(null);


  // =======================================================
  // GET TOKEN
  // =======================================================

  const getAccessToken =
    useCallback(
      async () => {

        try {

          const token =
            await getValidAccessToken();

          accessTokenRef.current =
            token;

          return token;

        } catch (error) {

          if (__DEV__) { console.log(
            'GET TOKEN ERROR:',
            error
          ); }

          throw error;

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

          if (__DEV__) { console.log(
            'CHECK LOGIN ERROR:',
            error
          ); }

          throw error;

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
        if (mutationBusy.current) return;
        const revision = ++loadRevision.current;

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
            await request(
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
          if (revision !== loadRevision.current) return;


          // =================================================
          // SESSION EXPIRED
          // =================================================

          if (
            response.status === 401
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
          Alert.alert('Request failed', data?.message || 'Please try again.');

            if (__DEV__) { console.log(
              'GET FAVORITES ERROR:',
              data
            ); }

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

          if (__DEV__) { console.log(
            'LOAD FAVORITES ERROR:',
            error
          ); }
          Alert.alert('Connection Error', error instanceof Error ? error.message : 'Please try again.');

        } finally {


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


      void refresh().catch(() => { setInitialLoadFinished(true); Alert.alert('Connection Error', 'Could not load favorites. Please reopen this page to retry.'); });


      return () => {

        active =
          false;
        loadRevision.current++;

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

      if (mutationBusy.current) {

        return;

      }

      mutationBusy.current = true;
      loadRevision.current++;
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
          await request(
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
          response.status === 401
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
          Alert.alert('Request failed', data?.message || 'Please try again.');

          if (__DEV__) { console.log(
            'REMOVE FAVORITE ERROR:',
            data
          ); }

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

        if (__DEV__) { console.log(
          'REMOVE FAVORITE ERROR:',
          error
        ); }
          Alert.alert('Connection Error', error instanceof Error ? error.message : 'Please try again.');

      } finally {
        mutationBusy.current = false;

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

      if (mutationBusy.current) {

        return;

      }

      mutationBusy.current = true;
      loadRevision.current++;
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
          await request(
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
          response.status === 401
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
          Alert.alert('Request failed', data?.message || 'Please try again.');

          if (__DEV__) { console.log(
            'ADD TO CART ERROR:',
            data
          ); }

          return;

        }


        // =================================================
        // OPEN CART
        // =================================================

        router.push(
          '/cart'
        );


      } catch (error) {

        if (__DEV__) { console.log(
          'ADD TO CART ERROR:',
          error
        ); }
          Alert.alert('Connection Error', error instanceof Error ? error.message : 'Please try again.');

      } finally {
        mutationBusy.current = false;

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
            My Favorites
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Your saved products
          </Text>

        </View>

      </View>


      {/* =================================================
          CONTENT
      ================================================= */}

      {!initialLoadFinished ? (

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
              color="#E35B3F"
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

          <View
            style={
              styles.countContainer
            }
          >

            <Ionicons
              name="heart"
              size={16}
              color="#E35B3F"
            />

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

          </View>


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
                        color="#E35B3F"
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
                          color="#E35B3F"
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
        '#F7F3EC',

      paddingHorizontal:
        18,

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
        18,

    },

    backButton: {

      width:
        46,

      height:
        46,

      borderRadius:
        15,

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
        height: 3,
      },

      shadowOpacity:
        0.07,

      shadowRadius:
        7,

      elevation:
        2,

    },

    headerText: {

      flex: 1,

    },

    title: {

      fontSize:
        29,

      fontWeight:
        '900',

      color:
        '#171717',

      letterSpacing:
        -0.8,

    },

    subtitle: {

      marginTop:
        4,

      fontSize:
        13,

      color:
        '#817B71',

      lineHeight:
        18,

    },


    // =======================================================
    // INITIAL LOAD
    // =======================================================

    initialLoadSpace: {

      flex: 1,

    },


    // =======================================================
    // SCROLL
    // =======================================================

    scrollContent: {

      paddingTop:
        2,

      paddingBottom:
        35,

    },


    // =======================================================
    // COUNT
    // =======================================================

    countContainer: {

      alignSelf:
        'flex-start',

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#FFF7F3',

      borderWidth:
        1,

      borderColor:
        '#F0CFC4',

      borderRadius:
        12,

      paddingHorizontal:
        11,

      paddingVertical:
        7,

      marginBottom:
        14,

      gap:
        6,

    },

    countText: {

      fontSize:
        12,

      fontWeight:
        '800',

      color:
        '#E35B3F',

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
        65,

    },

    emptyIcon: {

      width:
        84,

      height:
        84,

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

      marginBottom:
        18,

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

    emptyTitle: {

      fontSize:
        21,

      fontWeight:
        '900',

      color:
        '#171717',

    },

    emptyText: {

      marginTop:
        8,

      fontSize:
        13,

      lineHeight:
        20,

      color:
        '#777168',

      textAlign:
        'center',

    },

    shopButton: {

      marginTop:
        20,

      minHeight:
        50,

      paddingHorizontal:
        21,

      borderRadius:
        15,

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
        height: 4,
      },

      shadowOpacity:
        0.14,

      shadowRadius:
        7,

      elevation:
        3,

    },

    shopButtonText: {

      color:
        '#FFFFFF',

      fontSize:
        14,

      fontWeight:
        '900',

    },


    // =======================================================
    // PRODUCT CARD
    // =======================================================

    productCard: {

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        21,

      padding:
        12,

      flexDirection:
        'row',

      borderWidth:
        1,

      borderColor:
        '#E7DED1',

      marginBottom:
        13,

      position:
        'relative',

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


    // =======================================================
    // PRODUCT IMAGE
    // =======================================================

    productImage: {

      width:
        108,

      height:
        116,

      borderRadius:
        17,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#EEE4D7',

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
        '#E35B3F',

      paddingHorizontal:
        8,

      paddingVertical:
        4,

      borderRadius:
        8,

      zIndex:
        5,

    },

    discountBadgeText: {

      color:
        '#FFFFFF',

      fontSize:
        9,

      fontWeight:
        '900',

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
        '900',

      color:
        '#171717',

    },

    brand: {

      marginTop:
        4,

      fontSize:
        11,

      fontWeight:
        '800',

      color:
        '#E35B3F',

    },

    category: {

      marginTop:
        3,

      fontSize:
        12,

      fontWeight:
        '600',

      color:
        '#9A9186',

    },

    outOfStock: {

      marginTop:
        5,

      fontSize:
        11,

      fontWeight:
        '800',

      color:
        '#D93025',

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
        '#9C968D',

      textDecorationLine:
        'line-through',

      fontWeight:
        '600',

      marginBottom:
        2,

    },

    price: {

      fontSize:
        17,

      fontWeight:
        '900',

      color:
        '#171717',

    },

    noPrice: {

      marginTop:
        8,

      fontSize:
        12,

      fontWeight:
        '600',

      color:
        '#9A9186',

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
        '#171717',

      minHeight:
        38,

      borderRadius:
        11,

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
        '#B7B0A6',

    },

    addToCartText: {

      color:
        '#FFFFFF',

      fontSize:
        12,

      fontWeight:
        '800',

    },

    removeButton: {

      width:
        40,

      height:
        38,

      borderRadius:
        11,

      marginLeft:
        7,

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