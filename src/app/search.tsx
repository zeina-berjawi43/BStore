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
              size={23}
              color="#000000"
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

          <Ionicons
            name="search-outline"
            size={21}
            color="#1A1A1A"
          />


          <TextInput
            value={
              searchText
            }

            onChangeText={
              setSearchText
            }

            placeholder="Search products, categories or brands..."

            placeholderTextColor="#888888"

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
            >

              <Ionicons
                name="close-circle"
                size={20}
                color="#1A1A1A"
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
                size={34}
                color="#D4AF37"
              />

            </View>


            <Text
              style={
                styles.startTitle
              }
            >
              Search by product, category or brand
            </Text>


            <Text
              style={
                styles.startText
              }
            >
              Search for products, categories or brands
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


              <Text
                style={
                  styles.resultsCount
                }
              >

                {filteredProducts.length}{' '}

                {
                  filteredProducts.length === 1
                    ? 'product'
                    : 'products'
                }

              </Text>

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
                    size={32}
                    color="#D4AF37"
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

                            <Ionicons
                              name="cube-outline"
                              size={45}
                              color="#D4AF37"
                            />

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

      backgroundColor:
        '#F7F7F7',
    },


    scrollContent: {
      paddingHorizontal: 20,

      paddingTop: 20,

      paddingBottom: 30,
    },


    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      flexDirection: 'row',

      alignItems: 'center',

      marginBottom: 20,
    },


    backButton: {
      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      alignItems: 'center',

      justifyContent:
        'center',

      marginRight: 12,
    },


    title: {
      fontSize: 28,

      fontWeight: '800',

      color: '#000000',
    },


    /* =====================================================
       SEARCH BAR
    ===================================================== */

    searchContainer: {
      height: 52,

      backgroundColor:
        '#FFFFFF',

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 15,
    },


    searchInput: {
      flex: 1,

      height: 50,

      paddingHorizontal: 10,

      color: '#000000',

      fontSize: 14,
    },


    /* =====================================================
       START
    ===================================================== */

    startContainer: {
      alignItems: 'center',

      justifyContent:
        'center',

      paddingVertical: 90,
    },


    startIcon: {
      width: 70,

      height: 70,

      borderRadius: 35,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      alignItems: 'center',

      justifyContent:
        'center',

      marginBottom: 18,
    },


    startTitle: {
      fontSize: 19,

      fontWeight: '800',

      color: '#000000',

      textAlign: 'center',
    },


    startText: {
      marginTop: 6,

      fontSize: 13,

      color: '#888888',

      textAlign: 'center',
    },


    /* =====================================================
       RESULTS
    ===================================================== */

    resultsHeader: {
      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'space-between',

      marginTop: 25,

      marginBottom: 13,
    },


    sectionTitle: {
      fontSize: 20,

      fontWeight: '800',

      color: '#000000',
    },


    resultsCount: {
      fontSize: 12,

      color: '#888888',
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

      marginBottom: 15,

      backgroundColor:
        '#FFFFFF',

      borderRadius: 17,

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      padding: 10,

      position: 'relative',
    },


    productImage: {
      height: 145,

      borderRadius: 14,

      backgroundColor:
        '#FFFFFF',

      alignItems: 'center',

      justifyContent:
        'center',

      overflow: 'hidden',
    },


    image: {
      width: '90%',

      height: '90%',
    },


    discountBadge: {
      position: 'absolute',

      top: 15,

      left: 15,

      backgroundColor:
        '#C62828',

      paddingHorizontal: 7,

      paddingVertical: 4,

      borderRadius: 7,

      zIndex: 5,
    },


    discountBadgeText: {
      color: '#FFFFFF',

      fontSize: 9,

      fontWeight: '800',
    },


    productName: {
      marginTop: 11,

      fontSize: 15,

      fontWeight: '700',

      color: '#000000',
    },


    productBrand: {
      marginTop: 4,

      fontSize: 12,

      color: '#D4AF37',

      fontWeight: '600',
    },


    productCategory: {
      marginTop: 4,

      fontSize: 12,

      color: '#888888',
    },


    /* =====================================================
       PRICE
    ===================================================== */

    priceContainer: {
      marginTop: 8,
    },


    oldPrice: {
      fontSize: 11,

      color: '#999999',

      textDecorationLine:
        'line-through',

      fontWeight: '600',

      marginBottom: 2,
    },


    productPrice: {
      fontSize: 16,

      fontWeight: '800',

      color: '#000000',
    },


    /* =====================================================
       EMPTY
    ===================================================== */

    emptyContainer: {
      alignItems: 'center',

      justifyContent:
        'center',

      paddingVertical: 70,
    },


    emptyIcon: {
      width: 65,

      height: 65,

      borderRadius: 33,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,

      borderColor:
        '#E0E0E0',

      alignItems: 'center',

      justifyContent:
        'center',
    },


    emptyTitle: {
      marginTop: 15,

      fontSize: 18,

      fontWeight: '700',

      color: '#000000',
    },


    emptyText: {
      marginTop: 6,

      fontSize: 13,

      color: '#888888',

      textAlign: 'center',
    },

  });
