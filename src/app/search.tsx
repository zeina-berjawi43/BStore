import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Image,
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


/* =========================================================
   API
========================================================= */

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';


/* =========================================================
   THEME
========================================================= */

const COLORS = {
  background: '#F7F7F7',
  surface: '#FFFFFF',
  primary: '#E35B3F',
  primarySoft: '#FFF0EC',
  text: '#171717',
  textSecondary: '#77736D',
  textMuted: '#A09C96',
  border: '#E9E6E2',
  discount: '#C62828',
};


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

  // Prices are always USD.
  price?: number;

  discount?: number;

  discountedPrice?: number;

  image?: string;

  category?: Category | string;

  brand?: Brand | string;

  availability?: boolean;
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
   GET CATEGORY NAME
========================================================= */

const getCategoryName = (
  category?: Category | string
) => {

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
   GET BRAND NAME
========================================================= */

const getBrandName = (
  brand?: Brand | string
) => {

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
   FINAL USD PRICE
========================================================= */

const getFinalPrice = (
  product: Product
) => {

  const originalPrice =
    Number(
      product.price
    ) || 0;


  const discount =
    Number(
      product.discount
    ) || 0;


  /*
   * If backend already provides
   * the final discounted USD price,
   * use it.
   */

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


  /*
   * No discount.
   */

  if (
    discount <= 0
  ) {

    return Number(
      originalPrice.toFixed(2)
    );

  }


  /*
   * Calculate discounted USD price.
   */

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
   USD FORMAT
========================================================= */

const formatUSD = (
  amount: number
) => {

  const safeAmount =
    Number(
      amount
    ) || 0;


  return `$${safeAmount.toFixed(2)}`;

};


/* =========================================================
   SEARCH
========================================================= */

export default function Search() {


  /* =======================================================
     STATE
  ======================================================= */

  const [
    searchText,
    setSearchText,
  ] = useState('');


  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);


  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  const loadProducts = async () => {

    try {

      const response =
        await fetch(
          `${API_URL}/products`,
          {
            method: 'GET',

            headers: {
              Accept:
                'application/json',
            },

          }
        );


      const data =
        await response.json();


      console.log(
        'SEARCH PRODUCTS RESPONSE:',
        data
      );


      if (!response.ok) {

        console.log(
          'GET PRODUCTS ERROR:',
          data
        );


        setProducts(
          []
        );


        return;

      }


      /*
       * Backend may return:
       *
       * {
       *   products: [...]
       * }
       *
       * OR
       *
       * [...]
       */

      if (
        Array.isArray(data)
      ) {

        setProducts(
          data
        );

      } else if (
        Array.isArray(
          data.products
        )
      ) {

        setProducts(
          data.products
        );

      } else {

        console.log(
          'Unexpected products response:',
          data
        );


        setProducts(
          []
        );

      }

    } catch (error) {

      console.log(
        'LOAD PRODUCTS ERROR:',
        error
      );


      setProducts(
        []
      );

    }

  };


  /* =======================================================
     PAGE FOCUS
  ======================================================= */

  useFocusEffect(
    useCallback(() => {

      loadProducts();

    }, [])
  );


  /* =======================================================
     FILTER PRODUCTS
  ======================================================= */

  const search =
    searchText
      .toLowerCase()
      .trim();


  const filteredProducts =
    products.filter(
      product => {

        if (!search) {
          return false;
        }


        const productName =
          product.name
            ?.toLowerCase()
            .includes(search);


        const categoryName =
          getCategoryName(
            product.category
          )
            .toLowerCase()
            .includes(search);


        const brandName =
          getBrandName(
            product.brand
          )
            .toLowerCase()
            .includes(search);


        return (
          productName ||
          categoryName ||
          brandName
        );

      }
    );


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
     RETURN
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
            onPress={() =>
              router.back()
            }

            style={
              styles.backButton
            }
          >

            <Ionicons
              name="arrow-back"
              size={21}
              color={COLORS.text}
            />

          </Pressable>


          <Text
            style={
              styles.title
            }
          >
            Search
          </Text>

        </View>


        {/* =================================================
            SEARCH BAR
        ================================================= */}

        <View
          style={
            styles.searchContainer
          }
        >

          <View
            style={
              styles.searchIconContainer
            }
          >

            <Ionicons
              name="search-outline"
              size={20}
              color={COLORS.primary}
            />

          </View>


          <TextInput
            value={
              searchText
            }

            onChangeText={
              setSearchText
            }

            placeholder="Search products, categories or brands..."

            placeholderTextColor={
              COLORS.textMuted
            }

            style={
              styles.searchInput
            }

            autoFocus

            autoCorrect={false}

            autoCapitalize="none"
          />


          {searchText.length > 0 && (

            <Pressable
              onPress={() =>
                setSearchText('')
              }

              style={
                styles.clearButton
              }
            >

              <Ionicons
                name="close"
                size={17}
                color={COLORS.textSecondary}
              />

            </Pressable>

          )}

        </View>


        {/* =================================================
            CONTENT
        ================================================= */}

        {searchText.trim().length === 0 ? (

          <View
            style={
              styles.startContainer
            }
          >

            <View
              style={
                styles.startIcon
              }
            >

              <Ionicons
                name="search-outline"
                size={31}
                color={COLORS.primary}
              />

            </View>


            <Text
              style={
                styles.startTitle
              }
            >
              Find what you're looking for
            </Text>


            <Text
              style={
                styles.startText
              }
            >
              Search by product, category or brand
            </Text>

          </View>

        ) : (

          <>

            {/* =============================================
                RESULTS HEADER
            ============================================= */}

            <View
              style={
                styles.resultsHeader
              }
            >

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Results
              </Text>


              <View
                style={
                  styles.resultsCountContainer
                }
              >

                <Text
                  style={
                    styles.resultsCount
                  }
                >

                  {filteredProducts.length}

                  {' '}

                  {
                    filteredProducts.length === 1
                      ? 'product'
                      : 'products'
                  }

                </Text>

              </View>

            </View>


            {/* =============================================
                NO RESULTS
            ============================================= */}

            {filteredProducts.length === 0 ? (

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
                    name="search-outline"
                    size={30}
                    color={COLORS.primary}
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
                  Try another product, category or brand
                </Text>

              </View>

            ) : (

              /* =========================================
                 PRODUCTS
              ========================================= */

              <View
                style={
                  styles.productsGrid
                }
              >

                {filteredProducts.map(
                  product => {

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
                                styles.image
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
                                size={38}
                                color={COLORS.primary}
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


                        {/* PRODUCT INFO */}

                        <View
                          style={
                            styles.productInfo
                          }
                        >

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

                          {brandName ? (

                            <Text
                              style={
                                styles.productBrand
                              }

                              numberOfLines={1}
                            >
                              {brandName}
                            </Text>

                          ) : null}


                          {/* CATEGORY */}

                          {categoryName ? (

                            <Text
                              style={
                                styles.productCategory
                              }

                              numberOfLines={1}
                            >
                              {categoryName}
                            </Text>

                          ) : null}


                          {/* PRICE */}

                          {product.price !== undefined && (

                            hasDiscount ? (

                              <View
                                style={
                                  styles.priceContainer
                                }
                              >

                                <Text
                                  style={
                                    styles.oldPrice
                                  }
                                >
                                  {formatUSD(
                                    originalPrice
                                  )}
                                </Text>


                                <Text
                                  style={
                                    styles.productPrice
                                  }
                                >
                                  {formatUSD(
                                    finalPrice
                                  )}
                                </Text>

                              </View>

                            ) : (

                              <Text
                                style={
                                  styles.productPrice
                                }
                              >
                                {formatUSD(
                                  originalPrice
                                )}
                              </Text>

                            )

                          )}

                        </View>

                      </Pressable>

                    );

                  }
                )}

              </View>

            )}

          </>

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

    /* =====================================================
       MAIN
    ===================================================== */

    container: {
      flex: 1,
      paddingTop:20,
      backgroundColor:
        '#F7F3EC',
    },

    scrollContent: {
      paddingHorizontal: 18,

      paddingTop: 19,

      paddingBottom: 25,
    },


    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      flexDirection: 'row',

      alignItems: 'center',

      marginBottom: 19,
    },

    backButton: {
      width: 44,

      height: 44,

      borderRadius: 14,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E6DED2',

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 13,

      shadowColor: '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.08,

      shadowRadius: 8,

      elevation: 3,
    },

    title: {
      fontSize: 28,

      fontWeight: '900',

      color:
        '#171717',

      letterSpacing: -0.7,
    },


    /* =====================================================
       SEARCH BAR
    ===================================================== */

    searchContainer: {
      height: 56,

      backgroundColor:
        '#FFFFFF',

      borderRadius: 18,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 10,

      shadowColor: '#171717',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.07,

      shadowRadius: 9,

      elevation: 3,
    },

    searchIconContainer: {
      width: 39,

      height: 39,

      borderRadius: 13,

      backgroundColor:
        '#F8F2EA',

      alignItems: 'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        '#EEE4D7',
    },

    searchInput: {
      flex: 1,

      height: 54,

      paddingHorizontal: 10,

      color:
        '#171717',

      fontSize: 14,

      fontWeight: '600',
    },

    clearButton: {
      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor:
        '#F2EEE8',

      alignItems: 'center',

      justifyContent:
        'center',
    },


    /* =====================================================
       START
    ===================================================== */

    startContainer: {
      alignItems: 'center',

      justifyContent:
        'center',

      paddingHorizontal: 20,

      paddingVertical: 95,
    },

    startIcon: {
      width: 78,

      height: 78,

      borderRadius: 24,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E6DED2',

      alignItems: 'center',

      justifyContent:
        'center',

      marginBottom: 20,

      shadowColor: '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.07,

      shadowRadius: 10,

      elevation: 3,
    },

    startTitle: {
      fontSize: 19,

      fontWeight: '900',

      color:
        '#171717',

      textAlign: 'center',

      letterSpacing: -0.3,
    },

    startText: {
      marginTop: 7,

      fontSize: 13,

      color:
        '#777168',

      textAlign: 'center',

      lineHeight: 19,
    },


    /* =====================================================
       RESULTS
    ===================================================== */

    resultsHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      marginTop: 27,

      marginBottom: 14,
    },

    sectionTitle: {
      fontSize: 20,

      fontWeight: '900',

      color:
        '#171717',

      letterSpacing: -0.4,
    },

    resultsCountContainer: {
      paddingHorizontal: 10,

      paddingVertical: 5,

      borderRadius: 10,

      backgroundColor:
        '#F8F2EA',

      borderWidth: 1,

      borderColor:
        '#EEE4D7',
    },

    resultsCount: {
      fontSize: 11,

      color:
        '#E35B3F',

      fontWeight: '900',
    },


    /* =====================================================
       PRODUCTS
    ===================================================== */

    productsGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      justifyContent:
        'space-between',
    },

    productCard: {
      width: '48%',

      marginBottom: 16,

      backgroundColor:
        '#FFFFFF',

      borderRadius: 20,

      borderWidth: 1,

      borderColor:
        '#E7DED1',

      overflow: 'hidden',

      position: 'relative',

      shadowColor: '#171717',

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity: 0.08,

      shadowRadius: 11,

      elevation: 3,
    },

    productImage: {
      height: 150,

      margin: 8,

      borderRadius: 16,

      backgroundColor:
        '#FFFFFF',

      alignItems: 'center',

      justifyContent:
        'center',

      overflow: 'hidden',
    },

    image: {
      width: '91%',

      height: '91%',
    },

    imagePlaceholder: {
      width: 60,

      height: 60,

      borderRadius: 20,

      backgroundColor:
        '#F8F2EA',

      borderWidth: 1,

      borderColor:
        '#EEE4D7',

      alignItems: 'center',

      justifyContent:
        'center',
    },

    discountBadge: {
      position: 'absolute',

      top: 15,

      left: 15,

      backgroundColor:
        '#E35B3F',

      paddingHorizontal: 8,

      paddingVertical: 6,

      borderRadius: 8,

      zIndex: 5,

      shadowColor: '#E35B3F',

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.16,

      shadowRadius: 5,

      elevation: 3,
    },

    discountBadgeText: {
      color:
        '#FFFFFF',

      fontSize: 9,

      fontWeight: '900',

      letterSpacing: 0.2,
    },


    /* =====================================================
       PRODUCT INFO
    ===================================================== */

    productInfo: {
      paddingHorizontal: 11,

      paddingTop: 3,

      paddingBottom: 13,
    },

    productName: {
      fontSize: 14,

      fontWeight: '800',

      color:
        '#24221E',

      lineHeight: 19,
    },

    productBrand: {
      marginTop: 5,

      fontSize: 11,

      color:
        '#E35B3F',

      fontWeight: '800',
    },

    productCategory: {
      marginTop: 3,

      fontSize: 11,

      color:
        '#9A9186',

      fontWeight: '600',
    },


    /* =====================================================
       PRICE
    ===================================================== */

    priceContainer: {
      marginTop: 9,
    },

    oldPrice: {
      fontSize: 10,

      color:
        '#9C968D',

      textDecorationLine:
        'line-through',

      fontWeight: '600',

      marginBottom: 2,
    },

    productPrice: {
      marginTop: 8,

      fontSize: 16,

      fontWeight: '900',

      color:
        '#171717',
    },


    /* =====================================================
       EMPTY
    ===================================================== */

    emptyContainer: {
      alignItems: 'center',

      justifyContent:
        'center',

      paddingHorizontal: 25,

      paddingVertical: 75,
    },

    emptyIcon: {
      width: 72,

      height: 72,

      borderRadius: 22,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E6DED2',

      alignItems: 'center',

      justifyContent:
        'center',

      marginBottom: 17,

      shadowColor: '#171717',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.07,

      shadowRadius: 10,

      elevation: 3,
    },

    emptyTitle: {
      fontSize: 18,

      fontWeight: '900',

      color:
        '#171717',

      textAlign: 'center',
    },

    emptyText: {
      marginTop: 7,

      fontSize: 13,

      color:
        '#777168',

      textAlign: 'center',

      lineHeight: 19,
    },

  });

