import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
  useRef,
  useEffect,
} from 'react';


/* =========================================================
API
========================================================= */

const API_URL =
  'https://mystore-backend-u6ey.onrender.com';


/* =========================================================
TYPES
========================================================= */

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


type TopSellingProduct =
  Product & {
    totalSold: number;
  };


type OfferProduct =
  Product & {
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


/* =========================================================
DEFAULT CATEGORY ICON
========================================================= */

const getCategoryIcon =
  (
    categoryName: string
  ): keyof typeof Ionicons.glyphMap => {

    const name =
      categoryName
        .toLowerCase()
        .trim();

    if (
      name.includes('chocolate')
    ) {
      return 'cafe-outline';
    }

    if (
      name.includes('wafer')
    ) {
      return 'layers-outline';
    }

    if (
      name.includes('chip') ||
      name.includes('snack')
    ) {
      return 'fast-food-outline';
    }

    if (
      name.includes('drink') ||
      name.includes('beverage')
    ) {
      return 'water-outline';
    }

    if (
      name.includes('candy') ||
      name.includes('sweet')
    ) {
      return 'heart-outline';
    }

    if (
      name.includes('cookie') ||
      name.includes('biscuit')
    ) {
      return 'nutrition-outline';
    }

    if (
      name.includes('ice cream') ||
      name.includes('icecream')
    ) {
      return 'ice-cream-outline';
    }

    if (
      name.includes('coffee')
    ) {
      return 'cafe-outline';
    }

    if (
      name.includes('international') ||
      name.includes('brand')
    ) {
      return 'globe-outline';
    }

    return 'pricetag-outline';
  };


/* =========================================================
IMAGE URL HELPER
========================================================= */

const buildImageUrl =
  (
    image: any
  ): string => {

    if (!image) {
      return '';
    }

    /*
     * Sometimes the backend can return
     * an image as an object.
     */

    if (
      typeof image === 'object'
    ) {

      image =
        image.url ??
        image.path ??
        image.filename ??
        image.file ??
        image.image ??
        '';

    }

    if (
      typeof image !== 'string'
    ) {
      return '';
    }

    let value =
      image.trim();

    if (!value) {
      return '';
    }

    /*
     * Already a complete URL.
     */

    if (
      value.startsWith('http://') ||
      value.startsWith('https://')
    ) {

      return value;
    }

    /*
     * Remove file:///
     */

    if (
      value.startsWith('file:///')
    ) {

      value =
        value.replace(
          'file:///',
          ''
        );
    }

    /*
     * Windows local path.
     */

    if (
      /^[A-Za-z]:[\\/]/.test(value)
    ) {

      const parts =
        value.split(
          /[\\/]/
        );

      value =
        parts[
          parts.length - 1
        ];
    }

    /*
     * Normalize Windows slashes.
     */

    value =
      value.replace(
        /\\/g,
        '/'
      );

    /*
     * Remove leading slash.
     */

    value =
      value.replace(
        /^\/+/,
        ''
      );

    /*
     * uploads/filename.jpg
     */

    if (
      value.startsWith(
        'uploads/'
      )
    ) {

      return `${API_URL}/${value}`;
    }

    /*
     * images/filename.jpg
     */

    if (
      value.startsWith(
        'images/'
      )
    ) {

      return `${API_URL}/uploads/${value}`;
    }

    /*
     * Just filename.
     */

    return `${API_URL}/uploads/${value}`;
  };


/* =========================================================
HOME
========================================================= */

export default function Index() {

  /* =======================================================
  PRODUCTS STATE
  ======================================================= */

  const [products, setProducts] =
    useState<Product[]>([]);

  const [topSellingProducts, setTopSellingProducts] =
    useState<TopSellingProduct[]>([]);

  const [offerProducts, setOfferProducts] =
    useState<OfferProduct[]>([]);


  /* =======================================================
  CATEGORIES STATE
  ======================================================= */

  const [categories, setCategories] =
    useState<Category[]>([
      {
        id: 'all',
        name: 'ALL',
        image: '',
        icon: 'apps-outline',
      },
    ]);

  const [categoriesLoading, setCategoriesLoading] =
    useState(false);


  /* =======================================================
  USER STATE
  ======================================================= */

  const [cartCount, setCartCount] =
    useState(0);

  const [favorites, setFavorites] =
    useState<Product[]>([]);

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);


  /* =======================================================
  SLIDESHOW STATE
  ======================================================= */

  const [slides, setSlides] =
    useState<Slide[]>([]);

  const [slidesLoading, setSlidesLoading] =
    useState(true);

  const [currentSlide, setCurrentSlide] =
    useState(0);

  const slideAnimation =
    useRef(
      new Animated.Value(0)
    ).current;


  /* =======================================================
  REFS
  ======================================================= */

  const scrollViewRef =
    useRef<ScrollView>(null);

  const offersSectionY =
    useRef(0);

  const accessTokenRef =
    useRef<string | null>(null);

  const homeLoadedRef =
    useRef(false);

  const loadingHomeRef =
    useRef(false);


  /* =======================================================
  ALERT
  ======================================================= */

  const [alertVisible, setAlertVisible] =
    useState(false);

  const [alertMessage, setAlertMessage] =
    useState('');

  const alertOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const alertTranslateY =
    useRef(
      new Animated.Value(-40)
    ).current;


  /* =======================================================
  GET TOKEN
  ======================================================= */

  const getAccessToken =
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
    };


  /* =======================================================
  CONVERT SLIDE
  ======================================================= */

  const convertSlide =
    (
      slide: any
    ): Slide => {

      const slideId =
        String(
          slide._id ??
          slide.id
        );

      const imageUrl =
        buildImageUrl(
          slide.image
        );

      return {

        id:
          slideId,

        image:
          imageUrl,

        order:
          Number(
            slide.order
          ) || 1,

        active:
          slide.active !== false,
      };
    };


  /* =======================================================
  LOAD SLIDESHOW
  ======================================================= */

  const loadSlideshow =
    async () => {

      try {

        setSlidesLoading(
          true
        );

        const response =
          await fetch(
            `${API_URL}/slideshows`,
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

        if (!response.ok) {

          console.log(
            'GET SLIDESHOW ERROR:',
            response.status,
            data
          );

          setSlides([]);

          return;
        }

        if (
          !Array.isArray(
            data.slides
          )
        ) {

          console.log(
            'INVALID SLIDESHOW RESPONSE:',
            data
          );

          setSlides([]);

          return;
        }

        const convertedSlides:
          Slide[] =
          data.slides
            .map(
              (
                slide: any
              ) =>
                convertSlide(
                  slide
                )
            )
            .filter(
              (
                slide: Slide
              ) =>
                slide.active &&
                !!slide.image
            )
            .sort(
              (
                a: Slide,
                b: Slide
              ) =>
                a.order -
                b.order
            );

        setSlides(
          convertedSlides
        );

        setCurrentSlide(
          previousSlide => {

            if (
              convertedSlides.length === 0
            ) {
              return 0;
            }

            if (
              previousSlide >=
              convertedSlides.length
            ) {
              return 0;
            }

            return previousSlide;
          }
        );

      } catch (error) {

        console.log(
          'LOAD SLIDESHOW ERROR:',
          error
        );

        setSlides([]);

      } finally {

        setSlidesLoading(
          false
        );
      }
    };


  /* =======================================================
  LOAD CATEGORIES
  ======================================================= */

  const loadCategories =
    async () => {

      try {

        setCategoriesLoading(
          true
        );

        const response =
          await fetch(
            `${API_URL}/categories`,
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

        if (!response.ok) {

          console.log(
            'GET CATEGORIES ERROR:',
            response.status,
            data
          );

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


        /*
         * Backend can return:
         *
         * [
         *   {...}
         * ]
         *
         * OR:
         *
         * {
         *   categories: [...]
         * }
         */

        const rawCategories =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data.categories
              )
              ? data.categories
              : [];


        console.log(
          'CATEGORIES FROM DB:',
          rawCategories
        );


        const convertedCategories:
          Category[] =
          rawCategories
            .map(
              (
                category: any
              ) => {

                /*
                 * If backend sends
                 * a plain string.
                 */

                if (
                  typeof category ===
                  'string'
                ) {

                  return {

                    id:
                      category,

                    name:
                      category,

                    image:
                      '',

                    icon:
                      getCategoryIcon(
                        category
                      ),

                  };
                }


                /*
                 * CATEGORY NAME
                 */

                const categoryName =
                  category.name ??
                  category.title ??
                  '';


                if (
                  !categoryName
                ) {

                  return null;
                }


                /*
                 * CATEGORY ID
                 */

                const categoryId =
                  String(
                    category._id ??
                    category.id ??
                    categoryName
                  );


                /*
                 * =================================================
                 * IMPORTANT:
                 *
                 * TAKE THE CATEGORY IMAGE FROM THE DB.
                 * =================================================
                 */

                const rawImage =
                  category.image ??
                  category.imageUrl ??
                  category.imageURL ??
                  category.photo ??
                  '';


                const categoryImage =
                  buildImageUrl(
                    rawImage
                  );


                console.log(
                  'CATEGORY:',
                  categoryName,
                  'IMAGE FROM DB:',
                  rawImage,
                  'FINAL IMAGE:',
                  categoryImage
                );


                return {

                  id:
                    categoryId,

                  name:
                    String(
                      categoryName
                    ),

                  /*
                   * This is the image
                   * coming from MongoDB.
                   */

                  image:
                    categoryImage,

                  /*
                   * Icon is ONLY fallback.
                   */

                  icon:
                    getCategoryIcon(
                      String(
                        categoryName
                      )
                    ),

                };

              }
            )
            .filter(
              (
                category:
                  Category | null
              ): category is Category =>
                category !== null
            );


        /*
         * ALL ALWAYS EXISTS.
         *
         * ALL uses the old icon.
         *
         * We also prevent another
         * "ALL" coming from DB from
         * appearing twice.
         */

        const filteredCategories =
          convertedCategories.filter(
            category =>
              category.name
                .trim()
                .toLowerCase() !==
              'all'
          );


        setCategories([

          {
            id:
              'all',

            name:
              'ALL',

            image:
              '',

            icon:
              'apps-outline',
          },

          ...filteredCategories,

        ]);

      } catch (error) {

        console.log(
          'LOAD CATEGORIES ERROR:',
          error
        );

        /*
         * Keep ALL even if API fails.
         */

        setCategories([
          {
            id:
              'all',

            name:
              'ALL',

            image:
              '',

            icon:
              'apps-outline',
          },
        ]);

      } finally {

        setCategoriesLoading(
          false
        );
      }
    };


  /* =======================================================
  NEXT SLIDE
  ======================================================= */

  const goToNextSlide =
    useCallback(() => {

      if (
        slides.length <= 1
      ) {
        return;
      }

      Animated.timing(
        slideAnimation,
        {
          toValue: -1,
          duration: 300,
          useNativeDriver: true,
        }
      ).start(() => {

        setCurrentSlide(
          previousSlide =>
            (
              previousSlide + 1
            ) %
            slides.length
        );

        slideAnimation.setValue(
          1
        );

        Animated.timing(
          slideAnimation,
          {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }
        ).start();

      });

    }, [
      slideAnimation,
      slides.length,
    ]);


  /* =======================================================
  PREVIOUS SLIDE
  ======================================================= */

  const goToPreviousSlide =
    useCallback(() => {

      if (
        slides.length <= 1
      ) {
        return;
      }

      Animated.timing(
        slideAnimation,
        {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }
      ).start(() => {

        setCurrentSlide(
          previousSlide =>
            (
              previousSlide -
              1 +
              slides.length
            ) %
            slides.length
        );

        slideAnimation.setValue(
          -1
        );

        Animated.timing(
          slideAnimation,
          {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }
        ).start();

      });

    }, [
      slideAnimation,
      slides.length,
    ]);


  /* =======================================================
  AUTOMATIC SLIDESHOW
  ======================================================= */

  useEffect(() => {

    if (
      slides.length <= 1
    ) {
      return;
    }

    const interval =
      setInterval(() => {

        goToNextSlide();

      }, 3500);

    return () => {

      clearInterval(
        interval
      );
    };

  }, [
    goToNextSlide,
    slides.length,
  ]);


  /* =======================================================
  SWIPE
  ======================================================= */

  const panResponder =
    useRef(
      PanResponder.create({

        onStartShouldSetPanResponder:
          () => false,

        onMoveShouldSetPanResponder:
          (
            _,
            gestureState
          ) => {

            const horizontalMovement =
              Math.abs(
                gestureState.dx
              );

            const verticalMovement =
              Math.abs(
                gestureState.dy
              );

            return (
              horizontalMovement > 12 &&
              horizontalMovement > verticalMovement
            );
          },

        onPanResponderTerminationRequest:
          () => false,

        onPanResponderRelease:
          (
            _,
            gestureState
          ) => {

            if (
              gestureState.dx < -50
            ) {

              goToNextSlide();

            } else if (
              gestureState.dx > 50
            ) {

              goToPreviousSlide();

            }
          },

      })
    ).current;


  /* =======================================================
  SCROLL TO OFFERS
  ======================================================= */

  const scrollToOffers =
    () => {

      scrollViewRef.current?.scrollTo({

        y:
          Math.max(
            offersSectionY.current - 20,
            0
          ),

        animated:
          true,

      });
    };


  /* =======================================================
  OPEN ALL PRODUCTS
  ======================================================= */

  const openAllProducts =
    () => {

      router.push({

        pathname:
          '/category-products',

        params: {
          category:
            'ALL',
        },

      });
    };


  /* =======================================================
  ALERT
  ======================================================= */

  const showAlert =
    (
      message: string
    ) => {

      setAlertMessage(
        message
      );

      setAlertVisible(
        true
      );

      alertOpacity.setValue(
        0
      );

      alertTranslateY.setValue(
        -40
      );

      Animated.parallel([

        Animated.timing(
          alertOpacity,
          {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }
        ),

        Animated.spring(
          alertTranslateY,
          {
            toValue: 0,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }
        ),

      ]).start();

      setTimeout(() => {

        Animated.parallel([

          Animated.timing(
            alertOpacity,
            {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            alertTranslateY,
            {
              toValue: -25,
              duration: 250,
              useNativeDriver: true,
            }
          ),

        ]).start(() => {

          setAlertVisible(
            false
          );

        });

      }, 2200);
    };


  /* =======================================================
  CONVERT PRODUCT
  ======================================================= */

  const convertProduct =
    (
      product: any
    ): Product => {

      const productId =
        String(
          product._id ??
          product.id
        );

      return {

        id:
          productId,

        name:
          product.name,

        description:
          product.description,

        image:
          buildImageUrl(
            product.image
          ),

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
          Number(
            product.discount
          ) || 0,

        availability:
          product.availability !== false,

      };
    };


  /* =======================================================
  LOAD PRODUCTS
  ======================================================= */

  const loadProducts =
    async (
      accessToken?: string | null
    ) => {

      try {

        const token =
          accessToken ??
          accessTokenRef.current;

        const headers:
          Record<string, string> = {

          Accept:
            'application/json',

        };

        if (token) {

          headers.Authorization =
            `Bearer ${token}`;
        }

        const response =
          await fetch(
            `${API_URL}/products`,
            {
              method: 'GET',
              headers,
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          console.log(
            'GET PRODUCTS ERROR:',
            data
          );

          setProducts([]);

          return;
        }

        if (
          !data.products ||
          !Array.isArray(
            data.products
          )
        ) {

          console.log(
            'INVALID PRODUCTS RESPONSE:',
            data
          );

          setProducts([]);

          return;
        }

        const convertedProducts:
          Product[] =
          data.products.map(
            (
              product: any
            ) =>
              convertProduct(
                product
              )
          );

        setProducts(
          convertedProducts
        );

      } catch (error) {

        console.log(
          'LOAD PRODUCTS ERROR:',
          error
        );

        setProducts([]);
      }
    };


  /* =======================================================
  LOAD OFFERS
  ======================================================= */

  const loadOffers =
    async (
      accessToken?: string | null
    ) => {

      try {

        const token =
          accessToken ??
          accessTokenRef.current;

        const headers:
          Record<string, string> = {

          Accept:
            'application/json',

        };

        if (token) {

          headers.Authorization =
            `Bearer ${token}`;
        }

        const response =
          await fetch(
            `${API_URL}/products/offers`,
            {
              method: 'GET',
              headers,
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          console.log(
            'GET OFFERS ERROR:',
            response.status,
            data
          );

          setOfferProducts([]);

          return;
        }

        if (
          !Array.isArray(
            data.products
          )
        ) {

          console.log(
            'INVALID OFFERS RESPONSE:',
            data
          );

          setOfferProducts([]);

          return;
        }

        const convertedOffers:
          OfferProduct[] =
          data.products
            .map(
              (
                product: any
              ) => {

                const converted =
                  convertProduct(
                    product
                  );

                return {

                  ...converted,

                  discount:
                    Number(
                      product.discount
                    ) || 0,

                };
              }
            )
            .filter(
              (
                product:
                  OfferProduct
              ) =>
                product.discount > 0
            );

        setOfferProducts(
          convertedOffers
        );

      } catch (error) {

        console.log(
          'LOAD OFFERS ERROR:',
          error
        );

        setOfferProducts([]);
      }
    };


  /* =======================================================
  LOAD TOP SELLING
  ======================================================= */

  const loadTopSelling =
    async (
      accessToken?: string | null
    ) => {

      try {

        const token =
          accessToken ??
          accessTokenRef.current;

        const headers:
          Record<string, string> = {

          Accept:
            'application/json',

        };

        if (token) {

          headers.Authorization =
            `Bearer ${token}`;
        }

        const response =
          await fetch(
            `${API_URL}/products/top-selling`,
            {
              method: 'GET',
              headers,
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          console.log(
            'GET TOP SELLING ERROR:',
            response.status,
            data
          );

          setTopSellingProducts([]);

          return;
        }

        if (
          !Array.isArray(
            data.products
          )
        ) {

          console.log(
            'INVALID TOP SELLING RESPONSE:',
            data
          );

          setTopSellingProducts([]);

          return;
        }

        const convertedTopSelling:
          TopSellingProduct[] =
          data.products
            .map(
              (
                item: any
              ) => {

                if (
                  !item.product
                ) {

                  return null;
                }

                const product =
                  convertProduct(
                    item.product
                  );

                return {

                  ...product,

                  totalSold:
                    Number(
                      item.totalSold
                    ) || 0,

                };
              }
            )
            .filter(
              (
                product:
                  TopSellingProduct | null
              ): product is TopSellingProduct =>
                product !== null
            );

        setTopSellingProducts(
          convertedTopSelling
        );

      } catch (error) {

        console.log(
          'LOAD TOP SELLING ERROR:',
          error
        );

        setTopSellingProducts([]);
      }
    };


  /* =======================================================
  LOAD CART COUNT
  ======================================================= */

  const loadCartCount =
    async (
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

        const response =
          await fetch(
            `${API_URL}/cart`,
            {
              method: 'GET',

              headers: {

                Accept:
                  'application/json',

                Authorization:
                  `Bearer ${token}`,

              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          console.log(
            'GET CART COUNT ERROR:',
            data
          );

          setCartCount(0);

          return;
        }

        const items =
          data.cart?.items || [];

        const count =
          items.reduce(
            (
              total: number,
              item: any
            ) =>
              total +
              (
                Number(
                  item.quantity
                ) || 0
              ),
            0
          );

        setCartCount(
          count
        );

      } catch (error) {

        console.log(
          'LOAD CART COUNT ERROR:',
          error
        );

        setCartCount(0);
      }
    };


  /* =======================================================
  LOAD FAVORITES
  ======================================================= */

  const loadFavorites =
    async (
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

        const response =
          await fetch(
            `${API_URL}/favorites`,
            {
              method: 'GET',

              headers: {

                Accept:
                  'application/json',

                Authorization:
                  `Bearer ${token}`,

              },
            }
          );

        const data =
          await response.json();

        if (
          response.status === 401 ||
          response.status === 403
        ) {

          setFavorites([]);

          return;
        }

        if (!response.ok) {

          console.log(
            'GET FAVORITES ERROR:',
            data
          );

          setFavorites([]);

          return;
        }

        const convertedFavorites:
          Product[] =
          (data.favorites || [])
            .map(
              (
                favorite: any
              ) => {

                const product =
                  favorite.product;

                if (!product) {

                  return null;
                }

                return convertProduct(
                  product
                );
              }
            )
            .filter(
              (
                product:
                  Product | null
              ): product is Product =>
                product !== null
            );

        setFavorites(
          convertedFavorites
        );

      } catch (error) {

        console.log(
          'LOAD FAVORITES ERROR:',
          error
        );

        setFavorites([]);
      }
    };


  /* =======================================================
  LOAD LOCAL LOGIN DATA
  ======================================================= */

  const loadData =
    async () => {

      try {

        const [
          accessToken,
          savedUser,
          loginStatus,
        ] =
          await AsyncStorage.multiGet([
            'accessToken',
            'user',
            'isLoggedIn',
          ]);

        const token =
          accessToken[1];

        const user =
          savedUser[1];

        const status =
          loginStatus[1];

        accessTokenRef.current =
          token;

        const loggedIn =
          !!token &&
          (
            status === 'true' ||
            !!user
          );

        setIsLoggedIn(
          loggedIn
        );

        return {
          token,
          loggedIn,
        };

      } catch (error) {

        console.log(
          'LOAD HOME DATA ERROR:',
          error
        );

        return {
          token: null,
          loggedIn: false,
        };
      }
    };


  /* =======================================================
  LOAD EVERYTHING
  ======================================================= */

  const loadHome =
    async () => {

      if (
        loadingHomeRef.current
      ) {

        return;
      }

      loadingHomeRef.current =
        true;

      try {

        const {
          token,
          loggedIn,
        } =
          await loadData();

        const requests = [

          loadSlideshow(),

          loadCategories(),

          loadProducts(token),

          loadOffers(token),

          loadTopSelling(token),

        ];

        if (loggedIn) {

          requests.push(
            loadCartCount(token),
            loadFavorites(token)
          );

        } else {

          setCartCount(0);
          setFavorites([]);

        }

        await Promise.all(
          requests
        );

        homeLoadedRef.current =
          true;

      } catch (error) {

        console.log(
          'HOME LOAD ERROR:',
          error
        );

      } finally {

        loadingHomeRef.current =
          false;
      }
    };


  /* =======================================================
  REFRESH HOME
  ======================================================= */

  useFocusEffect(
    useCallback(() => {

      if (
        !homeLoadedRef.current
      ) {

        loadHome();

        return;
      }

      const refreshUserData =
        async () => {

          const {
            token,
            loggedIn,
          } =
            await loadData();

          if (loggedIn) {

            await Promise.all([

              loadCartCount(
                token
              ),

              loadFavorites(
                token
              ),

            ]);

          } else {

            setCartCount(0);
            setFavorites([]);

          }

        };

      refreshUserData();

    }, [])
  );


  /* =======================================================
  OPEN PRODUCT
  ======================================================= */

  const openProduct =
    (
      product: Product
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


  /* =======================================================
  FAVORITE
  ======================================================= */

  const toggleFavorite =
    async (
      product: Product
    ) => {

      if (!isLoggedIn) {

        router.push(
          '/login'
        );

        return;
      }

      try {

        const accessToken =
          await getAccessToken();

        if (!accessToken) {

          router.push(
            '/login'
          );

          return;
        }

        const alreadyFavorite =
          favorites.some(
            item =>
              item.id ===
              product.id
          );

        const response =
          await fetch(

            alreadyFavorite
              ? `${API_URL}/favorites/remove`
              : `${API_URL}/favorites/add`,

            {

              method:
                alreadyFavorite
                  ? 'DELETE'
                  : 'POST',

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

                }),

            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          console.log(
            'TOGGLE FAVORITE ERROR:',
            data
          );

          return;
        }

        await loadFavorites(
          accessToken
        );

      } catch (error) {

        console.log(
          'TOGGLE FAVORITE ERROR:',
          error
        );
      }
    };


  /* =======================================================
  IS FAVORITE
  ======================================================= */

  const isFavorite =
    (
      id: string
    ) => {

      return favorites.some(
        item =>
          item.id === id
      );
    };


  /* =======================================================
  ADD TO CART
  ======================================================= */

  const addToCart =
    async (
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

        router.push(
          '/login'
        );

        return;
      }

      try {

        const accessToken =
          await getAccessToken();

        if (!accessToken) {

          router.push(
            '/login'
          );

          return;
        }

        const finalPrice =
          cartPrice ??
          product.price;

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

                  ...(finalPrice !==
                    undefined && {

                    price:
                      finalPrice,

                  }),

                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          console.log(
            'ADD TO CART ERROR:',
            data
          );

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

        console.log(
          'ADD TO CART ERROR:',
          error
        );
      }
    };


  /* =======================================================
  OPEN CATEGORY
  ======================================================= */

  const openCategory =
    (
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


  /* =======================================================
  OPEN ACCOUNT
  ======================================================= */

  const openAccount =
    () => {

      if (!isLoggedIn) {

        router.push(
          '/login'
        );

      } else {

        router.push(
          '/account'
        );

      }
    };


  /* =======================================================
  HOME SECTIONS
  ======================================================= */

  const topSelling =
    topSellingProducts.slice(
      0,
      4
    );

  const recentlyAdded =
    products.slice(
      0,
      4
    );


  /* =======================================================
  CURRENT SLIDE
  ======================================================= */

  const activeSlide =
    slides[currentSlide];


  /* =======================================================
  RETURN
  ======================================================= */

  return (

    <View
      style={
        styles.container
      }
    >

      {/* =================================================
      ALERT
      ================================================= */}

      {alertVisible && (

        <Animated.View
          style={[
            styles.homeAlert,

            {
              opacity:
                alertOpacity,

              transform: [
                {
                  translateY:
                    alertTranslateY,
                },
              ],
            },
          ]}
        >

          <View
            style={
              styles.homeAlertIcon
            }
          >

            <Ionicons
              name="checkmark"
              size={22}
              color="#FFFFFF"
            />

          </View>

          <View
            style={
              styles.homeAlertContent
            }
          >

            <Text
              style={
                styles.homeAlertTitle
              }
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
            color="#4CAF50"
          />

        </Animated.View>

      )}


      {/* =================================================
      MAIN CONTENT
      ================================================= */}

      <ScrollView
        ref={
          scrollViewRef
        }
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

          <View>

            <Text
              style={
                styles.logo
              }
            >
              BStore
            </Text>

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
              size={23}
              color="#D4AF37"
            />

          </Pressable>

        </View>


        {/* =================================================
        SLIDESHOW
        ================================================= */}

        <View
          style={
            styles.slider
          }
          {...panResponder.panHandlers}
        >

          {slidesLoading ? (

            <View
              style={
                styles.slideLoading
              }
            >

              <ActivityIndicator
                size="small"
                color="#D4AF37"
              />

            </View>

          ) : slides.length === 0 ? (

            <View
              style={
                styles.emptySlide
              }
            >

              <Ionicons
                name="images-outline"
                size={48}
                color="#D4AF37"
              />

              <Text
                style={
                  styles.emptySlideText
                }
              >
                No slideshow images
              </Text>

            </View>

          ) : (

            <Animated.View
              style={[
                styles.animatedSlide,

                {
                  transform: [
                    {
                      translateX:
                        slideAnimation.interpolate({

                          inputRange: [
                            -1,
                            0,
                            1,
                          ],

                          outputRange: [
                            -380,
                            0,
                            380,
                          ],

                        }),
                    },
                  ],
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
                resizeMode="cover"
              />

            </Animated.View>

          )}

        </View>


        {/* =================================================
        TOP SELLING
        ================================================= */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Top Selling
          </Text>

        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.horizontalProducts
          }
        >

          {topSelling.length > 0 ? (

            topSelling.map(
              product => {

                const discount =
                  Number(
                    product.discount || 0
                  );

                const isAvailable =
                  product.availability !== false;

                if (
                  discount > 0
                ) {

                  return (

                    <OfferProductCard
                      key={
                        product.id
                      }
                      product={{
                        ...product,
                        discount,
                      }}
                      isLoggedIn={
                        isLoggedIn
                      }
                      isFavorite={
                        isFavorite(
                          product.id
                        )
                      }
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

                        if (
                          !isAvailable
                        ) {

                          showAlert(
                            `${product.name} is currently out of stock.`
                          );

                          return;
                        }

                        if (
                          product.price === undefined ||
                          product.price === null
                        ) {

                          showAlert(
                            'Product price is not available.'
                          );

                          return;
                        }

                        const originalPrice =
                          Number(
                            product.price
                          );

                        if (
                          isNaN(
                            originalPrice
                          )
                        ) {

                          showAlert(
                            'Invalid product price.'
                          );

                          return;
                        }

                        const discountedPrice =
                          originalPrice *
                          (
                            1 -
                            discount /
                            100
                          );

                        addToCart(
                          product,
                          Number(
                            discountedPrice.toFixed(
                              2
                            )
                          )
                        );

                      }}
                    />

                  );
                }

                return (

                  <HomeProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                    isLoggedIn={
                      isLoggedIn
                    }
                    isFavorite={
                      isFavorite(
                        product.id
                      )
                    }
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
                    onAddToCart={() =>
                      addToCart(
                        product
                      )
                    }
                  />

                );

              }
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

        </ScrollView>


        {/* =================================================
        CATEGORIES
        ================================================= */}

        <View
          style={[
            styles.sectionHeader,
            styles.categorySectionHeader,
          ]}
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Categories
          </Text>

        </View>


        {categoriesLoading ? (

          <View
            style={
              styles.categoriesLoading
            }
          >

            <ActivityIndicator
              size="small"
              color="#D4AF37"
            />

          </View>

        ) : categories.length > 0 ? (

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.categories
            }
          >

            {categories.map(
              category => (

                <Pressable
                  key={
                    category.id
                  }
                  style={
                    styles.category
                  }
                  onPress={() =>
                    openCategory(
                      category.name
                    )
                  }
                >

                  <View
                    style={
                      styles.categoryIcon
                    }
                  >

                    {category.image &&
                    category.image.trim() !== '' ? (

                      /*
                       * CATEGORY IMAGE FROM DB
                       */

                      <Image
                        source={{
                          uri:
                            category.image,
                        }}
                        style={
                          styles.categoryImage
                        }
                        resizeMode="cover"
                        onError={(error) => {

                          console.log(
                            'CATEGORY IMAGE ERROR:',
                            category.name,
                            category.image,
                            error.nativeEvent
                          );

                        }}
                      />

                    ) : (

                      /*
                       * ALL = OLD ICON
                       *
                       * If another category has
                       * no image, use fallback icon.
                       */

                      <Ionicons
                        name={
                          category.icon ??
                          'pricetag-outline'
                        }
                        size={25}
                        color="#D4AF37"
                      />

                    )}

                  </View>

                  <Text
                    style={
                      styles.categoryName
                    }
                    numberOfLines={2}
                  >
                    {
                      category.name
                    }
                  </Text>

                </Pressable>

              )
            )}

          </ScrollView>

        ) : (

          <Text
            style={
              styles.emptyText
            }
          >
            No categories available.
          </Text>

        )}


        {/* =================================================
        RECENTLY ADDED
        ================================================= */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Recently Added
          </Text>

          <Pressable
            onPress={
              openAllProducts
            }
          >

            <Text
              style={
                styles.seeAll
              }
            >
              See All
            </Text>

          </Pressable>

        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.horizontalProducts
          }
        >

          {recentlyAdded.length > 0 ? (

            recentlyAdded.map(
              product => {

                const discount =
                  Number(
                    product.discount || 0
                  );

                const isAvailable =
                  product.availability !== false;

                if (
                  discount > 0
                ) {

                  return (

                    <OfferProductCard
                      key={
                        product.id
                      }
                      product={{
                        ...product,
                        discount,
                      }}
                      isLoggedIn={
                        isLoggedIn
                      }
                      isFavorite={
                        isFavorite(
                          product.id
                        )
                      }
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

                        if (
                          !isAvailable
                        ) {

                          showAlert(
                            `${product.name} is currently out of stock.`
                          );

                          return;
                        }

                        if (
                          product.price === undefined ||
                          product.price === null
                        ) {

                          showAlert(
                            'Product price is not available.'
                          );

                          return;
                        }

                        const originalPrice =
                          Number(
                            product.price
                          );

                        if (
                          isNaN(
                            originalPrice
                          )
                        ) {

                          showAlert(
                            'Invalid product price.'
                          );

                          return;
                        }

                        const discountedPrice =
                          originalPrice *
                          (
                            1 -
                            discount /
                            100
                          );

                        addToCart(
                          product,
                          Number(
                            discountedPrice.toFixed(
                              2
                            )
                          )
                        );

                      }}
                    />

                  );
                }

                return (

                  <HomeProductCard
                    key={
                      product.id
                    }
                    product={
                      product
                    }
                    isLoggedIn={
                      isLoggedIn
                    }
                    isFavorite={
                      isFavorite(
                        product.id
                      )
                    }
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
                    onAddToCart={() =>
                      addToCart(
                        product
                      )
                    }
                  />

                );

              }
            )

          ) : (

            <Text
              style={
                styles.emptyText
              }
            >
              No products available.
            </Text>

          )}

        </ScrollView>


        {/* =================================================
        OFFERS
        ================================================= */}

        <View
          onLayout={(event) => {

            offersSectionY.current =
              event.nativeEvent.layout.y;

          }}
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Offers
          </Text>

        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.horizontalProducts
          }
        >

          {offerProducts.length > 0 ? (

            offerProducts.map(
              product => (

                <OfferProductCard
                  key={
                    product.id
                  }
                  product={
                    product
                  }
                  isLoggedIn={
                    isLoggedIn
                  }
                  isFavorite={
                    isFavorite(
                      product.id
                    )
                  }
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

                    if (
                      product.availability === false
                    ) {

                      showAlert(
                        `${product.name} is currently out of stock.`
                      );

                      return;
                    }

                    if (
                      product.price === undefined
                    ) {

                      showAlert(
                        'Product price is not available.'
                      );

                      return;
                    }

                    const discountedPrice =
                      product.price *
                      (
                        1 -
                        product.discount /
                        100
                      );

                    addToCart(
                      product,
                      Number(
                        discountedPrice.toFixed(
                          2
                        )
                      )
                    );

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
              No offers available.
            </Text>

          )}

        </ScrollView>


        <View
          style={
            styles.bottomSpace
          }
        />

      </ScrollView>


      {/* =================================================
      BOTTOM NAVBAR
      ================================================= */}

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

          <Ionicons
            name="home"
            size={23}
            color="#000000"
          />

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
            size={23}
            color="#1A1A1A"
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
              size={23}
              color="#1A1A1A"
            />

            {favorites.length > 0 && (

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

            )}

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
              size={23}
              color="#1A1A1A"
            />

            {isLoggedIn &&
              cartCount > 0 && (

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

            )}

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
            size={23}
            color="#1A1A1A"
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

    </View>
  );
}


/* =========================================================
NORMAL PRODUCT CARD
========================================================= */

function HomeProductCard({
  product,
  large = false,
  isLoggedIn,
  isFavorite,
  onPress,
  onFavorite,
  onAddToCart,
}: {
  product: Product;
  large?: boolean;
  isLoggedIn: boolean;
  isFavorite: boolean;
  onPress: () => void;
  onFavorite: () => void;
  onAddToCart: () => void;
}) {

  const isAvailable =
    product.availability !== false;


  return (

    <Pressable
      style={[
        styles.productCard,
        large &&
          styles.largeProductCard,
        !isAvailable &&
          styles.unavailableCard,
      ]}
      onPress={
        onPress
      }
    >

      <View
        style={
          styles.productImage
        }
      >

        <Image
          source={{
            uri:
              product.image,
          }}
          style={[
            styles.productImageActual,
            !isAvailable &&
              styles.unavailableImage,
          ]}
          resizeMode="contain"
        />

        {!isAvailable && (

          <View
            style={
              styles.unavailableOverlay
            }
          >

            <View
              style={
                styles.unavailableBadge
              }
            >

              <Text
                style={
                  styles.unavailableText
                }
              >
                OUT OF STOCK
              </Text>

            </View>

          </View>

        )}

      </View>


      <Pressable
        style={
          styles.favoriteButton
        }
        onPress={
          onFavorite
        }
        hitSlop={5}
      >

        <Ionicons
          name={
            isFavorite
              ? 'heart'
              : 'heart-outline'
          }
          size={20}
          color={
            isFavorite
              ? '#D4AF37'
              : '#1A1A1A'
          }
        />

      </Pressable>


      <Text
        style={
          styles.productName
        }
        numberOfLines={1}
      >
        {
          product.name
        }
      </Text>


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

          {isLoggedIn &&
          product.price !== undefined ? (

            <Text
              style={[
                styles.price,
                !isAvailable &&
                  styles.unavailablePrice,
              ]}
            >
              $
              {Number(
                product.price
              ).toFixed(2)}
            </Text>

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


        <Pressable
          style={[
            styles.addButton,
            !isAvailable &&
              styles.disabledAddButton,
          ]}
          onPress={
            onAddToCart
          }
          disabled={
            !isAvailable
          }
        >

          <Ionicons
            name={
              isAvailable
                ? 'add'
                : 'close'
            }
            size={20}
            color="#FFFFFF"
          />

        </Pressable>

      </View>

    </Pressable>
  );
}


/* =========================================================
OFFER PRODUCT CARD
========================================================= */

function OfferProductCard({
  product,
  isLoggedIn,
  isFavorite,
  onPress,
  onFavorite,
  onAddToCart,
}: {
  product: OfferProduct;
  isLoggedIn: boolean;
  isFavorite: boolean;
  onPress: () => void;
  onFavorite: () => void;
  onAddToCart: () => void;
}) {

  const discountedPrice =
    product.price !== undefined
      ? product.price *
        (
          1 -
          product.discount /
          100
        )
      : undefined;


  const isAvailable =
    product.availability !== false;


  return (

    <Pressable
      style={[
        styles.offerProductCard,
        !isAvailable &&
          styles.unavailableCard,
      ]}
      onPress={
        onPress
      }
    >

      <View
        style={
          styles.offerProductImage
        }
      >

        <Image
          source={{
            uri:
              product.image,
          }}
          style={[
            styles.productImageActual,
            !isAvailable &&
              styles.unavailableImage,
          ]}
          resizeMode="contain"
        />


        {!isAvailable ? (

          <View
            style={
              styles.unavailableOverlay
            }
          >

            <View
              style={
                styles.unavailableBadge
              }
            >

              <Text
                style={
                  styles.unavailableText
                }
              >
                OUT OF STOCK
              </Text>

            </View>

          </View>

        ) : (

          <View
            style={
              styles.offerDiscountBadge
            }
          >

            <Text
              style={
                styles.offerDiscountText
              }
            >
              {
                product.discount
              }% OFF
            </Text>

          </View>

        )}

      </View>


      <Pressable
        style={
          styles.favoriteButton
        }
        onPress={
          onFavorite
        }
        hitSlop={5}
      >

        <Ionicons
          name={
            isFavorite
              ? 'heart'
              : 'heart-outline'
          }
          size={20}
          color={
            isFavorite
              ? '#D4AF37'
              : '#1A1A1A'
          }
        />

      </Pressable>


      <Text
        style={
          styles.productName
        }
        numberOfLines={1}
      >
        {
          product.name
        }
      </Text>


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

          {isLoggedIn &&
          product.price !== undefined &&
          discountedPrice !== undefined ? (

            <View>

              <Text
                style={[
                  styles.oldPrice,
                  !isAvailable &&
                    styles.unavailableOldPrice,
                ]}
              >
                $
                {Number(
                  product.price
                ).toFixed(2)}
              </Text>


              <Text
                style={[
                  styles.discountedPrice,
                  !isAvailable &&
                    styles.unavailablePrice,
                ]}
              >
                $
                {Number(
                  discountedPrice
                ).toFixed(2)}
              </Text>

            </View>

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


        <Pressable
          style={[
            styles.addButton,
            !isAvailable &&
              styles.disabledAddButton,
          ]}
          onPress={
            onAddToCart
          }
          disabled={
            !isAvailable
          }
        >

          <Ionicons
            name={
              isAvailable
                ? 'add'
                : 'close'
            }
            size={20}
            color="#FFFFFF"
          />

        </Pressable>

      </View>

    </Pressable>
  );
}


/* =========================================================
STYLES
========================================================= */

const styles =
  StyleSheet.create({

    container: {

      flex: 1,

      backgroundColor:
        '#F7F7F7',

    },

    scrollContent: {

      paddingHorizontal: 20,

      paddingTop: 18,

      paddingBottom: 20,

    },

    homeAlert: {

      position: 'absolute',

      top: 55,

      left: 18,

      right: 18,

      zIndex: 9999,

      minHeight: 68,

      backgroundColor: '#FFFFFF',

      borderRadius: 18,

      paddingVertical: 11,

      paddingHorizontal: 13,

      flexDirection: 'row',

      alignItems: 'center',

      borderWidth: 1,

      borderColor: '#E5E5E5',

      shadowColor: '#000000',

      shadowOffset: {

        width: 0,

        height: 6,

      },

      shadowOpacity: 0.15,

      shadowRadius: 14,

      elevation: 10,

    },

    homeAlertIcon: {

      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor: '#4CAF50',

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

      color: '#1A1A1A',

      marginBottom: 3,

    },

    homeAlertMessage: {

      fontSize: 11.5,

      color: '#777777',

      lineHeight: 16,

    },

    header: {

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      marginBottom: 20,

    },

    welcome: {

      fontSize: 13,

      color: '#1A1A1A',

      marginBottom: 2,

    },

    logo: {

      fontSize: 28,

      fontWeight: '800',

      color: '#000000',

    },

    accountButton: {

      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor: '#FFFFFF',

      borderWidth: 1,

      borderColor: '#E0E0E0',

      alignItems: 'center',

      justifyContent: 'center',

    },

    slider: {

      height: 190,

      width: '100%',

      backgroundColor: '#000000',

      borderRadius: 20,

      overflow: 'hidden',

      marginBottom: 28,

      position: 'relative',

    },

    slideLoading: {

      flex: 1,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor: '#000000',

    },

    emptySlide: {

      flex: 1,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor: '#000000',

    },

    emptySlideText: {

      color: '#FFFFFF',

      marginTop: 8,

      fontSize: 13,

      fontWeight: '600',

    },

    animatedSlide: {

      width: '100%',

      height: '100%',

      position: 'relative',

    },

    slideImage: {

      position: 'absolute',

      left: 0,

      top: 0,

      width: '100%',

      height: '100%',

    },

    sectionHeader: {

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

      marginBottom: 13,

    },

    categorySectionHeader: {

      marginTop: 8,

    },

    sectionTitle: {

      fontSize: 20,

      fontWeight: '800',

      color: '#000000',

    },

    seeAll: {

      fontSize: 13,

      fontWeight: '600',

      color: '#1A1A1A',

    },

    emptyText: {

      fontSize: 13,

      color: '#777777',

      paddingVertical: 20,

    },

    horizontalProducts: {

      gap: 12,

      paddingBottom: 8,

    },


    /* =====================================================
       CATEGORIES
    ===================================================== */

    categoriesLoading: {

      height: 92,

      alignItems: 'center',

      justifyContent: 'center',

      marginBottom: 28,

    },

    categories: {

      gap: 14,

      paddingBottom: 10,

      marginBottom: 28,

    },

    category: {

      width: 76,

      alignItems: 'center',

    },

    categoryIcon: {

      width: 58,

      height: 58,

      borderRadius: 29,

      backgroundColor: '#FFFFFF',

      borderWidth: 1,

      borderColor: '#E0E0E0',

      alignItems: 'center',

      justifyContent: 'center',

      marginBottom: 7,

      overflow: 'hidden',

    },

    categoryImage: {

      width: '100%',

      height: '100%',

      borderRadius: 29,

    },

    categoryName: {

      fontSize: 9,

      fontWeight: '600',

      color: '#1A1A1A',

      textAlign: 'center',

      lineHeight: 12,

    },


    /* =====================================================
       PRODUCTS
    ===================================================== */

    productCard: {

      width: 160,

      backgroundColor: '#FFFFFF',

      borderRadius: 17,

      borderWidth: 1,

      borderColor: '#E0E0E0',

      padding: 10,

      position: 'relative',

    },

    largeProductCard: {

      width: '100%',

    },

    productImage: {

      height: 125,

      borderRadius: 13,

      backgroundColor: '#FFFFFF',

      alignItems: 'center',

      justifyContent: 'center',

      overflow: 'hidden',

    },

    productImageActual: {

      width: '100%',

      height: '100%',

      borderRadius: 13,

    },

    offerProductCard: {

      width: 160,

      backgroundColor: '#FFFFFF',

      borderRadius: 17,

      borderWidth: 1,

      borderColor: '#E0E0E0',

      padding: 10,

      position: 'relative',

    },

    offerProductImage: {

      height: 125,

      borderRadius: 13,

      backgroundColor: '#FFFFFF',

      alignItems: 'center',

      justifyContent: 'center',

      overflow: 'hidden',

      position: 'relative',

    },

    offerDiscountBadge: {

      position: 'absolute',

      top: 8,

      left: 8,

      backgroundColor: '#000000',

      paddingHorizontal: 8,

      paddingVertical: 5,

      borderRadius: 7,

      zIndex: 3,

    },

    offerDiscountText: {

      color: '#D4AF37',

      fontSize: 9,

      fontWeight: '800',

      letterSpacing: 0.3,

    },

    favoriteButton: {

      position: 'absolute',

      top: 17,

      right: 17,

      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor: '#FFFFFF',

      borderWidth: 1,

      borderColor: '#E0E0E0',

      alignItems: 'center',

      justifyContent: 'center',

      zIndex: 5,

    },

    unavailableCard: {

      opacity: 0.72,

    },

    unavailableImage: {

      opacity: 0.55,

    },

    unavailableOverlay: {

      position: 'absolute',

      top: 0,

      left: 0,

      right: 0,

      bottom: 0,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        'rgba(255,255,255,0.15)',

      zIndex: 4,

    },

    unavailableBadge: {

      backgroundColor: '#000000',

      paddingHorizontal: 10,

      paddingVertical: 7,

      borderRadius: 8,

    },

    unavailableText: {

      color: '#FFFFFF',

      fontSize: 9,

      fontWeight: '800',

      letterSpacing: 0.5,

    },

    unavailablePrice: {

      color: '#999999',

    },

    unavailableOldPrice: {

      color: '#BBBBBB',

    },

    disabledAddButton: {

      backgroundColor: '#BDBDBD',

    },

    productName: {

      marginTop: 11,

      fontSize: 14,

      fontWeight: '700',

      color: '#000000',

    },

    productBottom: {

      marginTop: 9,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-between',

    },

    priceContainer: {

      flex: 1,

      paddingRight: 5,

    },

    price: {

      fontSize: 15,

      fontWeight: '800',

      color: '#000000',

    },

    loginPrice: {

      fontSize: 11,

      fontWeight: '600',

      color: '#1A1A1A',

    },

    oldPrice: {

      fontSize: 10,

      color: '#999999',

      textDecorationLine:
        'line-through',

      marginBottom: 1,

    },

    discountedPrice: {

      fontSize: 15,

      fontWeight: '800',

      color: '#000000',

    },

    addButton: {

      width: 31,

      height: 31,

      borderRadius: 16,

      backgroundColor: '#000000',

      alignItems: 'center',

      justifyContent: 'center',

    },

    bottomSpace: {

      height: 25,

    },

    bottomNav: {

      height: 72,

      backgroundColor: '#FFFFFF',

      borderTopWidth: 1,

      borderTopColor: '#E0E0E0',

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'space-around',

      paddingBottom: 5,

    },

    navItem: {

      flex: 1,

      alignItems: 'center',

      justifyContent: 'center',

      gap: 3,

    },

    navText: {

      fontSize: 10,

      color: '#1A1A1A',

      fontWeight: '500',

    },

    navTextActive: {

      fontSize: 10,

      color: '#000000',

      fontWeight: '700',

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

      backgroundColor: '#000000',

      alignItems: 'center',

      justifyContent: 'center',

      paddingHorizontal: 3,

    },

    navBadgeText: {

      color: '#FFFFFF',

      fontSize: 9,

      fontWeight: '700',

    },

  });
