import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type AlertButton } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Notice = { title: string; message: string; buttons: AlertButton[] };

// Screen-local feedback: callbacks run only after an explicit action.
export function useActionDialog({ showIcon = true, acknowledgeOnDismiss = false }: { showIcon?: boolean; acknowledgeOnDismiss?: boolean } = {}) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const active = useRef<Notice | null>(null);
  const alert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    const next = { title, message: message || '', buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
    active.current = next; setNotice(next);
  }, []);
  const choose = (button?: AlertButton) => {
    if (!notice || active.current !== notice) return;
    active.current = null; setNotice(null);
    button?.onPress?.();
  };
  const destructive = notice?.buttons.some(button => button.style === 'destructive');
  const dialog = <Modal transparent visible={!!notice} animationType="fade"
    onRequestClose={() => choose(notice?.buttons.find(button => button.style === 'cancel') ||
      (acknowledgeOnDismiss && notice?.buttons.length === 1 ? notice.buttons[0] : undefined))}>
    <View style={styles.overlay}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.card} accessibilityViewIsModal accessibilityLabel={notice?.title}>
        {showIcon && <View style={styles.icon}><Ionicons name={destructive ? 'trash-outline' : notice?.title.toLowerCase().includes('success') ? 'checkmark-circle-outline' : 'information-circle-outline'} size={28} color="#E35B3F" /></View>}
        <Text accessibilityRole="header" style={styles.title}>{notice?.title}</Text>
        {notice?.message ? <Text style={styles.message}>{notice.message}</Text> : null}
        <View style={styles.actions}>{notice?.buttons.map((button, index) => <Pressable key={index}
          accessibilityRole="button" onPress={() => choose(button)}
          style={({ pressed }) => [styles.button, button.style === 'cancel' ? styles.secondary : button.style === 'destructive' ? styles.destructive : styles.primary, pressed && styles.pressed]}>
          <Text style={[styles.buttonText, button.style === 'cancel' && styles.secondaryText]}>{button.text || 'OK'}</Text>
        </Pressable>)}</View>
      </View>
      </ScrollView>
    </View>
  </Modal>;
  return { alert, dialog };
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(23,23,23,0.42)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { width: '100%', maxWidth: 420, flexGrow: 0, flexShrink: 1 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#FFFCF7', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E9DED0', gap: 14 },
  icon: { width: 48, height: 48, backgroundColor: '#FDE5DA', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#171717', fontSize: 21, lineHeight: 27, fontWeight: '800' },
  message: { color: '#6D6256', fontSize: 15, lineHeight: 23 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  button: { flexGrow: 1, minHeight: 48, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  primary: { backgroundColor: '#171717' }, destructive: { backgroundColor: '#C5442D' }, secondary: { backgroundColor: '#F1E9DE' },
  pressed: { opacity: 0.75 }, buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, secondaryText: { color: '#332C24' },
});
