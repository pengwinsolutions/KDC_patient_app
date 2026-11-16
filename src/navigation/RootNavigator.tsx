import React, { useEffect, useState } from 'react';
import { Linking, Platform, Settings, StatusBar } from 'react-native';
import {
  createNavigationContainerRef,
  NavigationContainer,
  useIsFocused,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomNavBar, InTabs } from '../components/ui/Nav';
import { ALIASES, SCREENS } from './registry';
import type { ScreenDef } from './types';
import { devLaunch, MAIN, resetAction, routes, type TabId } from './navigation';
import { initialRouteFor, useSession } from '../store/session';
import { LIVE } from '../services/config';
import { setSessionEndedHandler } from '../services/live/http';
import { clearAll } from '../services/live/sync';
// Live sync domains register themselves when loaded.
import '../services/live/sync-account';
import { clearPatientCatalog } from '../store/catalog';
import { purgeLegacyData } from '../store/storage';
import { showToast } from '../store/toast';

// Live: nothing a demo build stored about a patient survives on the phone.
purgeLegacyData();

const TAB_OF_SCREEN: Record<string, TabId> = {
  home: 'home',
  'doctor-search': 'doctors',
  appointments: 'appointments',
  'orders-home': 'orders',
  profile: 'profile',
};

routes.aliases = ALIASES;
routes.tabRoots = new Set(Object.keys(TAB_OF_SCREEN));

function withStatusBar(def: ScreenDef) {
  const Component = def.Component;
  return function ScreenRoute() {
    const focused = useIsFocused();
    return (
      <>
        {focused && (
          <StatusBar
            barStyle={def.statusTone === 'light' ? 'light-content' : 'dark-content'}
          />
        )}
        <Component />
      </>
    );
  };
}

const ROUTES = SCREENS.map((def) => ({ def, component: withStatusBar(def) }));
const STACK_ROUTES = ROUTES.filter((r) => !routes.tabRoots.has(r.def.id));
const TAB_ROUTES = Object.keys(TAB_OF_SCREEN).map((id) => ROUTES.find((r) => r.def.id === id)!);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <InTabs.Provider value={true}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={({ state, navigation }) => (
          <BottomNavBar
            active={TAB_OF_SCREEN[state.routes[state.index].name]}
            onSelect={(t) => navigation.navigate(ALIASES[t.screen] ?? t.screen)}
          />
        )}
      >
        {TAB_ROUTES.map((r) => (
          <Tab.Screen key={r.def.id} name={r.def.id} component={r.component} />
        ))}
      </Tab.Navigator>
    </InTabs.Provider>
  );
}

export const navigationRef = createNavigationContainerRef();

/** Development only: `kdcpatient://s/<screen-id>` opens a screen for QA captures. */
function useDevDeepLink() {
  useEffect(() => {
    if (!__DEV__) return;
    const open = (url: string | null) => {
      const id = url?.match(/:\/\/s\/([\w-]+)/)?.[1];
      if (id && navigationRef.isReady()) {
        devLaunch.active = true;
        navigationRef.dispatch(resetAction(id));
      }
    };
    const sub = Linking.addEventListener('url', (e) => open(e.url));
    return () => sub.remove();
  }, []);
}

/** Development only: `simctl launch ... -kdcScreen <id>` starts on a screen for QA. */
function openDevLaunchScreen() {
  const id = __DEV__ && Platform.OS === 'ios' ? Settings.get('kdcScreen') : undefined;
  if (id) {
    devLaunch.active = true;
    navigationRef.dispatch(resetAction(id));
  }
}

/** Live: a session that can't be refreshed (signed out elsewhere, expired) clears the phone and returns to sign-in. */
function useSessionEnded() {
  useEffect(() => {
    if (!LIVE) return;
    setSessionEndedHandler(() => {
      clearAll();
      clearPatientCatalog();
      useSession.getState().clear();
      showToast('Your session has ended. Please sign in again.', 'critical');
      if (navigationRef.isReady()) navigationRef.dispatch(resetAction('login'));
    });
  }, []);
}

export function RootNavigator() {
  useDevDeepLink();
  useSessionEnded();
  /* Read once: later session changes navigate explicitly. */
  const [initialRoute] = useState(() => initialRouteFor(useSession.getState()));
  return (
    <NavigationContainer ref={navigationRef} onReady={openDevLaunchScreen}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name={MAIN} component={MainTabs} />
        {STACK_ROUTES.map((r) => (
          <Stack.Screen key={r.def.id} name={r.def.id} component={r.component} />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
