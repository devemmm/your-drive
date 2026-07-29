import '@testing-library/jest-native/extend-expect';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('@expo-google-fonts/jost', () => ({
  useFonts: () => [true],
  Jost_400Regular: 'Jost_400Regular',
  Jost_500Medium: 'Jost_500Medium',
  Jost_600SemiBold: 'Jost_600SemiBold',
  Jost_700Bold: 'Jost_700Bold',
}));
