import React, {useEffect, useRef} from 'react';
import './src/i18n';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer, createNavigationContainerRef} from '@react-navigation/native';
import {PaperProvider} from 'react-native-paper';
import {store, persistor} from './src/redux/store';
import RootNavigator from './src/navigations/index';
import {setupFCM, checkInitialNotification} from './src/helpers/notifications';

const navigationRef = createNavigationContainerRef();

const App = () => {
  const fcmInitialise = useRef(false);

  useEffect(() => {
    if (fcmInitialise.current) return;
    fcmInitialise.current = true;
    setupFCM(store, navigationRef);
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => checkInitialNotification(navigationRef)}>
            <RootNavigator />
          </NavigationContainer>
        </PaperProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;