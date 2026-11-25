import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Div, P, Span } from '../primitives/index';
import { Bell, CalendarClock, CreditCard, FileText, FlaskConical, LifeBuoy, Package, Pill, Sparkles, Video, X } from '../primitives/icons';
import { useInAppPush } from '../../store/inAppPush';
import { DEVICE } from './Screen';

/** The icon for each kind of notification. */
const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  appointment: CalendarClock,
  consultation: Video,
  waiting_room: Video,
  prescription: Pill,
  lab_booking: FlaskConical,
  lab_report: FileText,
  order: Package,
  payment: CreditCard,
  membership: Sparkles,
  support_ticket: LifeBuoy,
  campaign: Sparkles,
};

/**
 * The in-app notification: a push that arrives while the app is open, styled like a premium
 * system notification. KDC+ mark, icon for its kind, title and message; tap to open what it's
 * about, × to dismiss. Urgent ones (someone is waiting) carry the brand colour.
 */
export function PushBannerHost() {
  const push = useInAppPush((s) => s.current);
  const dismiss = useInAppPush((s) => s.dismiss);
  if (!push) return null;
  const Icon = ICONS[push.type] ?? Bell;
  const open = () => {
    dismiss();
    push.open?.();
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, top: DEVICE.safeTop + 6, zIndex: 110 }}>
      <Animated.View key={push.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp.duration(180)}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${push.title}. ${push.body ?? ''}${push.open ? ' Opens it.' : ''}`}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <Div className={`flex-row items-start gap-3 overflow-hidden rounded-tile bg-white px-3.5 pb-3.5 pt-3 shadow-lift ${push.urgent ? 'border border-brand-200' : 'border border-ink-100'}`}>
            {push.urgent ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 }} className="bg-brand-600" /> : null}
            <Span className={`mt-0.5 h-[40px] w-[40px] shrink-0 flex-col items-center justify-center rounded-[12px] ${push.urgent ? 'bg-brand-600' : 'bg-brand-50'}`}>
              <Icon className={`h-[20px] w-[20px] ${push.urgent ? 'text-white' : 'text-brand-700'}`} strokeWidth={2.2} />
            </Span>
            <Div className="min-w-0 flex-1">
              <Div className="flex-row items-center gap-1.5">
                <P className="text-[11px] font-bold tracking-[0.4px] text-brand-700">KDC+</P>
                <P className="text-[11px] text-ink-400">· now</P>
              </Div>
              <P className="mt-0.5 text-body-sm font-semibold text-ink-900" numberOfLines={1}>
                {push.title}
              </P>
              {push.body ? (
                <P className="mt-0.5 text-caption text-ink-500" numberOfLines={2}>
                  {push.body}
                </P>
              ) : null}
            </Div>
            <Pressable onPress={dismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss notification" className="-mr-1 mt-0.5 h-[24px] w-[24px] items-center justify-center rounded-full">
              <X className="h-[15px] w-[15px] text-ink-400" strokeWidth={2.4} />
            </Pressable>
          </Div>
        </Pressable>
      </Animated.View>
    </View>
  );
}
