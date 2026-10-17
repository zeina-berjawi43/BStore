import { StyleSheet, Text, View } from 'react-native';
export function ProductCount({ count, title = true }: { count: number; title?: boolean }) {
  return <View style={styles.row}>
    {title ? <View style={styles.heading}><View style={styles.accent} /><Text style={styles.title}>Products</Text></View> : <View />}
    <View style={styles.chip}><Text style={styles.count}>{count} products</Text></View>
  </View>;
}
const styles = StyleSheet.create({
  row: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  heading: { flexDirection: 'row', alignItems: 'center' },
  accent: { width: 4, height: 20, borderRadius: 3, backgroundColor: '#E35B3F', marginRight: 9 },
  title: { fontSize: 20, fontWeight: '900', color: '#171717', letterSpacing: -0.3 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 11, backgroundColor: '#FFF7F3', borderWidth: 1, borderColor: '#F0CFC4' },
  count: { fontSize: 11, color: '#817B71', fontWeight: '700' },
});
