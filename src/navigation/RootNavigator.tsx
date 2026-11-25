import React, { useEffect, useState } from 'react';
import { Linking, Platform, Settings, StatusBar } from 'react-native';
import {
  CommonActions,
  createNavigationContainerRef,
  NavigationContainer,
  StackActions,
  useIsFocused,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomNavBar, InTabs } from '../components/ui/Nav';
import { ALIASES, SCREENS } from './registry';
import type { ScreenDef } from './types';
import { ScreenTiming } from '../perf/screenTiming';
import { useLiveInbox } from '../notifications/inbox';
import { startPush } from '../notifications/push';
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

/**
 * Sets the status bar while its screen is focused. Kept apart from the screen so that a focus
 * change re-renders only this, not the whole screen: switching tabs used to re-render both the
 * tab being left and the one being opened.
 */
function FocusedStatusBar({ tone }: { tone: ScreenDef['statusTone'] }) {
  const focused = useIsFocused();
  return focused ? <StatusBar barStyle={tone === 'light' ? 'light-content' : 'dark-content'} /> : null;
}

export function withStatusBar(def: ScreenDef) {
  const Component = React.memo(def.Component);
  return function ScreenRoute() {
    return (
      <>
        <FocusedStatusBar tone={def.statusTone} />
        <ScreenTiming id={def.id}>
          <Component />
        </ScreenTiming>
      </>
    );
  };
}

const ROUTES = SCREENS.map((def) => ({ def, component: withStatusBar(def) }));
const STACK_ROUTES = ROUTES.filter((r) => !routes.tabRoots.has(r.def.id));
const TAB_ROUTES = Object.keys(TAB_OF_SCREEN).map((id) => ROUTES.find((r) => r.def.id === id)!);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * The tab bar. A tap lights the tab up on the next frame and the screen follows, so the bar
 * answers at once even while the screen is still rendering. Once the first tab is on screen and
 * the app is idle, the other tabs are rendered in the background, so a first visit is instant too.
 */
const PRELOAD_AFTER_MS = 1500;

function TabBar({ state, navigation }: BottomTabBarProps) {
  const current = TAB_OF_SCREEN[state.routes[state.index].name];
  const [pressed, setPressed] = useState<TabId | null>(null);
  useEffect(() => setPressed(null), [current]);

  useEffect(() => {
    // One tab per idle moment, never all at once: rendering the four other tabs together held the
    // JS thread for over a second, so a tap right after sign-in waited for all of them. Each
    // waits for the thread to be idle again (at most 3 s), so taps always go first.
    const queue = state.routes.filter((r) => r.key !== state.routes[state.index].key).map((r) => r.name);
    let idle: number | null = null;
    let frame: number | null = null;
    const next = () => {
      const name = queue.shift();
      if (!name) return;
      idle = requestIdleCallback(
        () => {
          navigation.preload(name);
          // preload only schedules the render: queue the next tab after that frame, not in this idle period.
          frame = requestAnimationFrame(next);
        },
        { timeout: 3000 },
      );
    };
    // Not until the first screen has been drawn (its native layout must not wait behind a preload).
    const start = setTimeout(next, PRELOAD_AFTER_MS);
    return () => {
      clearTimeout(start);
      if (idle !== null) cancelIdleCallback(idle);
      if (frame !== null) cancelAnimationFrame(frame);
    };
    // Once per sign-in: the tab routes don't change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BottomNavBar
      active={pressed ?? current}
      onSelect={(t) => {
        const target = ALIASES[t.screen] ?? t.screen;
        if (t.id === current) return navigation.navigate(target);
        setPressed(t.id);
        requestAnimationFrame(() => navigation.navigate(target));
      }}
    />
  );
}

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

function MainTabs() {
  return (
    <InTabs.Provider value={true}>
      <Tab.Navigator
        // Hidden tabs are frozen: a background sync no longer re-renders screens nobody is looking at.
        screenOptions={{ headerShown: false, freezeOnBlur: true }}
        tabBar={renderTabBar}
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

/** Push after sign-in: a tapped notification opens what it's about. */
function usePush() {
  const signedIn = useSession((s) => Boolean(s.token) && s.profileComplete);
  useEffect(() => {
    if (!LIVE || !signedIn) return;
    const open = (screen: string, params: Record<string, unknown>) => {
      const go = () => {
        const target = ALIASES[screen] ?? screen;
        if (routes.tabRoots.has(target)) navigationRef.dispatch(CommonActions.navigate(MAIN, { screen: target, params }));
        else navigationRef.dispatch(StackActions.push(target, params));
      };
      // A push that launched the app can arrive before navigation is ready.
      if (navigationRef.isReady()) go();
      else setTimeout(go, 500);
    };
    void startPush(open);
  }, [signedIn]);
}

export function RootNavigator() {
  useDevDeepLink();
  useSessionEnded();
  useLiveInbox();
  usePush();
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
