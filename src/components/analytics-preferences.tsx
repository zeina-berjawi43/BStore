import { useState, useSyncExternalStore } from 'react';
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { analytics } from '../services/analytics';

export function AnalyticsPreferences() {
  const state = useSyncExternalStore(analytics.subscribe, analytics.getSnapshot, analytics.getSnapshot);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const change = async (accept: boolean) => {
    setBusy(true); setMessage('');
    try {
      await analytics.setConsent(accept);
      setMessage(accept ? 'Optional analytics enabled on this device.' : 'Optional analytics is off on this device.');
    } catch { setMessage('Your preference could not be fully synchronized. Collection stays off; please retry online.'); }
    finally { setBusy(false); }
  };
  return <View style={styles.card} accessibilityLabel="Analytics preferences">
    <Text style={styles.title}>Optional shopping analytics</Text>
    <Text style={styles.text}>{state.config.enabled ? state.config.notice : 'Optional shopping analytics is currently disabled. Browsing, registration and ordering work without it.'}</Text>
    {state.config.enabled && <Text style={styles.text}>Identifiable activity is kept for up to {state.config.retentionDays} days. This choice applies to this device. Withdrawal requests remove associated analytics when synchronized.</Text>}
    <View style={styles.row}>
      <Text style={styles.label}>Share optional shopping activity</Text>
      <Switch accessibilityLabel="Share optional shopping activity" value={state.accepted && state.config.enabled} disabled={busy || !state.config.enabled}
        onValueChange={value => void change(value)} trackColor={{ false: '#CCC', true: '#34785A' }} />
    </View>
    {state.ready && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void change(false)} style={styles.button}><Text style={styles.link}>Turn off and remove analytics</Text></Pressable>}
    {state.withdrawalPending && <Text style={styles.text}>Removal is pending synchronization. Collection is off. Reconnect and retry.</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  card: { marginVertical: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, gap: 12 },
  title: { color: '#171717', fontSize: 18, fontWeight: '700' }, text: { fontSize: 14, lineHeight: 21, color: '#514B45' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1, fontSize: 15, color: '#171717' }, button: { minHeight: 44, justifyContent: 'center' }, link: { fontSize: 15, color: '#985035', fontWeight: '600' },
});
