import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  TextInput,
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


// ============================================================
// API
// ============================================================

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';


// ============================================================
// CONSTANTS
// ============================================================

const MINIMUM_ORDER = 150;


// ============================================================
// TYPES
// ============================================================

type BackendProduct = {
  _id: string;

  name: string;

  description?: string;

  price?: number;

  discount?: number;

  discountedPrice?: number;

  image?: string;

  category?: {
    _id?: string;
    name?: string;
  };

  brand?: {
    _id?: string;
    name?: string;
  };

  availability?: boolean;
};


type CartItem = {
  product: BackendProduct;

  quantity: number;

  price: number;
};


// ============================================================
// IMAGE URL
// ============================================================

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


  // Remove starting slashes
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


  // Default old image format
  return `${API_URL}/uploads/${value}`;

};


// ============================================================
// CART
// ============================================================

export default function Cart() {

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    cart,
    setCart,
  ] = useState<CartItem[]>([]);


  /*
   * This is NOT a loading screen.
   *
   * It only tells us whether the first
   * request has finished.
   *
   * We keep the UI visible while refreshing.
   */
  const [
    hasLoadedOnce,
    setHasLoadedOnce,
  ] = useState(false);


  const [
    updatingProduct,
    setUpdatingProduct,
  ] = useState<string | null>(null);


  const [
    manualQuantities,
    setManualQuantities,
  ] = useState<Record<string, string>>({});


  /*
   * Keep token in memory.
   *
   * This prevents unnecessary AsyncStorage
   * reads when the user presses + / - / Remove.
   */
  const accessTokenRef =
    useRef<string | null>(null);


  // ==========================================================
  // GET ACCESS TOKEN
  // ==========================================================

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


  // ==========================================================
  // FORMAT PRICE
  // ==========================================================

  const formatPrice =
    useCallback(
      (price: number) => {

        const safePrice =
          Number(price) || 0;


        return `$${safePrice.toFixed(2)}`;

      },
      []
    );


  // ==========================================================
  // APPLY CART DATA
  // ==========================================================

  const applyCartData =
    useCallback(
      (
        items: CartItem[]
      ) => {

        setCart(
          items
        );


        const quantities:
          Record<string, string> = {};


        items.forEach(
          item => {

            const productId =
              item.product?._id;


            if (!productId) {
              return;
            }


            quantities[
              productId
            ] =
              String(
                item.quantity
              );

          }
        );


        setManualQuantities(
          quantities
        );

      },
      []
    );


  // ==========================================================
  // LOAD CART
  // ==========================================================

  const loadCart =
    useCallback(
      async () => {

        try {

          const accessToken =
            await getAccessToken();


          if (!accessToken) {

            accessTokenRef.current =
              null;


            setCart([]);


            setManualQuantities({});


            setHasLoadedOnce(
              true
            );


            router.replace(
              '/login'
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


          // ==================================================
          // SESSION EXPIRED
          // ==================================================

          if (
            response.status === 401 ||
            response.status === 403
          ) {

            accessTokenRef.current =
              null;


            setCart([]);


            setManualQuantities({});


            setHasLoadedOnce(
              true
            );


            router.replace(
              '/login'
            );


            return;

          }


          // ==================================================
          // BACKEND ERROR
          // ==================================================

          if (!response.ok) {

            console.log(
              'GET CART ERROR:',
              data
            );


            /*
             * Do NOT immediately show
             * "cart is empty".
             *
             * If there is already data on screen,
             * keep it.
             */

            setHasLoadedOnce(
              true
            );


            return;

          }


          // ==================================================
          // CART ITEMS
          // ==================================================

          const items:
            CartItem[] =
            Array.isArray(
              data?.cart?.items
            )
              ? data.cart.items
              : [];


          applyCartData(
            items
          );


          setHasLoadedOnce(
            true
          );


        } catch (error) {

          console.log(
            'LOAD CART ERROR:',
            error
          );


          /*
           * Do not erase existing cart
           * just because refresh failed.
           */

          setHasLoadedOnce(
            true
          );

        }

      },
      [
        getAccessToken,
        applyCartData,
      ]
    );


  // ==========================================================
  // LOAD WHEN PAGE FOCUSES
  // ==========================================================

  useFocusEffect(
    useCallback(() => {

      loadCart();

    }, [
      loadCart,
    ])
  );


  // ==========================================================
  // UPDATE CART ON BACKEND
  // ==========================================================

  const updateCartOnBackend =
    useCallback(
      async (
        productId: string,
        quantity: number
      ) => {

        try {

          const accessToken =
            await getAccessToken();


          if (!accessToken) {

            router.replace(
              '/login'
            );


            return false;

          }


          const response =
            await fetch(
              `${API_URL}/cart/update`,
              {
                method: 'PUT',

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
                    quantity,
                  }),

              }
            );


          const data =
            await response.json();


          // ==================================================
          // SESSION EXPIRED
          // ==================================================

          if (
            response.status === 401 ||
            response.status === 403
          ) {

            accessTokenRef.current =
              null;


            router.replace(
              '/login'
            );


            return false;

          }


          // ==================================================
          // ERROR
          // ==================================================

          if (!response.ok) {

            console.log(
              'UPDATE CART ERROR:',
              data
            );


            return false;

          }


          // ==================================================
          // UPDATE LOCAL CART
          // ==================================================

          if (data?.cart) {

            const updatedItems:
              CartItem[] =
              Array.isArray(
                data.cart.items
              )
                ? data.cart.items
                : [];


            applyCartData(
              updatedItems
            );

          }


          return true;

        } catch (error) {

          console.log(
            'UPDATE CART ERROR:',
            error
          );


          return false;

        }

      },
      [
        getAccessToken,
        applyCartData,
      ]
    );


  // ==========================================================
  // UPDATE QUANTITY
  // ==========================================================

  const updateQuantity =
    async (
      productId: string,
      change: number
    ) => {

      if (
        updatingProduct ===
        productId
      ) {

        return;

      }


      const currentItem =
        cart.find(
          item =>
            item.product?._id ===
            productId
        );


      if (!currentItem) {

        return;

      }


      const newQuantity =
        currentItem.quantity +
        change;


      // ======================================================
      // REMOVE WHEN QUANTITY BECOMES 0
      // ======================================================

      if (
        newQuantity < 1
      ) {

        await removeProduct(
          productId
        );


        return;

      }


      // ======================================================
      // OPTIMISTIC UI UPDATE
      // ======================================================

      setCart(
        previous =>
          previous.map(
            item => {

              if (
                item.product?._id !==
                productId
              ) {

                return item;

              }


              return {
                ...item,

                quantity:
                  newQuantity,

              };

            }
          )
      );


      setManualQuantities(
        previous => ({
          ...previous,

          [productId]:
            String(
              newQuantity
            ),

        })
      );


      setUpdatingProduct(
        productId
      );


      const success =
        await updateCartOnBackend(
          productId,
          newQuantity
        );


      if (!success) {

        await loadCart();

      }


      setUpdatingProduct(
        null
      );

    };


  // ==========================================================
  // MANUAL QUANTITY CHANGE
  // ==========================================================

  const handleManualQuantityChange =
    (
      productId: string,
      value: string
    ) => {

      const numbersOnly =
        value.replace(
          /[^0-9]/g,
          ''
        );


      setManualQuantities(
        previous => ({
          ...previous,

          [productId]:
            numbersOnly,

        })
      );

    };


  // ==========================================================
  // MANUAL QUANTITY SUBMIT
  // ==========================================================

  const handleManualQuantitySubmit =
    async (
      productId: string
    ) => {

      if (
        updatingProduct ===
        productId
      ) {

        return;

      }


      const typedValue =
        manualQuantities[
          productId
        ];


      const quantity =
        Number(
          typedValue
        );


      // ======================================================
      // INVALID / EMPTY
      // ======================================================

      if (
        !typedValue ||
        !Number.isFinite(
          quantity
        ) ||
        quantity < 1
      ) {

        await removeProduct(
          productId
        );


        return;

      }


      const currentItem =
        cart.find(
          item =>
            item.product?._id ===
            productId
        );


      // ======================================================
      // NOTHING CHANGED
      // ======================================================

      if (
        currentItem &&
        currentItem.quantity ===
          quantity
      ) {

        setManualQuantities(
          previous => ({
            ...previous,

            [productId]:
              String(
                quantity
              ),

          })
        );


        return;

      }


      // ======================================================
      // OPTIMISTIC UPDATE
      // ======================================================

      setCart(
        previous =>
          previous.map(
            item => {

              if (
                item.product?._id !==
                productId
              ) {

                return item;

              }


              return {
                ...item,

                quantity,

              };

            }
          )
      );


      setUpdatingProduct(
        productId
      );


      const success =
        await updateCartOnBackend(
          productId,
          quantity
        );


      if (!success) {

        await loadCart();

      }


      setUpdatingProduct(
        null
      );

    };


  // ==========================================================
  // REMOVE PRODUCT
  // ==========================================================

  const removeProduct =
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
            `${API_URL}/cart/remove`,
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


        // ====================================================
        // SESSION EXPIRED
        // ====================================================

        if (
          response.status === 401 ||
          response.status === 403
        ) {

          accessTokenRef.current =
            null;


          router.replace(
            '/login'
          );


          return;

        }


        // ====================================================
        // ERROR
        // ====================================================

        if (!response.ok) {

          console.log(
            'REMOVE PRODUCT ERROR:',
            data
          );


          return;

        }


        // ====================================================
        // UPDATE CART
        // ====================================================

        if (data?.cart) {

          const updatedItems:
            CartItem[] =
            Array.isArray(
              data.cart.items
            )
              ? data.cart.items
              : [];


          applyCartData(
            updatedItems
          );

        } else {

          setCart([]);


          setManualQuantities({});

        }


      } catch (error) {

        console.log(
          'REMOVE PRODUCT ERROR:',
          error
        );

      } finally {

        setUpdatingProduct(
          null
        );

      }

    };


  // ==========================================================
  // TOTAL
  // ==========================================================

  const total =
    cart.reduce(
      (
        sum,
        item
      ) => {

        const price =
          Number(
            item.price
          ) || 0;


        const quantity =
          Number(
            item.quantity
          ) || 0;


        return (
          sum +
          price *
          quantity
        );

      },
      0
    );


  // ==========================================================
  // CHECKOUT
  // ==========================================================

  const canCheckout =
    total >=
    MINIMUM_ORDER;


  const remainingAmount =
    Math.max(
      MINIMUM_ORDER -
        total,
      0
    );


  const handleCheckout =
    () => {

      if (
        !canCheckout
      ) {

        return;

      }


      router.push(
        '/checkout'
      );

    };


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <View
      style={
        styles.container
      }
    >

      {/* ====================================================
          HEADER
      ==================================================== */}

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
            router.replace('/')
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
          Your Cart
        </Text>

      </View>


      {/* ====================================================
          EMPTY CART
      ==================================================== */}

      {hasLoadedOnce &&
      cart.length === 0 ? (

        <View
          style={
            styles.emptyContainer
          }
        >

          <Ionicons
            name="cart-outline"
            size={55}
            color="#D4AF37"
          />


          <Text
            style={
              styles.emptyTitle
            }
          >
            Your cart is empty
          </Text>


          <Text
            style={
              styles.emptySubtitle
            }
          >
            Add some products to your cart
          </Text>


          <Pressable
            style={
              styles.shopButton
            }

            onPress={() =>
              router.replace('/')
            }
          >

            <Text
              style={
                styles.shopButtonText
              }
            >
              Continue Shopping
            </Text>

          </Pressable>

        </View>

      ) : (

        /* ==================================================
           CART CONTENT
        ================================================== */

        <>

          <ScrollView
            showsVerticalScrollIndicator={
              false
            }

            contentContainerStyle={
              styles.scrollContent
            }
          >

            {cart.map(
              (
                item,
                index
              ) => {

                const product =
                  item.product;


                if (!product?._id) {
                  return null;
                }


                const productId =
                  product._id;


                const imageUrl =
                  getImageUrl(
                    product.image
                  );


                const itemUpdating =
                  updatingProduct ===
                  productId;


                const uniqueKey =
                  `${productId}-${index}`;


                const originalPrice =
                  Number(
                    product.price
                  ) || 0;


                const discount =
                  Number(
                    product.discount
                  ) || 0;


                const cartPrice =
                  Number(
                    item.price
                  ) || 0;


                const manualValue =
                  manualQuantities[
                    productId
                  ] ??
                  String(
                    item.quantity
                  );


                return (

                  <View
                    key={
                      uniqueKey
                    }

                    style={
                      styles.productCard
                    }
                  >

                    {/* ========================================
                        IMAGE
                    ======================================== */}

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

                        <Ionicons
                          name="cube-outline"
                          size={40}
                          color="#D4AF37"
                        />

                      )}

                    </View>


                    {/* ========================================
                        INFO
                    ======================================== */}

                    <View
                      style={
                        styles.info
                      }
                    >

                      {/* NAME */}

                      <Text
                        style={
                          styles.name
                        }

                        numberOfLines={2}
                      >
                        {
                          product.name
                        }
                      </Text>


                      {/* CATEGORY */}

                      <Text
                        style={
                          styles.category
                        }

                        numberOfLines={1}
                      >
                        {
                          product.category?.name ||
                          ''
                        }
                      </Text>


                      {/* PRICE */}

                      <View
                        style={
                          styles.priceRow
                        }
                      >

                        <Text
                          style={
                            styles.price
                          }
                        >
                          {
                            formatPrice(
                              cartPrice
                            )
                          }
                        </Text>


                        {discount > 0 &&
                        originalPrice >
                          cartPrice && (

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

                        )}

                      </View>


                      {/* DISCOUNT */}

                      {discount > 0 &&
                      originalPrice >
                        cartPrice && (

                        <Text
                          style={
                            styles.discountText
                          }
                        >
                          {discount}% OFF
                        </Text>

                      )}


                      {/* QUANTITY */}

                      <View
                        style={
                          styles.quantityRow
                        }
                      >

                        {/* MINUS */}

                        <Pressable
                          style={[
                            styles.quantityButton,

                            itemUpdating &&
                              styles.quantityButtonDisabled,
                          ]}

                          onPress={() =>
                            updateQuantity(
                              productId,
                              -1
                            )
                          }

                          disabled={
                            itemUpdating
                          }
                        >

                          <Text
                            style={
                              styles.quantityButtonText
                            }
                          >
                            −
                          </Text>

                        </Pressable>


                        {/* INPUT */}

                        <TextInput
                          value={
                            manualValue
                          }

                          onChangeText={
                            value =>
                              handleManualQuantityChange(
                                productId,
                                value
                              )
                          }

                          onBlur={() =>
                            handleManualQuantitySubmit(
                              productId
                            )
                          }

                          onSubmitEditing={() =>
                            handleManualQuantitySubmit(
                              productId
                            )
                          }

                          keyboardType="number-pad"

                          returnKeyType="done"

                          selectTextOnFocus

                          editable={
                            !itemUpdating
                          }

                          style={
                            styles.quantityInput
                          }
                        />


                        {/* PLUS */}

                        <Pressable
                          style={[
                            styles.quantityButton,

                            itemUpdating &&
                              styles.quantityButtonDisabled,
                          ]}

                          onPress={() =>
                            updateQuantity(
                              productId,
                              1
                            )
                          }

                          disabled={
                            itemUpdating
                          }
                        >

                          <Text
                            style={
                              styles.quantityButtonText
                            }
                          >
                            +
                          </Text>

                        </Pressable>

                      </View>


                      {/* REMOVE */}

                      <Pressable
                        style={
                          styles.removeButton
                        }

                        onPress={() =>
                          removeProduct(
                            productId
                          )
                        }

                        disabled={
                          itemUpdating
                        }
                      >

                        <Text
                          style={
                            styles.removeText
                          }
                        >
                          Remove
                        </Text>

                      </Pressable>

                    </View>

                  </View>

                );

              }
            )}


            {/* ==================================================
                BOTTOM SPACE
            ================================================== */}

            <View
              style={
                styles.bottomSpace
              }
            />

          </ScrollView>


          {/* ==================================================
              TOTAL
          ================================================== */}

          {cart.length > 0 && (

            <View
              style={
                styles.totalContainer
              }
            >

              {/* TOTAL ROW */}

              <View
                style={
                  styles.totalRow
                }
              >

                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  Total
                </Text>


                <Text
                  style={
                    styles.totalPrice
                  }
                >
                  {
                    formatPrice(
                      total
                    )
                  }
                </Text>

              </View>


              {/* MINIMUM ORDER */}

              {!canCheckout && (

                <View
                  style={
                    styles.minimumBox
                  }
                >

                  <Text
                    style={
                      styles.minimumText
                    }
                  >
                    Minimum order:{' '}
                    {
                      formatPrice(
                        MINIMUM_ORDER
                      )
                    }
                  </Text>


                  <Text
                    style={
                      styles.remainingText
                    }
                  >
                    Add{' '}
                    {
                      formatPrice(
                        remainingAmount
                      )
                    }{' '}
                    more to checkout
                  </Text>

                </View>

              )}


              {/* READY */}

              {canCheckout && (

                <Text
                  style={
                    styles.readyText
                  }
                >
                  Minimum order reached ✓
                </Text>

              )}


              {/* CHECKOUT */}

              <Pressable
                style={[
                  styles.checkoutButton,

                  !canCheckout &&
                    styles.checkoutButtonDisabled,
                ]}

                onPress={
                  handleCheckout
                }

                disabled={
                  !canCheckout
                }
              >

                <Text
                  style={
                    styles.checkoutButtonText
                  }
                >
                  Checkout
                </Text>

              </Pressable>

            </View>

          )}

        </>

      )}

    </View>

  );

}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

  // ==========================================================
  // CONTAINER
  // ==========================================================

  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 20,
    paddingTop: 40,
  },


  // ==========================================================
  // HEADER
  // ==========================================================

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


  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
  },


  // ==========================================================
  // EMPTY CART
  // ==========================================================

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },


  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },


  emptySubtitle: {
    marginTop: 7,
    fontSize: 13,
    color: '#888888',
  },


  shopButton: {
    marginTop: 22,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },


  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },


  // ==========================================================
  // SCROLL
  // ==========================================================

  scrollContent: {
    paddingBottom: 15,
  },


  bottomSpace: {
    height: 10,
  },


  // ==========================================================
  // PRODUCT CARD
  // ==========================================================

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 13,
  },


  // ==========================================================
  // IMAGE
  // ==========================================================

  image: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },


  productImage: {
    width: '100%',
    height: '100%',
  },


  // ==========================================================
  // PRODUCT INFO
  // ==========================================================

  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    minWidth: 0,
  },


  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },


  category: {
    marginTop: 4,
    fontSize: 12,
    color: '#888888',
  },


  // ==========================================================
  // PRICE
  // ==========================================================

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },


  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },


  oldPrice: {
    marginLeft: 8,
    fontSize: 12,
    color: '#999999',
    textDecorationLine: 'line-through',
  },


  discountText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: '#D4AF37',
  },


  // ==========================================================
  // QUANTITY
  // ==========================================================

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },


  quantityButton: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },


  quantityButtonDisabled: {
    opacity: 0.55,
  },


  quantityButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },


  quantityInput: {
    width: 50,
    height: 35,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    paddingVertical: 0,
    paddingHorizontal: 5,
  },


  // ==========================================================
  // REMOVE
  // ==========================================================

  removeButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },


  removeText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },


  // ==========================================================
  // TOTAL
  // ==========================================================

  totalContainer: {
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#F7F7F7',
  },


  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },


  totalLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },


  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
  },


  // ==========================================================
  // MINIMUM ORDER
  // ==========================================================

  minimumBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },


  minimumText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },


  remainingText: {
    marginTop: 5,
    textAlign: 'center',
    fontSize: 13,
    color: '#888888',
  },


  readyText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#D4AF37',
  },


  // ==========================================================
  // CHECKOUT
  // ==========================================================

  checkoutButton: {
    marginTop: 16,
    backgroundColor: '#D4AF37',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },


  checkoutButtonDisabled: {
    backgroundColor: '#D0D0D0',
  },


  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

});
