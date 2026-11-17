import React, { createContext, useContext, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { colorValue, Div, flatten, parseClasses } from '../primitives';

/**
 * Safe areas come from the device the app is running on. The blueprint's
 * iPhone 16 Pro values are only the fallback before metrics are known.
 */
export const DEVICE = {
  width: 402,
  height: 874,
  radius: 55,
  safeTop: initialWindowMetrics?.insets.top ?? 59,
  safeBottom: initialWindowMetrics?.insets.bottom ?? 34,
};

/**
 * Bottom padding for tab bars. The iPhone home indicator is see-through, so
 * the bar may overlap it by 10 pt; Android navigation bars and tablet taskbars
 * are solid, so the whole inset is kept clear.
 */
export function tabBarInset() {
  return Platform.OS === 'ios' ? Math.max(DEVICE.safeBottom - 10, 8) : DEVICE.safeBottom + 8;
}

/** Bottom padding for sticky footer bars, with the same rule as tab bars. */
export function footerInset() {
  return Platform.OS === 'ios' ? Math.max(DEVICE.safeBottom, 14) : DEVICE.safeBottom + 14;
}

/** Extra bottom space needed only where the system bar is solid (Android). */
export function solidBarInset() {
  return Platform.OS === 'android' ? DEVICE.safeBottom : 0;
}

/** True inside the tab navigator, where a tab bar sits over the bottom of each screen. */
export const InTabs = createContext(false);

/**
 * Screen paddings are sized for the iPhone, whose home indicator is
 * see-through. Android bars are solid and its footers and tab bars taller, so
 * the end of the scroll gets the difference back.
 */
function androidTail(padBottom: boolean, hasFooter: boolean, inTabs: boolean, scrolls: boolean) {
  if (Platform.OS !== 'android') return 0;
  if (hasFooter) return Math.max(0, footerInset() - 34);
  if (inTabs) return Math.max(0, tabBarInset() - 24);
  if (padBottom) return 16;
  /* A page that scrolls must be able to bring its end above the bar; one that
     fits keeps its full height, which its own bottom-anchored layout relies on. */
  return scrolls ? DEVICE.safeBottom : 0;
}

/** True for a header the scroller pins directly; it needn't undo the top inset. */
export const DirectStickyHeader = createContext(false);

function classOf(node: any): string {
  return typeof node?.props?.className === 'string' ? node.props.className : '';
}

/** On the web these sit outside the scroller because nothing positions them inside it. */
function isOverlay(node: any) {
  if (node?.type?.overlay) return true;
  return parseClasses(classOf(node)).layout.split(' ').includes('absolute');
}

function isSticky(node: any) {
  return Boolean(node?.type?.stickyHeader) || parseClasses(classOf(node)).sticky;
}

/**
 * Standard screen scaffold: fills the viewport, scrolls its body, reserves the
 * safe areas, and keeps fields above the keyboard.
 */
export function Screen({
  children,
  background = 'bg-canvas',
  padTop = true,
  padBottom = true,
  className = '',
  scrollRef,
  topScrim,
}: {
  children: React.ReactNode;
  background?: string;
  padTop?: boolean;
  padBottom?: boolean;
  className?: string;
  scrollRef?: React.Ref<any>;
  topScrim?: boolean;
}) {
  const nodes = flatten(children);
  const firstBody = nodes.findIndex((n) => !isOverlay(n));
  const behind = nodes.filter((n, i) => isOverlay(n) && i < firstBody);
  const front = nodes.filter((n, i) => isOverlay(n) && i >= firstBody);
  const body = nodes.filter((n) => !isOverlay(n));
  const stickyHeaderIndices = body.flatMap((n, i) => (isSticky(n) ? [i] : []));
  const inTabs = useContext(InTabs);
  const size = useRef({ view: 0, content: 0 });
  const [scrolls, setScrolls] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const measure = () => {
    const { view, content } = size.current;
    if (view && content) setScrolls(content - tailRef.current > view + 1);
  };
  const tail = androidTail(padBottom, front.some((n: any) => n?.type?.footerBar), inTabs, scrolls);
  const tailRef = useRef(tail);
  tailRef.current = tail;
  /* The web blurs content passing under the clock; here the screen's own
     background fades in over that strip once the page has scrolled. */
  const scrim = (topScrim ?? padTop) && scrolled && !isSticky(body[0]);
  const scrimColor = colorValue(background.replace(/^bg-/, '')) ?? '#EBF0F6';

  /* A header pinned from the top paints its own safe area, so the scroller
     must not add one above it. */
  const topSticky = isSticky(body[0]);
  return (
    <Div className={`absolute inset-0 flex-col ${background} ${className}`}>
      {behind}
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={stickyHeaderIndices}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y > 2;
            if (y !== scrolled) setScrolled(y);
          }}
          onLayout={(e) => { size.current.view = e.nativeEvent.layout.height; measure(); }}
          onContentSizeChange={(_, h) => { size.current.content = h; measure(); }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: padTop && !topSticky ? DEVICE.safeTop : 0,
            paddingBottom: (padBottom ? DEVICE.safeBottom : 0) + tail,
          }}
        >
          {/* React Native copies a sticky child's style onto its own wrapper, so the
              child's web offsets are kept one level down. */}
          {body.map((n, i) =>
            isSticky(n) ? (
              <View key={i}>
                <DirectStickyHeader.Provider value={true}>{n}</DirectStickyHeader.Provider>
              </View>
            ) : (
              n
            ),
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {scrim && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: DEVICE.safeTop + 14, zIndex: 45,
            experimental_backgroundImage: `linear-gradient(180deg, ${scrimColor} ${Math.round((DEVICE.safeTop / (DEVICE.safeTop + 14)) * 100)}%, rgba(255,255,255,0) 100%)`,
          } as any}
        />
      )}
      {front}
    </Div>
  );
}
