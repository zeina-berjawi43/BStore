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

import { getValidAccessToken } from '../services/authService';


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


  const accessTokenRef =
    useRef<string | null>(null);


  // ==========================================================
  // GET ACCESS TOKEN
  // ==========================================================

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


          if (!response.ok) {

            console.log(
              'GET CART ERROR:',
              data
            );


            setHasLoadedOnce(
              true
            );


            return;

          }


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


          if (!response.ok) {

            console.log(
              'UPDATE CART ERROR:',
              data
            );


            return false;

          }


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


      if (
        newQuantity < 1
      ) {

        await removeProduct(
          productId
        );


        return;

      }


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


        if (!response.ok) {

          console.log(
            'REMOVE PRODUCT ERROR:',
            data
          );


          return;

        }


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
            size={22}
            color="#171717"
          />

        </Pressable>


        <View
          style={
            styles.headerTextContainer
          }
        >

          <Text
            style={
              styles.title
            }
          >
            Your Cart
          </Text>

          {cart.length > 0 && (

            <Text
              style={
                styles.itemCount
              }
            >
              {cart.length}{' '}
              {cart.length === 1
                ? 'item'
                : 'items'}
            </Text>

          )}

        </View>

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

          <View
            style={
              styles.emptyIconContainer
            }
          >

            <Ionicons
              name="cart-outline"
              size={48}
              color="#E35B3F"
            />

          </View>


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


            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
            />

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
                          size={38}
                          color="#E35B3F"
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

                      <View
                        style={
                          styles.nameRow
                        }
                      >

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

                      </View>


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
                            {discount}% OFF
                          </Text>

                        </View>

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

                          <Ionicons
                            name="remove"
                            size={17}
                            color="#FFFFFF"
                          />

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

                          <Ionicons
                            name="add"
                            size={17}
                            color="#FFFFFF"
                          />

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

                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#E35B3F"
                        />

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

              <View
                style={
                  styles.totalCard
                }
              >

                {/* TOTAL ROW */}

                <View
                  style={
                    styles.totalRow
                  }
                >

                  <View>

                    <Text
                      style={
                        styles.totalLabel
                      }
                    >
                      Total
                    </Text>

                    <Text
                      style={
                        styles.totalItems
                      }
                    >
                      {cart.length}{' '}
                      {cart.length === 1
                        ? 'product'
                        : 'products'}
                    </Text>

                  </View>


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

                    <View
                      style={
                        styles.minimumIcon
                      }
                    >

                      <Ionicons
                        name="information-circle-outline"
                        size={20}
                        color="#E35B3F"
                      />

                    </View>


                    <View
                      style={
                        styles.minimumContent
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

                  </View>

                )}


                {/* READY */}

                {canCheckout && (

                  <View
                    style={
                      styles.readyBox
                    }
                  >

                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color="#E35B3F"
                    />

                    <Text
                      style={
                        styles.readyText
                      }
                    >
                      Minimum order reached
                    </Text>

                  </View>

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


                  <Ionicons
                    name="arrow-forward"
                    size={19}
                    color="#FFFFFF"
                  />

                </Pressable>

              </View>

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
    backgroundColor: '#F7F3EC',
    paddingHorizontal: 18,
    paddingTop: 40,
  },


  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
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
    marginRight: 13,

    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },


  headerTextContainer: {
    justifyContent: 'center',
  },


  title: {
    fontSize: 29,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.8,
  },


  itemCount: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#817B71',
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


  emptyIconContainer: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED1',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },


  emptyTitle: {
    marginTop: 19,
    fontSize: 21,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.3,
  },


  emptySubtitle: {
    marginTop: 7,
    fontSize: 13,
    fontWeight: '500',
    color: '#817B71',
  },


  shopButton: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#171717',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    elevation: 3,
  },


  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 9,
  },


  // ==========================================================
  // SCROLL
  // ==========================================================

  scrollContent: {
    paddingBottom: 8,
  },


  bottomSpace: {
    height: 10,
  },


  // ==========================================================
  // PRODUCT CARD
  // ==========================================================

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E7DED1',
    marginBottom: 13,
    position: 'relative',

    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 2,
  },


  // ==========================================================
  // IMAGE
  // ==========================================================

  image: {
    width: 108,
    height: 108,
    borderRadius: 17,
    backgroundColor: '#F8F2EA',
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
    marginLeft: 13,
    justifyContent: 'center',
    minWidth: 0,
  },


  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },


  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: '#171717',
    lineHeight: 20,
    letterSpacing: -0.2,
  },


  category: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#817B71',
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
    fontSize: 17,
    fontWeight: '900',
    color: '#171717',
  },


  oldPrice: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#9A9186',
    textDecorationLine: 'line-through',
  },


  discountBadge: {
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#FFF7F3',
    borderWidth: 1,
    borderColor: '#F0CFC4',
  },


  discountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#E35B3F',
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
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
  },


  quantityButtonDisabled: {
    opacity: 0.5,
  },


  quantityInput: {
    width: 50,
    height: 34,
    marginHorizontal: 7,
    borderWidth: 1,
    borderColor: '#E6DED2',
    borderRadius: 11,
    backgroundColor: '#F8F2EA',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#171717',
    paddingVertical: 0,
    paddingHorizontal: 5,
  },


  // ==========================================================
  // REMOVE
  // ==========================================================

  removeButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },


  removeText: {
    marginLeft: 4,
    color: '#E35B3F',
    fontSize: 12,
    fontWeight: '700',
  },


  // ==========================================================
  // TOTAL CONTAINER
  // ==========================================================

  totalContainer: {
    marginHorizontal: -18,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#F7F3EC',
  },


  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E7DED1',

    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },


  // ==========================================================
  // TOTAL ROW
  // ==========================================================

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },


  totalLabel: {
    fontSize: 20,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.3,
  },


  totalItems: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: '#9A9186',
  },


  totalPrice: {
    fontSize: 25,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.5,
  },


  // ==========================================================
  // MINIMUM ORDER
  // ==========================================================

  minimumBox: {
    marginTop: 13,
    padding: 11,
    borderRadius: 15,
    backgroundColor: '#FFF7F3',
    borderWidth: 1,
    borderColor: '#F0CFC4',
    flexDirection: 'row',
    alignItems: 'center',
  },


  minimumIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },


  minimumContent: {
    flex: 1,
  },


  minimumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#24221E',
  },


  remainingText: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: '#817B71',
  },


  // ==========================================================
  // READY
  // ==========================================================

  readyBox: {
    marginTop: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },


  readyText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: '#E35B3F',
  },


  // ==========================================================
  // CHECKOUT
  // ==========================================================

  checkoutButton: {
    marginTop: 14,
    minHeight: 52,
    backgroundColor: '#E35B3F',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#E35B3F',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 3,
  },


  checkoutButtonDisabled: {
    backgroundColor: '#D8D3CB',
    shadowOpacity: 0,
    elevation: 0,
  },


  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginRight: 9,
  },

});