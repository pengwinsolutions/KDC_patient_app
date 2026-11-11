const React = require('react');
const { View } = require('react-native');

const Animated = { View: (props) => React.createElement(View, props) };
const chain = { duration: () => chain };

module.exports = {
  __esModule: true,
  default: Animated,
  Easing: { bezier: () => (t) => t, linear: (t) => t },
  SlideInDown: chain,
  FadeInUp: chain,
  FadeOutUp: chain,
  interpolate: () => 0,
  useSharedValue: (value) => ({ value }),
  useAnimatedStyle: () => ({}),
  useReducedMotion: () => false,
  withRepeat: (value) => value,
  withTiming: (value) => value,
};
