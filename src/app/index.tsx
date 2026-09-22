import { useTimeouts } from '../hooks/useTimeouts';
import { setProductFavorite } from '../services/shoppingService';
import { request } from '../services/request';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  PanResponder,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { fetchCatalog, readPublicCatalog } from '../services/catalogService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, useRef, useEffect } from 'react';
import { getValidAccessToken } from '../services/authService';

const API_URL = 'https://mystore-backend-u6ey.onrender.com';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Product = {
  id: string;
  name: string;
  description?: string;
  image: string;
  category: string;
  brand: string;
  price?: number;
  discount?: number;
  availability?: boolean;
};

type Department = {
  id: string;
  name: string;
  image: string;
  order: number;
  active: boolean;
};

const departmentIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Sweets & Chocolate': 'ice-cream-outline',
  'Snacks & Nuts': 'fast-food-outline',
  'Personal Care': 'flower-outline',
  'Cleaning Products': 'sparkles-outline',
  'Coffee & Beverages': 'cafe-outline',
  Grocery: 'basket-outline',
};

type TopSellingProduct = Product;

type OfferProduct = Product & {
  discount: number;
};

type Slide = {
  id: string;
  image: string;
  order: number;
  active: boolean;
};

type Category = {
  id: string;
  name: string;
  image?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

const getCategoryIcon = (
  categoryName: string
): keyof typeof Ionicons.glyphMap => {
  const name = categoryName.toLowerCase().trim();

  if (name.includes('chocolate')) return 'cafe-outline';
  if (name.includes('wafer')) return 'layers-outline';
  if (name.includes('chip') || name.includes('snack'))
    return 'fast-food-outline';
  if (name.includes('drink') || name.includes('beverage'))
    return 'water-outline';
  if (name.includes('candy') || name.includes('sweet'))
    return 'heart-outline';
  if (name.includes('cookie') || name.includes('biscuit'))
    return 'nutrition-outline';
  if (name.includes('ice cream') || name.includes('icecream'))
    return 'ice-cream-outline';
  if (name.includes('coffee')) return 'cafe-outline';
  if (name.includes('international') || name.includes('brand'))
    return 'globe-outline';

  return 'pricetag-outline';
};

const buildImageUrl = (image: any): string => {
  if (!image) return '';

  if (typeof image === 'object') {
    image =
      image.url ??
      image.path ??
      image.filename ??
      image.file ??
      image.image ??
      '';
  }

  if (typeof image !== 'string') return '';

  let value = image.trim();

  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (value.startsWith('file:///')) {
    value = value.replace('file:///', '');
  }

  if (/^[A-Za-z]:[\\/]/.test(value)) {
    const parts = value.split(/[\\/]/);
    value = parts[parts.length - 1];
  }

  value = value.replace(/\\/g, '/');
  value = value.replace(/^\/+/, '');

  if (value.startsWith('uploads/')) {
    return `${API_URL}/${value}`;
  }

  if (value.startsWith('images/')) {
    return `${API_URL}/uploads/${value}`;
  }

  return `${API_URL}/uploads/${value}`;
};

export default function Index() {
  const scheduleTimeout = useTimeouts();
  const [initialLoading, setInitialLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const catalogueLoadedRef = useRef(false);
  const sectionsRef = useRef<{ token: string | null; time: number } | null>(null);
  const [topSellingProducts, setTopSellingProducts] =
    useState<TopSellingProduct[]>([]);
  const [offerProducts, setOfferProducts] =
    useState<OfferProduct[]>([]);

  const [activeOfferIndex, setActiveOfferIndex] =
    useState<number>(0);

  const [showAllTopSelling, setShowAllTopSelling] = useState(false);

  const [categories, setCategories] = useState<Category[]>([
    {
      id: 'all',
      name: 'ALL',
      image: '',
      icon: 'apps-outline',
    },
  ]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [cartCount, setCartCount] = useState(0);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slideAnimation = useRef(
    new Animated.Value(1)
  ).current;

  const slideTransitioningRef = useRef(false);

  const offerFade = useRef(new Animated.Value(1)).current;
  const offerTranslate = useRef(new Animated.Value(0)).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const offersSectionY = useRef(0);
  const accessTokenRef = useRef<string | null>(null);
  const homeLoadedRef = useRef(false);
  const homeGenerationRef = useRef(0);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const alertOpacity = useRef(new Animated.Value(0)).current;
  const alertTranslateY = useRef(new Animated.Value(-40)).current;

  const getAccessToken = async () => {
    const token = await getValidAccessToken();
    accessTokenRef.current = token;
    return token;
  };

  const convertSlide = (slide: any): Slide => {
    const slideId = String(slide._id ?? slide.id);
    const imageUrl = buildImageUrl(slide.image);

    return {
      id: slideId,
      image: imageUrl,
      order: Number(slide.order) || 1,
      active: slide.active !== false,
    };
  };

  const loadSlideshow = async () => {
    try {
      setSlidesLoading(true);

      const response = await request(`${API_URL}/slideshows`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (__DEV__) { console.log('GET SLIDESHOW ERROR:', response.status, data); }
        setSlides([]);
        return;
      }

      if (!Array.isArray(data.slides)) {
        if (__DEV__) { console.log('INVALID SLIDESHOW RESPONSE:', data); }
        setSlides([]);
        return;
      }

      const convertedSlides: Slide[] = data.slides
        .map((slide: any) => convertSlide(slide))
        .filter(
          (slide: Slide) =>
            slide.active && !!slide.image
        )
        .sort(
          (a: Slide, b: Slide) =>
            a.order - b.order
        );

      slideAnimation.stopAnimation();
      slideTransitioningRef.current = false;
      slideAnimation.setValue(1);

      setSlides(convertedSlides);

      setCurrentSlide(previousSlide => {
        if (convertedSlides.length === 0) return 0;

        if (
          previousSlide >=
          convertedSlides.length
        ) {
          return 0;
        }

        return previousSlide;
      });
    } catch (error) {
      if (__DEV__) { console.log('LOAD SLIDESHOW ERROR:', error); }
      setSlides([]);
    } finally {
      setSlidesLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      setDepartmentsError('');
      const response = await request(`${API_URL}/departments`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Could not load departments.');
      const data = await response.json();
      if (!Array.isArray(data.departments)) throw new Error('Invalid departments response.');
      setDepartments(data.departments
        .filter((item: any) => item && item.active !== false && (item._id || item.id))
        .map((item: any) => ({
          id: String(item._id ?? item.id),
          name: String(item.name ?? ''),
          image: buildImageUrl(item.image),
          order: Number(item.order) || 0,
          active: item.active !== false,
        }))
        .filter((item: Department) => item.name.trim().length > 0)
        .sort((a: Department, b: Department) => a.order - b.order || a.name.localeCompare(b.name)));
    } catch (error) {
      setDepartmentsError(error instanceof Error ? error.message : 'Could not load departments.');
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);

      const response = await request(`${API_URL}/categories`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (__DEV__) { console.log('GET CATEGORIES ERROR:', response.status, data); }

        setCategories([
          {
            id: 'all',
            name: 'ALL',
            image: '',
            icon: 'apps-outline',
          },
        ]);

        return;
      }

      const rawCategories = Array.isArray(data)
        ? data
        : Array.isArray(data.categories)
          ? data.categories
          : [];

      const convertedCategories: Category[] =
        rawCategories
          .map((category: any) => {
            if (typeof category === 'string') {
              return {
                id: category,
                name: category,
                image: '',
                icon: getCategoryIcon(category),
              };
            }

            const categoryName =
              category.name ??
              category.title ??
              '';

            if (!categoryName) return null;

            const categoryId = String(
              category._id ??
                category.id ??
                categoryName
            );

            const rawImage =
              category.image ??
              category.imageUrl ??
              category.imageURL ??
              category.photo ??
              '';

            return {
              id: categoryId,
              name: String(categoryName),
              image: buildImageUrl(rawImage),
              icon: getCategoryIcon(
                String(categoryName)
              ),
            };
          })
          .filter(
            (
              category: Category | null
            ): category is Category =>
              category !== null
          );

      const filteredCategories =
        convertedCategories.filter(
          category =>
            category.name
              .trim()
              .toLowerCase() !== 'all'
        );

      setCategories([
        {
          id: 'all',
          name: 'ALL',
          image: '',
          icon: 'apps-outline',
        },
        ...filteredCategories,
      ]);
    } catch (error) {
      if (__DEV__) { console.log('LOAD CATEGORIES ERROR:', error); }

      setCategories([
        {
          id: 'all',
          name: 'ALL',
          image: '',
          icon: 'apps-outline',
        },
      ]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    if (slides.length <= 1) return;

    if (!slideTransitioningRef.current) return;

    const fadeIn = Animated.timing(
      slideAnimation,
      {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }
    );

    fadeIn.start(({ finished }) => {
      if (finished) {
        slideTransitioningRef.current = false;
      }
    });
  }, [
    currentSlide,
    slides.length,
    slideAnimation,
  ]);

  const goToNextSlide = useCallback(() => {
    if (slides.length <= 1) return;

    if (slideTransitioningRef.current) {
      return;
    }

    slideTransitioningRef.current = true;

    slideAnimation.stopAnimation();

    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        slideAnimation.setValue(1);
        slideTransitioningRef.current = false;
        return;
      }

      setCurrentSlide(
        previousSlide =>
          (previousSlide + 1) %
          slides.length
      );
    });
  }, [
    slideAnimation,
    slides.length,
  ]);

  const goToPreviousSlide = useCallback(() => {
    if (slides.length <= 1) return;

    if (slideTransitioningRef.current) {
      return;
    }

    slideTransitioningRef.current = true;

    slideAnimation.stopAnimation();

    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        slideAnimation.setValue(1);
        slideTransitioningRef.current = false;
        return;
      }

      setCurrentSlide(
        previousSlide =>
          (previousSlide -
            1 +
            slides.length) %
          slides.length
      );
    });
  }, [
    slideAnimation,
    slides.length,
  ]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      goToNextSlide();
    }, 3500);

    return () => clearInterval(interval);
  }, [
    goToNextSlide,
    slides.length,
  ]);

  useEffect(() => {
    if (offerProducts.length <= 1) return;

    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(offerFade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(offerTranslate, {
          toValue: -18,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setActiveOfferIndex(
          (previousIndex: number) =>
            (previousIndex + 1) %
            offerProducts.length
        );

        offerTranslate.setValue(18);

        Animated.parallel([
          Animated.timing(offerFade, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(offerTranslate, {
            toValue: 0,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [
    offerProducts.length,
    offerFade,
    offerTranslate,
  ]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (
        _,
        gestureState
      ) => {
        const horizontalMovement =
          Math.abs(gestureState.dx);

        const verticalMovement =
          Math.abs(gestureState.dy);

        return (
          horizontalMovement > 12 &&
          horizontalMovement >
            verticalMovement
        );
      },

      onPanResponderTerminationRequest: () =>
        false,

      onPanResponderRelease: (
        _,
        gestureState
      ) => {
        if (gestureState.dx < -50) {
          goToNextSlide();
        } else if (gestureState.dx > 50) {
          goToPreviousSlide();
        }
      },
    })
  ).current;

  const scrollToOffers = () => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(
        offersSectionY.current - 20,
        0
      ),
      animated: true,
    });
  };

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertVisible(true);

    alertOpacity.setValue(0);
    alertTranslateY.setValue(-40);

    Animated.parallel([
      Animated.timing(alertOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(alertTranslateY, {
        toValue: 0,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    scheduleTimeout(() => {
      Animated.parallel([
        Animated.timing(alertOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(alertTranslateY, {
          toValue: -25,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAlertVisible(false);
      });
    }, 2200);
  };

  const convertProduct = (product: any): Product => {
    const productId = String(
      product._id ?? product.id
    );

    return {
      id: productId,
      name: product.name,
      description: product.description,
      image: buildImageUrl(product.image),
      category:
        typeof product.category === 'string'
          ? product.category
          : product.category?.name ?? '',
      brand:
        typeof product.brand === 'string'
          ? product.brand
          : product.brand?.name ?? '',
      price:
        product.price !== undefined &&
        product.price !== null
          ? Number(product.price)
          : undefined,
      discount:
        Number(product.discount) || 0,
      availability:
        product.availability !== false,
    };
  };

  const loadProducts = async (token: string | null, force = false) => {
    setProductsError('');
    try {
      const data = await fetchCatalog(token, force);
      if (accessTokenRef.current !== token) return;
      catalogueLoadedRef.current = true;
      setProducts(data.map(convertProduct));
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : 'Could not load products.');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadOffers = async (
    accessToken?: string | null
  ) => {
    try {
      const token =
        accessToken ??
        accessTokenRef.current;

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await request(
        `${API_URL}/products/offers`,
        {
          method: 'GET',
          headers,
        }
      );

      const data = await response.json();
      if (token !== accessTokenRef.current) return;

      if (!response.ok) {
        if (__DEV__) { console.log(
          'GET OFFERS ERROR:',
          response.status,
          data
        ); }
        setOfferProducts([]);
        setActiveOfferIndex(0);
        return;
      }

      if (!Array.isArray(data.products)) {
        if (__DEV__) { console.log(
          'INVALID OFFERS RESPONSE:',
          data
        ); }
        setOfferProducts([]);
        setActiveOfferIndex(0);
        return;
      }

      const convertedOffers: OfferProduct[] =
        data.products
          .map((product: any) => {
            const converted =
              convertProduct(product);

            return {
              ...converted,
              discount:
                Number(product.discount) || 0,
            };
          })
          .filter(
            (product: OfferProduct) =>
              product.discount > 0
          );

      setOfferProducts(convertedOffers);
      setActiveOfferIndex(0);
    } catch (error) {
      if (__DEV__) { console.log(
        'LOAD OFFERS ERROR:',
        error
      ); }
      setOfferProducts([]);
      setActiveOfferIndex(0);
    }
  };

  const loadTopSelling = async (
    accessToken?: string | null
  ) => {
    try {
      const token =
        accessToken ??
        accessTokenRef.current;

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await request(
        `${API_URL}/products/top-selling`,
        {
          method: 'GET',
          headers,
        }
      );

      const data = await response.json();
      if (token !== accessTokenRef.current) return;

      if (!response.ok) {
        if (__DEV__) { console.log(
          'GET TOP SELLING ERROR:',
          response.status,
          data
        ); }
        setTopSellingProducts([]);
        return;
      }

      if (!Array.isArray(data.products)) {
        if (__DEV__) { console.log(
          'INVALID TOP SELLING RESPONSE:',
          data
        ); }
        setTopSellingProducts([]);
        return;
      }

      const convertedTopSelling:
        TopSellingProduct[] =
        data.products
          .map((item: any) => {
            if (!item.product) return null;

            return convertProduct(
              item.product
            );
          })
          .filter(
            (
              product:
                | TopSellingProduct
                | null
            ): product is TopSellingProduct =>
              product !== null
          );

      setTopSellingProducts(
        convertedTopSelling
      );
    } catch (error) {
      if (__DEV__) { console.log(
        'LOAD TOP SELLING ERROR:',
        error
      ); }
      setTopSellingProducts([]);
    }
  };

  const loadCartCount = async (
    accessToken?: string | null
  ) => {
    try {
      const token =
        accessToken ??
        accessTokenRef.current;

      if (!token) {
        setCartCount(0);
        return;
      }

      const response = await request(
        `${API_URL}/cart`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (token !== accessTokenRef.current) return;

      if (!response.ok) {
        if (__DEV__) { console.log(
          'GET CART COUNT ERROR:',
          data
        ); }
        setCartCount(0);
        return;
      }

      const items =
        data.cart?.items || [];

      const count = items.reduce(
        (
          total: number,
          item: any
        ) =>
          total +
          (Number(item.quantity) || 0),
        0
      );

      setCartCount(count);
    } catch (error) {
      if (__DEV__) { console.log(
        'LOAD CART COUNT ERROR:',
        error
      ); }
      setCartCount(0);
    }
  };

  const loadFavorites = async (
    accessToken?: string | null
  ) => {
    try {
      const token =
        accessToken ??
        accessTokenRef.current;

      if (!token) {
        setFavorites([]);
        return;
      }

      const response = await request(
        `${API_URL}/favorites`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (token !== accessTokenRef.current) return;

      if (
        response.status === 401
      ) {
        setFavorites([]);
        return;
      }

      if (!response.ok) {
        if (__DEV__) { console.log(
          'GET FAVORITES ERROR:',
          data
        ); }
        setFavorites([]);
        return;
      }

      const convertedFavorites: Product[] =
        (data.favorites || [])
          .map((favorite: any) => {
            const product =
              favorite.product;

            if (!product) return null;

            return convertProduct(
              product
            );
          })
          .filter(
            (
              product: Product | null
            ): product is Product =>
              product !== null
          );

      setFavorites(
        convertedFavorites
      );
    } catch (error) {
      if (__DEV__) { console.log(
        'LOAD FAVORITES ERROR:',
        error
      ); }
      setFavorites([]);
    }
  };

  const loadData = async () => {
    try {
      const token = await getValidAccessToken();
      return { token, loggedIn: Boolean(token) };
    } catch {
      return { token: null, loggedIn: false };
    }
  };

  const loadHome = async (force = false) => {
    const generation = ++homeGenerationRef.current;
    try {
      // Cached metadata paints while auth and network requests are still pending.
      if (!homeLoadedRef.current) {
        void readPublicCatalog().then(cached => {
          if (generation === homeGenerationRef.current && !catalogueLoadedRef.current && cached.length) setProducts(cached.map(convertProduct));
        });
      }
      // Public sections can load without waiting for a token refresh.
      const requests: Promise<unknown>[] = homeLoadedRef.current && !force ? [] : [loadSlideshow(), loadDepartments()];
      const { token, loggedIn } = await loadData();
      if (generation !== homeGenerationRef.current) return;
      accessTokenRef.current = token;
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        setProducts(current => current.map(({ price, ...product }) => product));
        setOfferProducts(current => current.map(({ price, ...product }) => product));
      }
      requests.push(loadProducts(token, force));
      const previous = sectionsRef.current;
      if (force || !previous || previous.token !== token || Date.now() - previous.time > 60000) {
        requests.push(loadOffers(token), loadTopSelling(token));
        sectionsRef.current = { token, time: Date.now() };
      }
      if (loggedIn) {
        requests.push(loadCartCount(token), loadFavorites(token));
      } else {
        setCartCount(0);
        setFavorites([]);
      }
      await Promise.all(requests);
      homeLoadedRef.current = true;
    } catch (error) {
      if (__DEV__) console.log('HOME LOAD ERROR:', error);
    } finally {
      if (generation === homeGenerationRef.current) setInitialLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    void loadHome();
    return () => { homeGenerationRef.current++; };
  }, []));

  const openProduct = (
    product: Product
  ) => {
    router.push({
      pathname: '/product-details',
      params: {
        id: product.id,
      },
    });
  };

  const favoriteBusy = useRef(new Set<string>());
  const cartBusy = useRef(new Set<string>());
  const toggleFavorite = async (product: Product) => {
    if (favoriteBusy.current.has(product.id)) return;
    favoriteBusy.current.add(product.id);
    const generation = homeGenerationRef.current;
    try {
      const token = await getAccessToken();
      if (!token) { router.push('/login'); return; }
      const selected = favorites.some(item => item.id === product.id);
      await setProductFavorite(product.id, !selected, token);
      if (generation !== homeGenerationRef.current) return;
      setFavorites(current => selected ? current.filter(item => item.id !== product.id)
        : current.some(item => item.id === product.id) ? current : [...current, product]);
    } catch (error) { showAlert(error instanceof Error ? error.message : 'Could not update favorites.'); }
    finally { favoriteBusy.current.delete(product.id); }
  };

  const isFavorite = (
    id: string
  ) => {
    return favorites.some(
      item => item.id === id
    );
  };

  const addToCart = async (
    product: Product,
    cartPrice?: number
  ) => {
    if (
      product.availability === false
    ) {
      showAlert(
        `${product.name} is currently out of stock.`
      );
      return;
    }

    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    if (cartBusy.current.has(product.id)) return;
    cartBusy.current.add(product.id);
    try {
      const accessToken =
        await getAccessToken();

      if (!accessToken) {
        router.push('/login');
        return;
      }

      const finalPrice =
        cartPrice ?? product.price;

      const response = await request(
        `${API_URL}/cart/add`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type':
              'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            productId: product.id,
            quantity: 1,
            ...(finalPrice !== undefined
              ? { price: finalPrice }
              : {}),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (__DEV__) { console.log(
          'ADD TO CART ERROR:',
          data
        ); }

        showAlert(
          data.message ||
            'Unable to add product to cart.'
        );

        return;
      }

      await loadCartCount(
        accessToken
      );

      showAlert(
        `${product.name} has been added to your cart.`
      );
    } catch (error) {
      showAlert(error instanceof Error ? error.message : 'Could not add to cart.');
      if (__DEV__) { console.log(
        'ADD TO CART ERROR:',
        error
      ); }
    } finally { cartBusy.current.delete(product.id); }
  };

  const openCategory = (
    category: string
  ) => {
    router.push({
      pathname:
        '/category-products',
      params: {
        category,
      },
    });
  };

  const openAccount = () => {
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      router.push('/account');
    }
  };

  const displayedTopSelling =
    showAllTopSelling
      ? topSellingProducts
      : topSellingProducts.slice(0, 2);

  const recentlyAdded =
    products.slice(0, 4);

  const activeSlide =
    slides[currentSlide];

  const activeOffer =
    offerProducts[
      activeOfferIndex
    ];

  return (
    <View style={styles.container}>
      {alertVisible ? (
        <Animated.View
          style={[
            styles.homeAlert,
            {
              opacity: alertOpacity,
              transform: [
                {
                  translateY:
                    alertTranslateY,
                },
              ],
            },
          ]}
        >
          <View style={styles.homeAlertIcon}>
            <Ionicons
              name="checkmark"
              size={20}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.homeAlertContent}>
            <Text
              style={styles.homeAlertTitle}
            >
              Added to Cart
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
            name="cart-outline"
            size={21}
            color="#E35B3F"
          />
        </Animated.View>
      ) : null}

      <ScrollView
        ref={scrollViewRef}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor="#E35B3F" colors={['#E35B3F']}
          onRefresh={() => {
            setRefreshing(true);
            void loadHome(true).finally(() => setRefreshing(false));
          }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View style={styles.header}>
          <View>
           

            <View style={styles.logoRow}>
              <View
                style={
                  styles.logoAccent
                }
              />

              <Text
                style={
                  styles.logoTagline
                }
              >
                EVERYTHING YOU NEED
              </Text>
            </View>
          </View>

          <Pressable
            style={
              styles.accountButton
            }
            onPress={
              openAccount
            }
          >
            <Ionicons
              name="person-outline"
              size={21}
              color="#171717"
            />
          </Pressable>
        </View>

        {/* SLIDESHOW */}

        <View
          style={
            styles.sliderWrapper
          }
        >
          <View
            style={styles.slider}
            {...panResponder.panHandlers}
          >
            {slidesLoading ? (
              <View
                style={
                  styles.slideLoading
                }
              >
                <View
                  style={
                    styles.slideLoadingCircle
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color="#E35B3F"
                  />
                </View>

                <Text
                  style={
                    styles.slideLoadingText
                  }
                >
                  Loading...
                </Text>
              </View>
            ) : slides.length ===
              0 ? (
              <View
                style={
                  styles.emptySlide
                }
              >
                <View
                  style={
                    styles.emptySlideIcon
                  }
                >
                  <Ionicons
                    name="images-outline"
                    size={34}
                    color="#E35B3F"
                  />
                </View>

                <Text
                  style={
                    styles.emptySlideText
                  }
                >
                  No slideshow images
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.fadeSlideContainer
                }
              >
                <Animated.View
                  style={[
                    styles.fadeSlidePane,
                    {
                      opacity:
                        slideAnimation,
                    },
                  ]}
                >
                  <Image
                    source={{
                      uri:
                        activeSlide?.image,
                    }}
                    style={
                      styles.slideImage
                    }
                    contentFit="cover" cachePolicy="memory-disk"
                  />
                </Animated.View>
              </View>
            )}

            {slides.length > 1 &&
            !slidesLoading ? (
              <View
                style={
                  styles.slideDots
                }
              >
                {slides.map(
                  (
                    slide,
                    index
                  ) => (
                    <View
                      key={
                        slide.id
                      }
                      style={[
                        styles.slideDot,
                        index ===
                        currentSlide
                          ? styles.slideDotActive
                          : null,
                      ]}
                    />
                  )
                )}
              </View>
            ) : null}
          </View>
        </View>

        {/* MAIN DEPARTMENTS */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Shop by Department</Text>
          </View>
          <Text style={styles.sectionSmallLabel}>EXPLORE</Text>
        </View>

        {departmentsLoading && departments.length === 0 ? (
          <View style={styles.categoriesLoading}>
            <ActivityIndicator size="small" color="#E35B3F" />
          </View>
        ) : departments.length > 0 ? (
          <View style={styles.departmentGrid}>
            {departments.map(department => (
              <Pressable
                key={department.id}
                style={styles.departmentCard}
                onPress={() => router.push({
                  pathname: '/department-categories',
                  params: { id: department.id, name: department.name },
                })}
              >
                <View style={styles.departmentVisual}>
                  {department.image ? (
                    <Image source={{ uri: department.image }} style={styles.departmentImage} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <Ionicons name={departmentIcons[department.name] ?? 'grid-outline'} size={34} color="#E35B3F" />
                  )}
                </View>
                <Text style={styles.departmentName} numberOfLines={2}>{department.name}</Text>
                <View style={styles.departmentExplore}>
                  <Text style={styles.departmentExploreText}>Explore categories</Text>
                  <Ionicons name="arrow-forward" size={13} color="#E35B3F" />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.departmentEmpty}>
            <Text style={styles.emptyText}>{departmentsError || 'No departments available.'}</Text>
            <Pressable onPress={() => void loadDepartments()} style={styles.departmentRetry}>
              <Text style={styles.departmentExploreText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* TOP SELLING */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View
            style={
              styles.sectionTitleRow
            }
          >
            <View
              style={
                styles.sectionAccent
              }
            />

            <Text
              style={
                styles.sectionTitle
              }
            >
              Top Selling
            </Text>
          </View>

          {topSellingProducts.length >
          2 ? (
            <Pressable
              onPress={() =>
                setShowAllTopSelling(
                  current =>
                    !current
                )
              }
              hitSlop={8}
            >
              <Text
                style={
                  styles.sectionSeeMore
                }
              >
                {showAllTopSelling
                  ? 'SEE LESS'
                  : 'SEE MORE'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={
            styles.topSellingGrid
          }
        >
          {displayedTopSelling.length >
          0 ? (
            displayedTopSelling.map(
              product => (
                <TopSellingProductRow
                  key={
                    product.id
                  }
                  product={
                    product
                  }
                  isLoggedIn={
                    isLoggedIn
                  }
                  isFavorite={isFavorite(
                    product.id
                  )}
                  onPress={() =>
                    openProduct(
                      product
                    )
                  }
                  onFavorite={() =>
                    toggleFavorite(
                      product
                    )
                  }
                  onAddToCart={() => {
                    const discount =
                      Number(
                        product.discount ||
                          0
                      );

                    if (
                      discount >
                        0 &&
                      product.price !==
                        undefined
                    ) {
                      const discountedPrice =
                        Number(
                          (
                            product.price *
                            (1 -
                              discount /
                                100)
                          ).toFixed(
                            2
                          )
                        );

                      addToCart(
                        product,
                        discountedPrice
                      );
                    } else {
                      addToCart(
                        product
                      );
                    }
                  }}
                />
              )
            )
          ) : (
            <Text
              style={
                styles.emptyText
              }
            >
              No top selling products yet.
            </Text>
          )}
        </View>

        {/* RECENTLY ADDED */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View
            style={
              styles.sectionTitleRow
            }
          >
            <View
              style={
                styles.sectionAccent
              }
            />

            <Text
              style={
                styles.sectionTitle
              }
            >
              Recently Added
            </Text>
          </View>

          <Text
            style={
              styles.sectionSmallLabel
            }
          >
            NEW
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.recentProducts
          }
        >
          {recentlyAdded.length >
          0 ? (
            recentlyAdded.map(
              (
                product,
                index
              ) => (
                <RecentProduct
                  key={
                    product.id
                  }
                  product={
                    product
                  }
                  index={index}
                  isFavorite={isFavorite(
                    product.id
                  )}
                  onPress={() =>
                    openProduct(
                      product
                    )
                  }
                  onFavorite={() =>
                    toggleFavorite(
                      product
                    )
                  }
                />
              )
            )
          ) : (
            <Text
              style={
                styles.emptyText
              }
            >
              {productsLoading ? 'Loading products...' : productsError || 'No products available.'}
            </Text>
          )}
        </ScrollView>

        {/* OFFERS */}

        <View
          onLayout={event => {
            offersSectionY.current =
              event.nativeEvent.layout.y;
          }}
          style={
            styles.offerHeader
          }
        >
          <View
            style={
              styles.sectionTitleRow
            }
          >
            <View
              style={
                styles.offerAccent
              }
            />

            <Text
              style={
                styles.sectionTitle
              }
            >
              Offers
            </Text>
          </View>

          <Pressable
            onPress={
              scrollToOffers
            }
          >
            <Text
              style={
                styles.offerLabel
              }
            >
              SPECIAL DEALS
            </Text>
          </Pressable>
        </View>

        {activeOffer ? (
          <Animated.View
            style={[
              styles.offerShowcase,
              {
                opacity: offerFade,
                transform: [
                  {
                    translateX:
                      offerTranslate,
                  },
                ],
              },
            ]}
          >
            <Pressable
              style={
                styles.offerShowcasePressable
              }
              onPress={() =>
                openProduct(
                  activeOffer
                )
              }
            >
              <View
                style={
                  styles.offerVisual
                }
              >
                <Image
                  source={{
                    uri: activeOffer.image,
                  }}
                  style={
                    styles.offerShowcaseImage
                  }
                  contentFit="contain" cachePolicy="memory-disk"
                />

                <View
                  style={
                    styles.offerBadge
                  }
                >
                  <Ionicons
                    name="pricetag"
                    size={11}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.offerBadgeText
                    }
                  >
                    {
                      activeOffer.discount
                    }% OFF
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.offerInfo
                }
              >
                <Text
                  style={
                    styles.offerMiniLabel
                  }
                >
                  LIMITED DEAL
                </Text>

                <Text
                  style={
                    styles.offerProductName
                  }
                  numberOfLines={2}
                >
                  {
                    activeOffer.name
                  }
                </Text>

                {activeOffer.price !==
                undefined ? (
                  <View
                    style={
                      styles.offerPriceRow
                    }
                  >
                    <Text
                      style={
                        styles.offerOldPrice
                      }
                    >
                      $
                      {Number(
                        activeOffer.price
                      ).toFixed(2)}
                    </Text>

                    <Text
                      style={
                        styles.offerNewPrice
                      }
                    >
                      $
                      {Number(
                        activeOffer.price *
                          (1 -
                            activeOffer.discount /
                              100)
                      ).toFixed(2)}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={
                      styles.loginOfferPrice
                    }
                  >
                    Login to see price
                  </Text>
                )}

                <Pressable
                  style={
                    styles.offerAddButton
                  }
                  onPress={() => {
                    if (
                      activeOffer.availability ===
                      false
                    ) {
                      showAlert(
                        `${activeOffer.name} is currently out of stock.`
                      );
                      return;
                    }

                    if (
                      activeOffer.price ===
                      undefined
                    ) {
                      showAlert(
                        'Product price is not available.'
                      );
                      return;
                    }

                    const discountedPrice =
                      activeOffer.price *
                      (1 -
                        activeOffer.discount /
                          100);

                    addToCart(
                      activeOffer,
                      Number(
                        discountedPrice.toFixed(
                          2
                        )
                      )
                    );
                  }}
                >
                  <Text
                    style={
                      styles.offerAddText
                    }
                  >
                    Add to Cart
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          <View
            style={
              styles.emptyOffer
            }
          >
            <Ionicons
              name="pricetag-outline"
              size={25}
              color="#A49B90"
            />

            <Text
              style={
                styles.emptyOfferText
              }
            >
              No offers available.
            </Text>
          </View>
        )}

        {offerProducts.length >
        1 ? (
          <View
            style={
              styles.offerIndicators
            }
          >
            {offerProducts
              .slice(0, 6)
              .map(
                (
                  offer,
                  index
                ) => (
                  <View
                    key={
                      offer.id
                    }
                    style={[
                      styles.offerIndicator,
                      index ===
                      activeOfferIndex
                        ? styles.offerIndicatorActive
                        : null,
                    ]}
                  />
                )
              )}
          </View>
        ) : null}

        <View
          style={
            styles.bottomSpace
          }
        />
      </ScrollView>

      <View
        style={
          styles.bottomNav
        }
      >
        <Pressable
          style={
            styles.navItem
          }
          onPress={() =>
            router.replace('/')
          }
        >
          <View
            style={
              styles.activeNavIcon
            }
          >
            <Ionicons
              name="home"
              size={19}
              color="#FFFFFF"
            />
          </View>

          <Text
            style={
              styles.navTextActive
            }
          >
            Home
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.navItem
          }
          onPress={() =>
            router.push(
              '/search'
            )
          }
        >
          <Ionicons
            name="search-outline"
            size={22}
            color="#817D75"
          />

          <Text
            style={
              styles.navText
            }
          >
            Search
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.navItem
          }
          onPress={() =>
            router.push(
              '/favorites'
            )
          }
        >
          <View
            style={
              styles.navIconWrapper
            }
          >
            <Ionicons
              name="heart-outline"
              size={22}
              color="#817D75"
            />

            {favorites.length >
            0 ? (
              <View
                style={
                  styles.navBadge
                }
              >
                <Text
                  style={
                    styles.navBadgeText
                  }
                >
                  {
                    favorites.length
                  }
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={
              styles.navText
            }
          >
            Favorites
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.navItem
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
          <View
            style={
              styles.navIconWrapper
            }
          >
            <Ionicons
              name="cart-outline"
              size={22}
              color="#817D75"
            />

            {isLoggedIn &&
            cartCount > 0 ? (
              <View
                style={
                  styles.navBadge
                }
              >
                <Text
                  style={
                    styles.navBadgeText
                  }
                >
                  {
                    cartCount
                  }
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={
              styles.navText
            }
          >
            Cart
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.navItem
          }
          onPress={() =>
            router.push(
              '/settings'
            )
          }
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color="#817B71"
          />

          <Text
            style={
              styles.navText
            }
          >
            Settings
          </Text>
        </Pressable>
      </View>

      {initialLoading && <StartupLoading />}
    </View>
  );
}

function StartupLoading() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 3,
        duration: 1050,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View style={styles.startupLoading}>
      <Image
        source={require('../../assets/images/loading-screen.png')}
        style={styles.startupImage}
        contentFit="contain"
      />
      <View style={styles.startupDots}>
        {[0, 1, 2].map(index => (
          <Animated.View
            key={index}
            style={[
              styles.startupDot,
              {
                opacity: progress.interpolate({
                  inputRange: [0, 1, 2, 3],
                  outputRange: [
                    index === 0 ? 1 : 0.25,
                    index === 1 ? 1 : 0.25,
                    index === 2 ? 1 : 0.25,
                    index === 0 ? 1 : 0.25,
                  ],
                }),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function TopSellingProductRow({
  product,
  isLoggedIn,
  isFavorite,
  onPress,
  onFavorite,
  onAddToCart,
}: {
  product: TopSellingProduct;
  isLoggedIn: boolean;
  isFavorite: boolean;
  onPress: () => void;
  onFavorite: () => void;
  onAddToCart: () => void;
}) {
  const appear = useRef(
    new Animated.Value(0)
  ).current;

  const pressScale = useRef(
    new Animated.Value(1)
  ).current;

  const isAvailable =
    product.availability !== false;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(
        pressScale,
        {
          toValue: 0.96,
          duration: 80,
          useNativeDriver: true,
        }
      ),
      Animated.spring(
        pressScale,
        {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }
      ),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles.topSellingItem,
        {
          opacity: appear,
          transform: [
            {
              translateY:
                appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
            },
            {
              scale: pressScale,
            },
          ],
        },
      ]}
    >
      <Pressable
        style={
          styles.topSellingCard
        }
        onPress={() => {
          animatePress();
          onPress();
        }}
      >
        <View
          style={
            styles.topSellingImageBox
          }
        >
          <Image
            source={{
              uri: product.image,
            }}
            style={
              styles.topSellingImage
            }
            contentFit="contain" cachePolicy="memory-disk"
          />

          {!isAvailable ? (
            <View
              style={
                styles.topSellingOutOfStock
              }
            >
              <Ionicons
                name="close"
                size={9}
                color="#FFFFFF"
              />
            </View>
          ) : null}

          <Pressable
            style={
              styles.topSellingFavorite
            }
            onPress={event => {
              event.stopPropagation();
              onFavorite();
            }}
            hitSlop={7}
          >
            <Ionicons
              name={
                isFavorite
                  ? 'heart'
                  : 'heart-outline'
              }
              size={14}
              color={
                isFavorite
                  ? '#E35B3F'
                  : '#8B857D'
              }
            />
          </Pressable>
        </View>

        <View
          style={
            styles.topSellingInfo
          }
        >
          <Text
            style={
              styles.topSellingName
            }
            numberOfLines={1}
          >
            {product.name}
          </Text>

          <View
            style={
              styles.topSellingBottom
            }
          >
            {isLoggedIn &&
            product.price !==
              undefined ? (
              <Text
                style={[
                  styles.topSellingPrice,
                  !isAvailable
                    ? styles.unavailableTopSellingPrice
                    : null,
                ]}
                numberOfLines={1}
              >
                $
                {Number(
                  product.price
                ).toFixed(2)}
              </Text>
            ) : (
              <Text
                style={
                  styles.topSellingLoginPrice
                }
                numberOfLines={1}
              >
                Login for price
              </Text>
            )}

            <Pressable
              style={[
                styles.topSellingAddButton,
                !isAvailable
                  ? styles.topSellingDisabledButton
                  : null,
              ]}
              onPress={event => {
                event.stopPropagation();
                onAddToCart();
              }}
              disabled={
                !isAvailable
              }
              hitSlop={4}
            >
              <Ionicons
                name={
                  isAvailable
                    ? 'add'
                    : 'close'
                }
                size={14}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function RecentProduct({
  product,
  index,
  isFavorite,
  onPress,
  onFavorite,
}: {
  product: Product;
  index: number;
  isFavorite: boolean;
  onPress: () => void;
  onFavorite: () => void;
}) {
  const appear = useRef(
    new Animated.Value(0)
  ).current;

  const scale = useRef(
    new Animated.Value(1)
  ).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [appear, index]);

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.93,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.recentItem,
        {
          opacity: appear,
          transform: [
            {
              translateY:
                appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
            },
            {
              scale,
            },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        <View
          style={
            styles.recentImageBox
          }
        >
          <Image
            source={{
              uri: product.image,
            }}
            style={
              styles.recentImage
            }
            contentFit="contain" cachePolicy="memory-disk"
          />

          {product.discount &&
          product.discount > 0 ? (
            <View
              style={
                styles.recentDiscount
              }
            >
              <Text
                style={
                  styles.recentDiscountText
                }
              >
                -{product.discount}%
              </Text>
            </View>
          ) : null}

          <Pressable
            style={
              styles.recentHeart
            }
            onPress={event => {
              event.stopPropagation();
              onFavorite();
            }}
            hitSlop={6}
          >
            <Ionicons
              name={
                isFavorite
                  ? 'heart'
                  : 'heart-outline'
              }
              size={15}
              color={
                isFavorite
                  ? '#E35B3F'
                  : '#777168'
              }
            />
          </Pressable>
        </View>

        <Text
          style={
            styles.recentName
          }
          numberOfLines={1}
        >
          {product.name}
        </Text>

        {product.price !==
        undefined ? (
          <Text
            style={
              styles.recentPrice
            }
          >
            $
            {Number(
              product.price
            ).toFixed(2)}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  startupLoading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    elevation: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startupImage: {
    width: '100%',
    height: '100%',
  },
  startupDots: {
    position: 'absolute',
    bottom: '18%',
    flexDirection: 'row',
    gap: 9,
    alignSelf: 'center',
  },
  startupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E35B3F',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F3EC',
    paddingTop: 20,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 19,
    paddingBottom: 20,
  },

  homeAlert: {
    position: 'absolute',
    top: 55,
    left: 18,
    right: 18,
    zIndex: 9999,
    minHeight: 67,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9E1D6',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.13,
    shadowRadius: 15,
    elevation: 10,
  },

  homeAlertIcon: {
    width: 41,
    height: 41,
    borderRadius: 21,
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
    fontWeight: '900',
    color: '#171717',
    marginBottom: 3,
  },

  homeAlertMessage: {
    fontSize: 11.5,
    color: '#777168',
    lineHeight: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 19,
  },

  logo: {
    fontSize: 31,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -1.1,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },

  logoAccent: {
    width: 24,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#E35B3F',
    marginRight: 7,
  },

  logoTagline: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#817B71',
    letterSpacing: 1.1,
  },

  accountButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DED2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  /* SLIDESHOW */

  sliderWrapper: {
    width: SCREEN_WIDTH,
    marginLeft: -18,
    marginBottom: 25,
  },

  slider: {
    width: SCREEN_WIDTH,
    height: 218,
    backgroundColor: '#F7F3EC',
    overflow: 'hidden',
    position: 'relative',
  },

  slideLoading: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F3EC',
  },

  slideLoadingCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DED2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  slideLoadingText: {
    color: '#817B71',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  emptySlide: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F3EC',
  },

  emptySlideIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DED2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptySlideText: {
    color: '#171717',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
  },

  fadeSlideContainer: {
    width: SCREEN_WIDTH,
    height: 218,
    position: 'relative',
  },

  fadeSlidePane: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SCREEN_WIDTH,
    height: 218,
    overflow: 'hidden',
  },

  slidePane: {
    width: SCREEN_WIDTH,
    height: 218,
    position: 'relative',
    overflow: 'hidden',
  },

  slideImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SCREEN_WIDTH,
    height: 218,
  },

  slideBadge: {
    position: 'absolute',
    top: 15,
    left: 15,
    backgroundColor: '#E35B3F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  slideBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  slideDots: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 5,
  },

  slideDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor:
      'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor:
      'rgba(23,23,23,0.15)',
  },

  slideDotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 14,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionAccent: {
    width: 5,
    height: 22,
    borderRadius: 3,
    backgroundColor: '#E35B3F',
    marginRight: 9,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#171717',
    letterSpacing: -0.4,
  },

  sectionSmallLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9A9186',
    letterSpacing: 1,
  },

  sectionSeeMore: {
    fontSize: 8,
    fontWeight: '900',
    color: '#E35B3F',
    letterSpacing: 0.9,
  },

  offerLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#E35B3F',
    letterSpacing: 0.9,
  },

  emptyText: {
    fontSize: 13,
    color: '#777168',
    paddingVertical: 20,
  },

  /* TOP SELLING */

  topSellingGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  topSellingItem: {
    width: '48.2%',
  },

  topSellingCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 7,
    borderWidth: 1,
    borderColor: '#E7DED1',
  },

  topSellingImageBox: {
    width: '100%',
    height: 112,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },

  topSellingImage: {
    width: '78%',
    height: '78%',
  },

  topSellingOutOfStock: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#55524C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topSellingInfo: {
    width: '100%',
  },

  topSellingName: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '800',
    color: '#24221E',
    marginTop: 7,
    marginBottom: 5,
  },

  topSellingBottom: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topSellingPrice: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '900',
    color: '#E35B3F',
    marginRight: 5,
  },

  unavailableTopSellingPrice: {
    color: '#A9A49D',
  },

  topSellingLoginPrice: {
    flex: 1,
    fontSize: 7.5,
    color: '#938C82',
    fontWeight: '600',
    marginRight: 4,
  },

  topSellingFavorite: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 2,
  },

  topSellingAddButton: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topSellingDisabledButton: {
    backgroundColor: '#B8B3AA',
  },

  categoriesLoading: {
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },

  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  departmentCard: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DED1',
    backgroundColor: '#FFFFFF',
    padding: 12,
    minHeight: 178,
  },
  departmentVisual: {
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F8F2EA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  departmentImage: { width: '100%', height: '100%' },
  departmentName: { fontSize: 13, fontWeight: '800', color: '#171717', minHeight: 34 },
  departmentExplore: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  departmentExploreText: { color: '#E35B3F', fontSize: 10, fontWeight: '700' },
  departmentEmpty: { paddingVertical: 16, alignItems: 'center' },
  departmentRetry: { padding: 12 },
  categories: {
    gap: 12,
    paddingBottom: 10,
    marginBottom: 0,
  },

  category: {
    width: 82,
    alignItems: 'center',
  },

  categoryIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E6DED2',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 17,
    backgroundColor: '#F8F2EA',
    borderWidth: 1,
    borderColor: '#EEE4D7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },

  categoryName: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#37342F',
    textAlign: 'center',
    lineHeight: 13,
  },

  recentProducts: {
    gap: 16,
    paddingBottom: 10,
    marginBottom: 0,
  },

  recentItem: {
    width: 92,
    alignItems: 'center',
  },

  recentImageBox: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  recentImage: {
    width: '82%',
    height: '82%',
  },

  recentHeart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  recentDiscount: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#E35B3F',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
  },

  recentDiscountText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
  },

  recentName: {
    marginTop: 8,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#37342F',
    textAlign: 'center',
    width: 90,
  },

  recentPrice: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '900',
    color: '#E35B3F',
    textAlign: 'center',
  },

  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 13,
  },

  offerAccent: {
    width: 5,
    height: 22,
    borderRadius: 3,
    backgroundColor: '#E35B3F',
    marginRight: 9,
  },

  offerShowcase: {
    width: '100%',
    backgroundColor: '#171717',
    borderRadius: 21,
    overflow: 'hidden',
    minHeight: 164,
    borderWidth: 1,
    borderColor: '#2B2A28',
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.14,
    shadowRadius: 13,
    elevation: 5,
  },

  offerShowcasePressable: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 164,
  },

  offerVisual: {
    width: '43%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  offerShowcaseImage: {
    width: '84%',
    height: '84%',
  },

  offerBadge: {
    position: 'absolute',
    top: 11,
    left: 10,
    backgroundColor: '#E35B3F',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  offerBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },

  offerInfo: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
    justifyContent: 'center',
  },

  offerMiniLabel: {
    fontSize: 7,
    color: '#A9A29A',
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },

  offerProductName: {
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    fontWeight: '900',
    marginBottom: 7,
  },

  offerPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  offerOldPrice: {
    fontSize: 10,
    color: '#8F8981',
    textDecorationLine: 'line-through',
    fontWeight: '700',
  },

  offerNewPrice: {
    fontSize: 17,
    color: '#E35B3F',
    fontWeight: '900',
  },

  loginOfferPrice: {
    color: '#B4ADA4',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 10,
  },

  offerAddButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#E35B3F',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  offerAddText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  offerIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 9,
  },

  offerIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D0C8BE',
  },

  offerIndicatorActive: {
    width: 15,
    backgroundColor: '#E35B3F',
  },

  emptyOffer: {
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DED1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyOfferText: {
    marginTop: 7,
    fontSize: 11,
    color: '#817B71',
    fontWeight: '700',
  },

  bottomSpace: {
    height: 25,
  },

  bottomNav: {
    height: 76,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E7DED1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 5,
    shadowColor: '#171717',
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 9,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  activeNavIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#E35B3F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E35B3F',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },

  navText: {
    fontSize: 10,
    color: '#817B71',
    fontWeight: '600',
  },

  navTextActive: {
    fontSize: 10,
    color: '#E35B3F',
    fontWeight: '900',
  },

  navIconWrapper: {
    position: 'relative',
  },

  navBadge: {
    position: 'absolute',
    top: -7,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E35B3F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
