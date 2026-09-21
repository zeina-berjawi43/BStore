import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { request } from '../services/request';

const API_URL = 'https://mystore-backend-u6ey.onrender.com';
type Category = { _id: string; name: string; image?: string };

export default function DepartmentCategories() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const name = typeof params.name === 'string' ? params.name : 'Department';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (isActive: () => boolean) => {
    if (!id) {
      setError('Department ID is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await request(`${API_URL}/departments/${encodeURIComponent(id)}/categories`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not load categories.');
      if (!Array.isArray(data.categories)) throw new Error('Invalid categories response.');
      if (isActive()) setCategories(data.categories);
    } catch (e) {
      if (isActive()) setError(e instanceof Error ? e.message : 'Could not load categories.');
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void load(() => active);
    return () => { active = false; };
  }, [load]));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#171717" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{name}</Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#E35B3F" style={styles.loading} />
      ) : error ? (
        <View style={styles.message}><Text style={styles.muted}>{error}</Text>
          <Pressable onPress={() => void load(() => true)} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.message}>
          <Ionicons name="albums-outline" size={34} color="#817B71" />
          <Text style={styles.muted}>Categories coming soon.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {categories.map(category => (
            <Pressable key={category._id} style={styles.card} onPress={() => router.push({
              pathname: '/category-products', params: { category: category.name },
            })}>
              <View style={styles.imageBox}>
                {category.image ? <Image source={{ uri: category.image }} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
                  : <Ionicons name="pricetag-outline" size={32} color="#E35B3F" />}
              </View>
              <Text style={styles.name} numberOfLines={2}>{category.name}</Text>
              <Ionicons name="arrow-forward" size={16} color="#E35B3F" />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 24, paddingBottom: 18, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E7DED1' },
  back: { padding: 8, marginRight: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#171717', flex: 1 },
  loading: { marginTop: 45 },
  message: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14, padding: 24 },
  muted: { color: '#817B71', textAlign: 'center', fontSize: 14 },
  retry: { padding: 12 },
  retryText: { color: '#E35B3F', fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 18, gap: 12 },
  card: { width: '48%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7DED1', borderRadius: 18, padding: 12, alignItems: 'center', gap: 9 },
  imageBox: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  name: { fontSize: 13, fontWeight: '800', color: '#171717', textAlign: 'center', minHeight: 34 },
});
