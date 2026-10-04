import { useShopping } from '../hooks/use-shopping';

import { CartButton } from '../components/cart-button';

import { getFinalPrice } from '../services/product-price';
import { AddToCartButton } from '../components/add-to-cart-button';
import { ProductImage } from '../components/product-image';
import { ImageFrame } from '../services/image-frame';

import { request } from '../services/request';
import {
  View,
  Alert,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { memo, useCallback, useRef, useState } from 'react';
import { getValidAccessToken } from '../services/authService';
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
  imageFrame?: ImageFrame | null;
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
type SubCategory = {
  _id: string;
  name: string;
  department?: {
    _id?: string;
    name?: string;
  } | string | null;
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
  onToggle: () => void;
  initialFavorite: boolean;
};
const FavoriteButton = memo(({ initialFavorite, onToggle }: FavoriteButtonProps) =>
        <Pressable style={[styles.favoriteButton, initialFavorite && styles.favoriteButtonActive]} hitSlop={5}
          accessibilityRole="button" accessibilityState={{ selected: initialFavorite }} onPress={onToggle}>
          <Ionicons name={initialFavorite ? 'heart' : 'heart-outline'} size={20} color={initialFavorite ? '#E35B3F' : '#171717'} />
        </Pressable>);
/* =========================================================
   DEPARTMENT CATEGORIES
========================================================= */
export default function DepartmentCategories() {
  const params =
    useLocalSearchParams<{
      id?: string;
      name?: string;
    }>();

  const departmentId =
    typeof params.id === 'string'
      ? params.id
      : '';

  const departmentName =
    typeof params.name === 'string'
      ? params.name
      : 'Category';
  return <DepartmentCategoriesScreen key={departmentId} departmentId={departmentId} departmentName={departmentName} />;
}

function DepartmentCategoriesScreen({ departmentId, departmentName }: { departmentId: string; departmentName: string }) {
  const shopping = useShopping();


  /* =======================================================
     STATES
  ======================================================= */
  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);
  const [
    subCategories,
    setSubCategories,
  ] = useState<SubCategory[]>([]);
  const [
    selectedSubCategory,
    setSelectedSubCategory,
  ] = useState<string>('ALL');
  const [
    loadingSubCategories,
    setLoadingSubCategories,
  ] = useState(false);
  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(true);
  const favorites = shopping.favorites.map(p => String(p._id || p.id));
  const [
    isLoggedIn,
    setIsLoggedIn,
  ] = useState(false);

  const { showAlert, feedback } = shopping;
  /* =======================================================
     CHECK LOGIN
  ======================================================= */
  const checkLogin = async () => {
    try {
      const accessToken =
        await getValidAccessToken();
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
      if (__DEV__) { console.log(
        'CHECK LOGIN ERROR:',
        error
      ); }
      throw error;
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
        await getValidAccessToken();
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
        await request(
          `${API_URL}/products`,
          {
            method: 'GET',
            headers,
          }
        );
      const data =
        await response.json();
      if (!response.ok) {
        if (__DEV__) { console.log(
          'GET PRODUCTS ERROR:',
          data
        ); }
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
      if (__DEV__) { console.log(
        'PRODUCTS FROM DATABASE:',
        receivedProducts.length
      ); }
      setProducts(
        receivedProducts
      );
    } catch (error) {
      if (__DEV__) { console.log(
        'LOAD PRODUCTS ERROR:',
        error
      ); }
    } finally {
      setLoadingProducts(
        false
      );
    }
  };
  /* =======================================================
     LOAD SUBCATEGORIES
     Backend Category = visible Sub Category
  ======================================================= */
  const loadSubCategories = async () => {
    if (!departmentId) {
      setSubCategories([]);
      setSelectedSubCategory('ALL');
      setLoadingSubCategories(false);
      return;
    }

    try {
      setLoadingSubCategories(true);

      const response = await request(
        `${API_URL}/departments/${encodeURIComponent(
          departmentId
        )}/categories`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (__DEV__) {
          console.log(
            'GET DEPARTMENT CATEGORIES ERROR:',
            data
          );
        }
        setSubCategories([]);
        setSelectedSubCategory('ALL');
        return;
      }

      const receivedSubCategories =
        Array.isArray(data?.categories)
          ? data.categories
          : Array.isArray(data)
            ? data
            : [];

      setSubCategories(
        receivedSubCategories
          .slice()
          .sort(
            (a: SubCategory, b: SubCategory) =>
              a.name.localeCompare(b.name)
          )
      );
      setSelectedSubCategory('ALL');
    } catch (error) {
      if (__DEV__) {
        console.log(
          'LOAD SUBCATEGORIES ERROR:',
          error
        );
      }
      setSubCategories([]);
      setSelectedSubCategory('ALL');
    } finally {
      setLoadingSubCategories(false);
    }
  };

  /* =======================================================
     LOAD CART
  ======================================================= */

  const loadCart = async () => { await shopping.refresh(); };
  /* =======================================================
     LOAD FAVORITES
  ======================================================= */
  const loadFavorites = async () => { await shopping.refresh(); };
  /* =======================================================
     LOAD EVERYTHING
  ======================================================= */
  const loadData = async () => {
    const loginPromise =
      checkLogin().catch(() => Alert.alert('Connection Error', 'Could not verify your session. Please try again.'));
    const productsPromise =
      loadProducts();
    const subCategoriesPromise =
      loadSubCategories();
    const cartPromise =
      loadCart();
    const favoritesPromise =
      loadFavorites();
    await Promise.all([
      loginPromise,
      productsPromise,
      subCategoriesPromise,
      cartPromise,
      favoritesPromise,
    ]);
  };
  /* =======================================================
     PAGE FOCUS
  ======================================================= */
  useFocusEffect(
    useCallback(() => {
      void loadData().catch(() => showAlert('Could not load cart and favorites. Please reopen this page to retry.', 'Connection Error'));
    }, [])
  );
  /* =======================================================
     FILTER + SORT PRODUCTS
     Department = visible Category
     Category   = visible Sub Category
  ======================================================= */
  const filteredProducts =
    (
      selectedSubCategory === 'ALL'
        ? products.filter(
            product => {
              const productCategoryId =
                typeof product.category === 'object'
                  ? product.category?._id
                  : product.category;

              return subCategories.some(
                subCategory =>
                  subCategory._id ===
                  productCategoryId
              );
            }
          )
        : products.filter(
            product => {
              const productCategoryId =
                typeof product.category === 'object'
                  ? product.category?._id
                  : product.category;

              return (
                productCategoryId ===
                selectedSubCategory
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
  const addToCart = (product: Product) => shopping.add(product);
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
  const pageTitle = departmentName;
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
      {feedback}
      {/* =================================================
          FAVORITE ALERT
          ONE PAGE-LEVEL ALERT ONLY
      ================================================= */}

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
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#171717"
            />
          </Pressable>
          <View style={styles.headerText}>
            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {pageTitle}
            </Text>
          </View>
          <CartButton />
        </View>
        {/* =================================================
            SUBCATEGORIES - TEXT TABS
        ================================================= */}
        {(loadingSubCategories ||
          subCategories.length > 0) ? (
          <View style={styles.subCategoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subCategoriesContent}
            >
              <Pressable
                style={styles.subCategoryTab}
                onPress={() => setSelectedSubCategory('ALL')}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.subCategoryTabText,
                    selectedSubCategory === 'ALL' &&
                      styles.subCategoryTabTextSelected,
                  ]}
                >
                  All
                </Text>
                {selectedSubCategory === 'ALL' && (
                  <View style={styles.subCategoryUnderline} />
                )}
              </Pressable>

              {subCategories.map(subCategory => {
                const selected =
                  selectedSubCategory === subCategory._id;

                return (
                  <Pressable
                    key={subCategory._id}
                    style={styles.subCategoryTab}
                    onPress={() =>
                      setSelectedSubCategory(subCategory._id)
                    }
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.subCategoryTabText,
                        selected &&
                          styles.subCategoryTabTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {subCategory.name}
                    </Text>
                    {selected && (
                      <View style={styles.subCategoryUnderline} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
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
              {selectedSubCategory === 'ALL'
                ? 'There are no products in this category yet.'
                : 'There are no products in this subcategory yet.'}
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
                        <ProductImage imageFrame={product.imageFrame}
                          source={{
                            uri:
                              imageUrl,
                          }}
                          style={
                            styles.productImageReal
                          }
                          resizeMode="contain"
                          onError={(event) => {
                            if (__DEV__) { console.log(
                              'PRODUCT IMAGE ERROR:',
                              product.name,
                              imageUrl,
                              event.error
                            ); }
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
                    <FavoriteButton onToggle={() => void shopping.toggle(product)}
                      initialFavorite={
                        favorite
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
                      <AddToCartButton name={product.name}
                        pending={shopping.pendingCart.has(product._id)} unavailable={isOutOfStock}
                        onPress={() => void addToCart(product)} />
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
    paddingTop: 20,
    backgroundColor: '#F7F3EC',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    shadowOpacity: 0.07,
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
    fontSize: 29,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.8,
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
  subCategoriesSection: {
    marginTop: 4,
    marginBottom: 20,
    marginHorizontal: -18,
  },

  subCategoriesContent: {
    paddingHorizontal: 18,
    paddingRight: 28,
    alignItems: 'flex-end',
    gap: 24,
  },

  subCategoryTab: {
    position: 'relative',
    paddingTop: 7,
    paddingBottom: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subCategoryTabText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#817B71',
  },

  subCategoryTabTextSelected: {
    color: '#E35B3F',
    fontWeight: '900',
  },

  subCategoryUnderline: {
    position: 'absolute',
    bottom: 1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#E35B3F',
  },

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
  productImageReal: { backgroundColor: '#FFFFFF',
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: { backgroundColor: '#FFFFFF',
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
