import { useActionDialog } from '../components/action-dialog';
import { useShopping } from '../hooks/use-shopping';
import { confirmShoppingClear } from '../services/confirm-shopping-clear';
import { shoppingState } from '../services/shopping-state';

import { useEffect } from 'react';
import { goBackOrHome } from '../services/navigation';
import { ProductImage } from '../components/product-image';
import { ImageFrame } from '../services/image-frame';

import { cartTotal } from '../services/cartPricing';
import { getSessionSnapshot } from '../services/tokenStorage';
import { deliverySummary } from '../services/delivery-pricing';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Keyboard,
} from 'react-native';



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
  imageFrame?: ImageFrame | null;

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
  const { alert: actionAlert, dialog } = useActionDialog({ showIcon: false });
  const shopping = useShopping();
  const MINIMUM_ORDER = shopping.minimum;

  // ==========================================================
  // STATE
  // ==========================================================

  const cart = shopping.cart as CartItem[];


  const hasLoadedOnce = shopping.ready;


  const [checkingOut, setCheckingOut] = useState(false);
  const checkoutInFlight = useRef(false);


  const [
    manualQuantities,
    setManualQuantities,
  ] = useState<Record<string, string>>({});


  const editingQuantity = useRef<string | null>(null);
  const quantityDraft = useRef<Record<string, string>>({});




  const loadRevision = useRef(0);
  const formatPrice = useCallback((price: number) => '$' + (Number(price) || 0).toFixed(2), []);
  const formatPrice2 = useCallback((price: number) => '$' + (Number(price) || 0).toFixed(0), []);

  const loadCart = useCallback(async () => { try { await shoppingState.refresh(true); } catch (error) { actionAlert('Cart unavailable', error instanceof Error ? error.message : 'Please retry.'); } }, [actionAlert]);

  useFocusEffect(useCallback(() => {
    void loadCart();
    return () => { loadRevision.current++; };
  }, [loadCart]));

  const mutateCart = (productId: string, quantity?: number) => quantity === undefined ? shopping.remove(productId) : shopping.quantity(productId, quantity);
  const removeProduct = (productId: string) => mutateCart(productId);
  const updateQuantity = (productId: string, change: number) => {
    const item = shoppingState.getSnapshot().cart.find(value => value.product._id === productId);
    if (!item) return; const quantity = item.quantity + change;
    delete quantityDraft.current[productId];
    setManualQuantities(previous => { const next = { ...previous }; delete next[productId]; return next; });
    return mutateCart(productId, quantity < 1 ? undefined : quantity);
  };
  const handleManualQuantityChange = (productId: string, value: string) => { quantityDraft.current[productId] = value; setManualQuantities(previous => ({ ...previous, [productId]: value })); };
  const handleManualQuantitySubmit = async (productId: string) => {
    editingQuantity.current = null;
    const value = quantityDraft.current[productId];
    if (value === undefined) return; // Blur and keyboard-hide can both fire.
    delete quantityDraft.current[productId];
    setManualQuantities(previous => { const next = { ...previous }; delete next[productId]; return next; });
    const quantity = Number(value);
    const current = shoppingState.getSnapshot().cart.find(item => item.product?._id === productId)?.quantity;
    if (!value?.trim() || !Number.isSafeInteger(quantity) || quantity < 1) {
      setManualQuantities(previous => ({ ...previous, [productId]: String(current ?? 1) }));
      actionAlert('Invalid quantity', 'Enter a whole number of at least 1. Use remove to delete an item.');
      return;
    }
    if (quantity !== current) await mutateCart(productId, quantity);
  };
  const acceptQuantity = useRef(handleManualQuantitySubmit);
  useEffect(() => { acceptQuantity.current = handleManualQuantitySubmit; }, [handleManualQuantitySubmit]);
  useEffect(() => {
    const listener = Keyboard.addListener('keyboardDidHide', () => { const id = editingQuantity.current; if (id) void acceptQuantity.current(id); });
    return () => listener.remove();
  }, []);

  // ==========================================================
  // TOTAL
  // ==========================================================

  const total =
    cartTotal(cart);
  const delivery = deliverySummary(total, shopping.deliveryRules, MINIMUM_ORDER);
  const showClassC = delivery.classC && getSessionSnapshot().authenticated;
  const progress = showClassC ? <View style={styles.progressBox}>
    <View style={styles.progressLabels}><Text style={styles.progressLabel}>$0</Text><Text style={styles.progressLabel}>Minimum {formatPrice2(shopping.deliveryRules!.minimumCheckoutAmount)}</Text><Text style={styles.progressLabel}>Free Delivery {formatPrice2(shopping.deliveryRules!.freeDeliveryThreshold ?? shopping.deliveryRules!.minimumCheckoutAmount)}</Text></View>
    <View style={styles.progressLine}>
      <View style={[styles.progressTrack, { backgroundColor: '#FCE5E5' }]} accessibilityRole="progressbar" accessibilityLabel="Minimum checkout" accessibilityValue={{ min: 0, max: 100, now: delivery.minimumProgress }}><View style={{ height: '100%', width: `${delivery.minimumProgress}%`, backgroundColor: delivery.allowed ? '#039320' : '#D74343' }} /></View>
      <View style={[styles.progressTrack, { backgroundColor: '#FFF2CC' }]} accessibilityRole="progressbar" accessibilityLabel="Free delivery" accessibilityValue={{ min: 0, max: 100, now: delivery.freeProgress }}><View style={{ height: '100%', width: `${delivery.freeProgress}%`, backgroundColor: delivery.allowed && delivery.toFree === 0 ? '#039320' : '#D9A521' }} /></View>
    </View>
    <Text style={styles.progressMessage}>{delivery.message}</Text>
  </View> : null;


  // ==========================================================
  // CHECKOUT
  // ==========================================================

  const canCheckout =
    shopping.ready && cart.length > 0 && delivery.allowed && !checkingOut;


  const remainingAmount =
    Math.max(
      MINIMUM_ORDER -
        total,
      0
    );


  const handleCheckout =
    async () => {
      if (checkoutInFlight.current) return;
      checkoutInFlight.current = true;
      setCheckingOut(true);
      const revision = getSessionSnapshot().revision;
      try {
        const editing = editingQuantity.current;
        if (editing) {
          const draft = quantityDraft.current[editing];
          if (draft !== undefined && (!draft.trim() || !Number.isSafeInteger(Number(draft)) || Number(draft) < 1)) {
            await handleManualQuantitySubmit(editing);
            return;
          }
          await handleManualQuantitySubmit(editing);
        }
        await shoppingState.synchronizeCart();
        const latest = shoppingState.getSnapshot();
        if (revision !== getSessionSnapshot().revision || latest.pendingCart.size) return;
        const eligibility = deliverySummary(cartTotal(latest.cart), latest.deliveryRules, latest.minimum);
        if (!latest.cart.length || !eligibility.allowed) {
          actionAlert('Checkout unavailable', eligibility.message);
          return;
        }
        router.push('/checkout');
      } catch (error) {
        actionAlert('Cart unavailable', error instanceof Error ? error.message : 'Please retry.');
      } finally {
        checkoutInFlight.current = false;
        setCheckingOut(false);
      }
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
      {dialog}

      {shopping.feedback}
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

          onPress={goBackOrHome}
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


      {cart.length > 0 && <Pressable accessibilityRole="button" onPress={() => confirmShoppingClear('Cart', shopping.clearCart, actionAlert)}
        style={{ alignSelf: 'flex-end', padding: 12 }}><Text style={{ color: '#E35B3F', fontWeight: '700' }}>Clear Cart</Text></Pressable>}

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
          {progress}


          <Pressable
            style={
              styles.shopButton
            }

            onPress={() =>
              router.dismissTo('/')
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

          <ScrollView keyboardShouldPersistTaps="never" keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={
              false
            }

            contentContainerStyle={
              styles.scrollContent
            }
          >

            {cart.map(
              (
                item
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


                const itemUpdating = false;


                const uniqueKey =
                  productId;


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

                        <ProductImage imageFrame={product.imageFrame}
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
                          accessibilityLabel={`Decrease ${product.name} quantity`}
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
                          accessibilityLabel={`${product.name} quantity`}
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

                          onFocus={() => { editingQuantity.current = productId; }}
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
                          accessibilityLabel={`Increase ${product.name} quantity`}
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
                        accessibilityLabel={`Remove ${product.name} from cart`}
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

                {showClassC && <View style={styles.breakdown}>
                  <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Products subtotal</Text><Text style={styles.breakdownAmount}>{formatPrice(delivery.subtotal)}</Text></View>
                  {delivery.allowed && <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Delivery</Text><Text style={styles.breakdownAmount}>{delivery.deliveryFee === 0 ? 'FREE' : formatPrice(delivery.deliveryFee)}</Text></View>}
                </View>}
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
                        delivery.total
                      )
                    }
                  </Text>

                </View>


                {/* MINIMUM ORDER */}
                {progress}

                {!showClassC && !canCheckout && (

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
                        more to reach the minimum order.
                      </Text>

                    </View>

                  </View>

                )}


                {/* READY */}

                {!showClassC && canCheckout && (

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
                      {delivery.message}
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
                    {checkingOut ? 'Checking cart...' : 'Checkout'}
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

  progressBox: { width: '100%', marginTop: 12 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  progressLabel: { fontSize: 10, color: '#817B71', fontWeight: '600', flexShrink: 1 },
  progressLine: { flexDirection: 'row', gap: 3, marginTop: 6 },
  progressTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#EDE7DC', overflow: 'hidden' },
  progressMessage: { fontSize: 12, fontWeight: '700', color: '#24221E', marginTop: 7 },
  breakdown: { paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E7DED1', gap: 7 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  breakdownLabel: { fontSize: 13, fontWeight: '600', color: '#24221E' },
  breakdownAmount: { fontSize: 14, fontWeight: '800', color: '#24221E' },
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },


  productImage: { backgroundColor: '#FFFFFF',
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
    flexWrap: 'wrap',
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
    flexWrap: 'wrap',
    gap: 8,
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
