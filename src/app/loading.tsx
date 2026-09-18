import {
  View,
  Image,
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

export default function Loading() {
  // =====================================================
  // LOADING ANIMATION
  // =====================================================

  const dotAnimation =
    useRef(
      new Animated.Value(0)
    ).current;

  // =====================================================
  // START
  // =====================================================

  useEffect(() => {
    // ===================================================
    // DOT ANIMATION
    // ===================================================

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

    // ===================================================
    // GO TO HOME
    // ===================================================

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
          YOUR DESIGN
      ================================================= */}

      <Image
        source={
          require(
            '../../assets/images/loading-screen.png'
          )
        }
        style={
          styles.backgroundImage
        }
        resizeMode="cover"
      />

      {/* =================================================
          LOADING DOTS
      ================================================= */}

      <View
        style={
          styles.loadingContainer
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
        '#E8DED0',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    // ===================================================
    // BACKGROUND IMAGE
    // ===================================================

    backgroundImage: {
      position:
        'absolute',

      width:
        '97%',

      height:
        '95%',
    },

    // ===================================================
    // LOADING
    // ===================================================

    loadingContainer: {
      position:
        'absolute',

      bottom:
        '11%',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,
    },

    dot: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,

      backgroundColor:
        '#EF5A3C',
    },
  });