import { useCallback, useMemo } from 'react';
import { CommonActions, StackActions, useNavigation, useRoute } from '@react-navigation/native';

/** Bottom-navigation destinations. */
export type TabId = 'home' | 'doctors' | 'appointments' | 'orders' | 'profile' | 'patients' | 'earnings';

export interface NavState {
  current: string;
  stack: string[];
  tab: TabId;
  from?: string;
  /** Screen-specific values passed to `navigate`, such as the record to show. */
  params: Record<string, any>;
  navigate: (id: string, opts?: { replace?: boolean; tab?: TabId; from?: string; params?: Record<string, unknown> }) => void;
  back: () => void;
  resetTo: (id: string, tab?: TabId) => void;
  /** Ends a checkout: `id` sits directly on the tabs, so back leads home, not to the bill. */
  finishTo: (id: string, params?: Record<string, unknown>) => void;
  isStatic: boolean;
}

export const MAIN = 'main';

/** Filled in by RootNavigator; held here so screens need not import the registry. */
export const routes = {
  aliases: {} as Record<string, string>,
  tabRoots: new Set<string>(),
};

/** True when a QA launch opened a specific screen; timed redirects stay put. */
export const devLaunch = { active: false };

export function resetAction(id: string, params?: object) {
  const target = routes.aliases[id] ?? id;
  return CommonActions.reset({
    index: 0,
    routes: routes.tabRoots.has(target)
      ? [{ name: MAIN, params: { screen: target, params } }]
      : [{ name: target, params }],
  });
}

/** The blueprint's navigation contract, running on React Navigation. */
export function useNav(): NavState {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const navigate = useCallback<NavState['navigate']>(
    (id, opts) => {
      const target = routes.aliases[id] ?? id;
      if (target === route.name) return;
      const params = { from: opts?.from, ...opts?.params };
      if (routes.tabRoots.has(target)) navigation.navigate(MAIN, { screen: target, params });
      else if (opts?.replace) navigation.dispatch(StackActions.replace(target, params));
      else navigation.dispatch(StackActions.push(target, params));
    },
    [navigation, route.name],
  );

  const back = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const resetTo = useCallback<NavState['resetTo']>((id) => navigation.dispatch(resetAction(id)), [navigation]);

  const finishTo = useCallback<NavState['finishTo']>(
    (id, params) =>
      navigation.dispatch(
        CommonActions.reset({ index: 1, routes: [{ name: MAIN }, { name: routes.aliases[id] ?? id, params }] }),
      ),
    [navigation],
  );

  return useMemo(
    () => ({
      current: route.name,
      stack: [],
      tab: 'home',
      from: route.params?.from,
      params: route.params ?? {},
      navigate,
      back,
      resetTo,
      finishTo,
      isStatic: false,
    }),
    [route.name, route.params, navigate, back, resetTo, finishTo],
  );
}
