import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { API_URL, getValidAccessToken } from '../services/authService';
import { getSessionSnapshot, subscribeSession, onSessionChanged, onPricingChanged } from '../services/tokenStorage';
import { fetchCatalog, fetchProductSection, peekCurrentCatalog, type CatalogProduct } from '../services/catalogService';
import { request } from '../services/request';
import { createResourceCache, reconcileItems } from '../services/resource-cache';
import { getFinalPrice } from '../services/product-price';

type Category = { _id: string; name: string; department?: { _id?: string; name?: string } | string | null };
const categories = createResourceCache();
onSessionChanged(() => categories.clear());
onPricingChanged(() => categories.clear());

export function selectCatalog(products: CatalogProduct[], subCategories: Category[], selected: string, all: boolean) {
  const ids = new Set(subCategories.map(item => item._id));
  return products.filter(product => {
    const id = typeof product.category === 'object' ? product.category?._id : product.category;
    return selected !== 'ALL' ? id === selected : all || (!!id && ids.has(id));
  }).sort((a, b) => getFinalPrice(b) - getFinalPrice(a));
}

export function useCatalogScreen(departmentId?: string, legacyName?: string, offersOnly = false) {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  const path = departmentId ? `/departments/${encodeURIComponent(departmentId)}/categories` : '/categories';
  const [products, setProducts] = useState<CatalogProduct[]>(() => offersOnly ? [] : peekCurrentCatalog());
  const [categoryState, setCategoryState] = useState(() => ({ path, items: categories.peek<Category[]>(path) || [] }));
  const subCategories = useMemo(() => categoryState.path === path ? categoryState.items : categories.peek<Category[]>(path) || [], [categoryState, path]);
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [loadingProducts, setLoadingProducts] = useState(!products.length);
  const [loadingSubCategories, setLoadingSubCategories] = useState(!subCategories.length);
  const [productsError, setError] = useState('');
  const operation = useRef(0);
  const refreshRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  useEffect(() => onPricingChanged(() => { operation.current++; setProducts([]); void refreshRef.current(true); }), []);
  useFocusEffect(useCallback(() => {
    let active = true;
    const refresh = async (force = false) => {
      if (!active) return;
      const epoch = ++operation.current;
      setError(''); setLoadingProducts(true); setLoadingSubCategories(true);
      const revision = getSessionSnapshot().revision;
      const valid = () => active && operation.current === epoch && revision === getSessionSnapshot().revision;
      const failures: string[] = [];
      const productJob = (async () => {
        try {
          const token = await getValidAccessToken();
          if (!valid()) return;
          const cached = offersOnly ? [] : peekCurrentCatalog();
          if (cached.length) { setProducts(cached); setLoadingProducts(false); }
          const next = offersOnly ? await fetchProductSection('offers', token, force) : await fetchCatalog(token, force);
          if (valid()) {
            setProducts(next);
            if (offersOnly) setSelectedSubCategory(selected => selected === 'ALL' || next.some(product => (typeof product.category === 'object' ? product.category?._id : product.category) === selected) ? selected : 'ALL');
          }
        } catch { failures.push('Products could not be refreshed.'); }
        finally { if (valid()) setLoadingProducts(false); }
      })();
      const categoryJob = (async () => {
        try {
          const cached = categories.peek<Category[]>(path);
          if (cached && valid()) { setCategoryState({ path, items: cached }); setLoadingSubCategories(false); }
          const next = await categories.load(path, async () => {
            const response = await request(`${API_URL}${path}`, {}, 8000);
            const data = await response.json();
            const list = Array.isArray(data) ? data : data.categories;
            if (!response.ok || !Array.isArray(list) || list.some(item => !item || typeof item._id !== 'string' || typeof item.name !== 'string')) throw new Error('Invalid categories');
            return reconcileItems(cached, list.slice().sort((a: Category, b: Category) => a.name.localeCompare(b.name)));
          }, force);
          if (valid()) setCategoryState(current => current.path === path && current.items === next ? current : { path, items: next });
        } catch { failures.push('Categories could not be refreshed.'); }
        finally { if (valid()) setLoadingSubCategories(false); }
      })();
      await Promise.all([productJob, categoryJob]);
      if (valid()) setError(failures.join(' '));
    };
    refreshRef.current = refresh;
    void refresh();
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    const tick = setInterval(() => { if (AppState.currentState === 'active' && (Platform.OS !== 'web' || document.visibilityState === 'visible')) void refresh(); }, 60_000);
    return () => { active = false; operation.current++; foreground.remove(); clearInterval(tick); };
  }, [path, offersOnly]));
  const visibleCategories = useMemo(() => offersOnly ? subCategories.filter(category => products.some(product => (typeof product.category === 'object' ? product.category?._id : product.category) === category._id)) : legacyName && legacyName.toUpperCase() !== 'ALL'
    ? subCategories.filter(item => typeof item.department === 'object' && item.department?.name?.toLowerCase().trim() === legacyName.toLowerCase().trim())
    : subCategories, [subCategories, legacyName, offersOnly, products]);
  const filteredProducts = useMemo(() => selectCatalog(products, visibleCategories, selectedSubCategory, offersOnly || (!departmentId && legacyName?.toUpperCase() === 'ALL')), [products, visibleCategories, selectedSubCategory, departmentId, legacyName, offersOnly]);
  return { products, subCategories: visibleCategories, selectedSubCategory, setSelectedSubCategory, loadingProducts, loadingSubCategories,
    productsError, filteredProducts, isLoggedIn: session.authenticated, retry: () => { void refreshRef.current(true); } };
}
