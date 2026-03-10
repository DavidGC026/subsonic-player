import React from 'react';
import { Platform } from 'react-native';
import { MobileNavigator } from './MobileNavigator';
import { TVNavigator } from './TVNavigator';

export const AppNavigator: React.FC = () => {
  if (Platform.isTV) {
    return <TVNavigator />;
  }

  return <MobileNavigator />;
};

export default AppNavigator;
