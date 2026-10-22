import { QuantitySelector } from '../components/quantity-selector';
import { shoppingCardLayout } from '../components/shopping-card-layout';
import { useActionDialog } from '../components/action-dialog';
import { useShopping } from '../hooks/use-shopping';
import { confirmShoppingClear } from '../services/confirm-shopping-clear';
import { shoppingState } from '../services/shopping-state';
import { CartButton } from '../components/cart-button';

import { getFinalPrice } from '../services/product-price';

import { goBackOrHome, startShopping } from '../services/navigation';
import { ProductImage } from '../components/product-image';
import { ImageFrame } from '../services/image-frame';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
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

import { getSessionSnapshot } from '../services/tokenStorage';


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
  imageFrame?: ImageFrame | null;

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

const getImageUrl = (image?: string) => {
  const value = image?.trim().replace(/\\/g, '/').replace(/^\/+/, '') || '';
  if (!value || /^https?:\/\//.test(value)) return value;
  return `${API_URL}/${value.startsWith('uploads/') ? value : `uploads/${value}`}`;
};


// =========================================================
// FAVORITES
// =========================================================

export default function Favorites() {
  const { alert: actionAlert, dialog } = useActionDialog({ showIcon: false });
  const shopping = useShopping();

  // =======================================================
  // STATE
  // =======================================================

  // The API does not guarantee order. Use the same identity order for optimistic and refreshed products.
  const favorites = shopping.favorites
    .map(p => ({ ...p, id: String(p._id || p.id) }))
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) as FavoriteProduct[];

  const { showAlert, feedback } = shopping;

  const [
    initialLoadFinished,
    setInitialLoadFinished,
  ] = useState(false);

  // =======================================================
  // LOAD FAVORITES
  // =======================================================

  const loadFavorites =
    useCallback(async () => { await shoppingState.refresh(true); }, []);


  // =======================================================
  // REFRESH WHEN PAGE OPENS / FOCUSES
  // =======================================================

  useFocusEffect(
    useCallback(() => {

      let active =
        true;

      const refresh =
        async () => {



          const loggedIn = getSessionSnapshot().authenticated;

          if (
            !active
          ) {

            return;

          }

          if (
            loggedIn
          ) {

            await loadFavorites();
            if (active) setInitialLoadFinished(true);

          } else {

            setInitialLoadFinished(
              true
            );

          }

        };


      void refresh().catch(() => { if (active) { setInitialLoadFinished(true); showAlert('Could not refresh favorites. Please reopen this page to retry.', 'Connection Error'); } });


      return () => {

        active =
          false;

      };

    }, [
      loadFavorites,
      showAlert,
    ])
  );


  // =======================================================
  // REMOVE FAVORITE
  // =======================================================

  const removeFavorite = (productId: string) => { const product = shopping.favorites.find(p => String(p._id || p.id) === productId); return product ? shopping.toggle(product) : Promise.resolve(); };

  // =======================================================
  // ADD TO CART
  // =======================================================

  const addToCart =
    (product: FavoriteProduct) => shopping.add(product);


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

  const goBackHome = goBackOrHome;


  // =======================================================
  // UI
  // =======================================================

  return (

    <View
      style={
        styles.container
      }
    >
      {dialog}

      {feedback}

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

          {favorites.length > 0 && <Text
            style={
              styles.subtitle
            }
          >
            {favorites.length} {favorites.length === 1 ? 'favorite' : 'favorites'}
          </Text>}

        </View>
        <CartButton />
      </View>

      {favorites.length > 0 && <Pressable accessibilityRole="button" onPress={() => confirmShoppingClear('Favorites', shopping.clearFavorites, actionAlert)}
        style={{ alignSelf: 'flex-end', padding: 12 }}><Text style={{ color: '#E35B3F', fontWeight: '700' }}>Clear Favorites</Text></Pressable>}


      {/* =================================================
          CONTENT
      ================================================= */}

      {/* Show this session's cached favorites while the focus refresh runs. */}
      {!shopping.favoritesReady && favorites.length === 0 && !initialLoadFinished ? (

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
              startShopping
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




          {favorites.map(
            product => {

              const itemRemoving =
                shopping.pendingFavorites.has(product.id);

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

                <Pressable testID="favorite-product-card"
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

                      <ProductImage imageFrame={product.imageFrame}
                        source={{
                          uri:
                            getImageUrl(product.image),
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

                    <View style={styles.priceActionsRow}>
                    <View style={styles.priceArea}>
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
                            } numberOfLines={1} adjustsFontSizeToFit>
                            {
                              formatPrice(
                                originalPrice
                              )
                            }
                          </Text>


                          <Text
                            style={
                              styles.price
                            } numberOfLines={1} adjustsFontSizeToFit>
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
                          } numberOfLines={1} adjustsFontSizeToFit>
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


                    </View>
                    {/* =================================================
                        ACTIONS
                    ================================================= */}

                    <View
                      style={
                        styles.actions
                      }
                    >

                      {/* ADD TO CART */}

                      <QuantitySelector compact grid style={styles.favoriteQuantity} product={product} onAdjust={delta => void shopping.adjust(product, delta)}><Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${product.name} to cart`}
                        style={({ pressed }) => [
                          styles.addToCartButton, pressed && { backgroundColor: '#E35B3F' },

                          outOfStock &&
                            styles.disabledButton,
                        ]}

                        onPress={(event) => {

                          event.stopPropagation();

                          if (product.availability !== false) {

                            addToCart(
                              product
                            );

                          }

                        }}

                        disabled={
                          outOfStock
                        }
                      >

                        {(

                          <>

                            <Ionicons
                              name="cart-outline"
                              size={14}
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

                      </Pressable></QuantitySelector>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${product.name} from favorites`}
                        accessibilityState={{ disabled: itemRemoving }}
                        disabled={itemRemoving}
                        style={styles.removeButton}
                        onPress={event => {
                          event.stopPropagation();
                          if (!itemRemoving) void removeFavorite(product.id);
                        }}
                      >
                        {({ pressed }) => (
                          <View style={[
                            styles.removeButtonFace,
                            pressed && { backgroundColor: '#FFE0D4' },
                          ]}>
                            <Ionicons name="heart" size={18} color="#E35B3F" />
                          </View>
                        )}
                      </Pressable>
                    </View>
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
        'transparent',

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
        'transparent',

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
        'transparent',

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

      flexDirection:
        'row',

      borderWidth:
        1,

      borderColor:
        'transparent',

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
      ...shoppingCardLayout.card,
    },


    // =======================================================
    // PRODUCT IMAGE
    // =======================================================

    productImage: {

      borderRadius:
        17,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        'transparent',

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',
      ...shoppingCardLayout.image,
    },

    productImageActual: { backgroundColor: '#FFFFFF',

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
      ...shoppingCardLayout.info, paddingRight: 0,
    },

    name: {
      height: 20, lineHeight: 20, paddingRight: 24,

      fontSize:
        16,

      fontWeight:
        '900',

      color:
        '#171717',

    },

    brand: {
      height: 14, lineHeight: 14,

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
      height: 14, lineHeight: 14,

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
      height: 14, lineHeight: 14,

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

    priceActionsRow: { flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginTop: 4 },
    priceArea: { width: '100%', minWidth: 0, justifyContent: 'center' },
    discountPriceContainer: {
      height: 38, justifyContent: 'center',

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
      minHeight: 22,

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

    favoriteQuantity: { width: 88, alignSelf: 'center' },
    actions: {
      width: 140, flexShrink: 0, gap: 8,

      flexDirection:
        'row',

      alignItems:
        'center',

    },

    addToCartButton: {

      width: '100%', minWidth: 0,

      backgroundColor:
        '#171717',

      minHeight:
        34,

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        3,

    },

    disabledButton: {

      backgroundColor:
        '#B7B0A6',

    },

    addToCartText: {

      color:
        '#FFFFFF',

      fontSize:
        10,

      fontWeight:
        '800',

    },

    removeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },

    removeButtonFace: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: '#FFF0E8',
      alignItems: 'center',
      justifyContent: 'center',
    },

  });
