import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

import {
  useEffect,
  useRef,
} from 'react';

import {
  router,
} from 'expo-router';

import {
  Ionicons,
} from '@expo/vector-icons';

export default function Loading() {
  // =====================================================
  // ANIMATIONS
  // =====================================================

  const logoOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const logoScale =
    useRef(
      new Animated.Value(0.85)
    ).current;

  const iconOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const iconScale =
    useRef(
      new Animated.Value(0.7)
    ).current;

  const loadingOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const dotAnimation =
    useRef(
      new Animated.Value(0)
    ).current;

  // =====================================================
  // START
  // =====================================================

  useEffect(() => {
    // LOGO ANIMATION

    Animated.parallel([
      Animated.timing(
        logoOpacity,
        {
          toValue: 1,
          duration: 600,
          easing: Easing.out(
            Easing.ease
          ),
          useNativeDriver: true,
        }
      ),

      Animated.spring(
        logoScale,
        {
          toValue: 1,
          friction: 6,
          tension: 55,
          useNativeDriver: true,
        }
      ),
    ]).start();

    // ICON ANIMATION

    Animated.parallel([
      Animated.timing(
        iconOpacity,
        {
          toValue: 1,
          duration: 500,
          delay: 250,
          useNativeDriver: true,
        }
      ),

      Animated.spring(
        iconScale,
        {
          toValue: 1,
          delay: 250,
          friction: 5,
          tension: 55,
          useNativeDriver: true,
        }
      ),
    ]).start();

    // LOADING TEXT

    Animated.timing(
      loadingOpacity,
      {
        toValue: 1,
        duration: 500,
        delay: 700,
        useNativeDriver: true,
      }
    ).start();

    // =================================================
    // DOT ANIMATION
    // =================================================

    Animated.loop(
      Animated.sequence([
        Animated.timing(
          dotAnimation,
          {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(
              Easing.ease
            ),
            useNativeDriver: true,
          }
        ),

        Animated.timing(
          dotAnimation,
          {
            toValue: 0,
            duration: 700,
            easing: Easing.inOut(
              Easing.ease
            ),
            useNativeDriver: true,
          }
        ),
      ])
    ).start();

    // =================================================
    // GO TO HOME
    // =================================================

    const timer =
      setTimeout(() => {
        router.replace('/');
      }, 4000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // =====================================================
  // DOT SCALE
  // =====================================================

  const dotScale =
    dotAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1.15],
    });

  // =====================================================
  // RETURN
  // =====================================================

  return (
    <View
      style={
        styles.container
      }
    >

      {/* =================================================
          LOGO
      ================================================= */}

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity:
              logoOpacity,

            transform: [
              {
                scale:
                  logoScale,
              },
            ],
          },
        ]}
      >

        {/* ICON */}

        <Animated.View
          style={[
            styles.iconCircle,
            {
              opacity:
                iconOpacity,

              transform: [
                {
                  scale:
                    iconScale,
                },
              ],
            },
          ]}
        >

          <Ionicons
            name="bag-handle-outline"
            size={45}
            color="#D4AF37"
          />

        </Animated.View>

        {/* NAME */}

        <Text
          style={
            styles.logo
          }
        >
          Welcome
        </Text>

        <Text
          style={
            styles.tagline
          }
        >
          Your favorites, all in one place
        </Text>

      </Animated.View>

      {/* =================================================
          LOADING
      ================================================= */}

      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity:
              loadingOpacity,
          },
        ]}
      >

        <Text
          style={
            styles.loadingText
          }
        >
          Loading
        </Text>

        <View
          style={
            styles.dots
          }
        >

          <Animated.View
            style={[
              styles.dot,
              {
                transform: [
                  {
                    scale:
                      dotScale,
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.dot,
              {
                transform: [
                  {
                    scale:
                      dotScale,
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.dot,
              {
                transform: [
                  {
                    scale:
                      dotScale,
                  },
                ],
              },
            ]}
          />

        </View>

      </Animated.View>

      {/* =================================================
          BOTTOM
      ================================================= */}

      <Text
        style={
          styles.bottomText
        }
      >
        SHOP • DISCOVER • ENJOY
      </Text>

    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles =
  StyleSheet.create({

    // ===================================================
    // CONTAINER
    // ===================================================

    container: {
      flex: 1,

      backgroundColor:
        '#F7F7F7',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        25,
    },

    // ===================================================
    // LOGO
    // ===================================================

    logoContainer: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    iconCircle: {
      width: 86,
      height: 86,

      borderRadius: 43,

      borderWidth: 1.5,
      borderColor:
        '#D4AF37',

      backgroundColor:
        '#FFFFFF',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        20,
    },

    logo: {
      color:
        '#000000',

      fontSize: 38,

      fontWeight:
        '900',

      letterSpacing:
        1,
    },

    tagline: {
      color:
        '#888888',

      fontSize: 12,

      marginTop: 7,

      letterSpacing:
        0.4,
    },

    // ===================================================
    // LOADING
    // ===================================================

    loadingContainer: {
      position:
        'absolute',

      bottom: 100,

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',
    },

    loadingText: {
      color:
        '#000000',

      fontSize: 12,

      fontWeight:
        '600',

      letterSpacing:
        0.8,
    },

    dots: {
      flexDirection:
        'row',

      marginLeft: 7,

      gap: 4,
    },

    dot: {
      width: 5,
      height: 5,

      borderRadius: 3,

      backgroundColor:
        '#D4AF37',
    },

    // ===================================================
    // BOTTOM
    // ===================================================

    bottomText: {
      position:
        'absolute',

      bottom: 35,

      color:
        '#888888',

      fontSize: 9,

      fontWeight:
        '700',

      letterSpacing:
        1.5,
    },
  });

