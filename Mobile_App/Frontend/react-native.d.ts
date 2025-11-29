/// <reference types="react" />
/// <reference types="react-native" />

declare module 'react-native' {
  export * from 'react-native/types';
}

// Suppress React Native JSX component type errors
declare global {
  namespace JSX {
    interface ElementClass {
      render: any;
    }
  }
}

export {};
