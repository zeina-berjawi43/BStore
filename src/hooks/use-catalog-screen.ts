import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAnalyticsView } from './use-analytics-view';
import { useProductImpressions } from './use-product-impressions';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { API_URL, getValidAccessToken } from '../services/authService';
import { getSessionSnapshot, subscribeSession, onSessionChanged, onPricingChanged } from '../services/tokenStorage';
import { fetchCatalog, fetchProductSection, peekCurrentCatalog, type CatalogProduct } from '../services/catalogService';
import { request } from '../services/request';
import { createResourceCache, reconcileItems } from '../services/resource-cache';
import { getFinalPrice } from '../services/product-price';
import { filterOffers, OFFER_FILTERS } from '../services/offers';

type Category = { _id: string; name: string; department?: { _id?: string; name?: string } | string | null };
const categories = createResourceCache();
onSessionChanged(() => categories.clear());
onPricingChanged(() => categories.clear());

export function selectCatalog(products: CatalogProduct[], subCategories: Category[], selected: string, all: boolean) {
  const ids = new Set(subCategories.map(item => item._id));
  return products.filter(product => {
    const id = typeof product.category === 'object' ? product.category?._id : product.category;
    return selected !== 'ALL' ? id === selected : all || (!!id && ids.has(id));
  }).sort(byFinalPriceDesc);
}
const byFinalPriceDesc = (a: CatalogProduct, b: CatalogProduct) => getFinalPrice(b) - getFinalPrice(a);
// Unified Offers filters (All | Buy & Get | Special Discounts) use the same ordering as other catalog pages.
export const selectOffers = (products: CatalogProduct[], selected: string) => filterOffers(products, selected).sort(byFinalPriceDesc);
const offerTabs: Category[] = OFFER_FILTERS.map(filter => ({ _id: filter._id, name: filter.name }));

const productBrandId = (product: CatalogProduct) => typeof product.brand === 'object' ? product.brand?._id : product.brand;
const productCategoryId = (product: CatalogProduct) => typeof product.category === 'object' ? product.category?._id : product.category;

// Products of one brand from the existing catalog (same visibility and pricing rules).
export function selectBrandProducts(products: CatalogProduct[], brandId?: string) {
  return brandId === undefined ? products : products.filter(product => !!brandId && productBrandId(product) === brandId);
}

export function useCatalogScreen(departmentId?: string, legacyName?: string, offersOnly = false, brandId?: string) {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  const path = departmentId ? `/departments/${encodeURIComponent(departmentId)}/categories` : '/categories';
  const [products, setProducts] = useState<CatalogProduct[]>(() => offersOnly ? [] : peekCurrentCatalog());
  const [categoryState, setCategoryState] = useState(() => ({ path, items: categories.peek<Category[]>(path) || [] }));
  const subCategories = useMemo(() => categoryState.path === path ? categoryState.items : categories.peek<Category[]>(path) || [], [categoryState, path]);
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [loadingProducts, setLoadingProducts] = useState(!products.length);
  const [loadingSubCategories, setLoadingSubCategories] = useState(!offersOnly && !subCategories.length);
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
          }
        } catch { failures.push('Products could not be refreshed.'); }
        finally { if (valid()) setLoadingProducts(false); }
      })();
      const categoryJob = (async () => {
        // Offers uses three fixed filters, so no category list is requested.
        if (offersOnly) { if (valid()) setLoadingSubCategories(false); return; }
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
  const scoped = useMemo(() => selectBrandProducts(products, brandId), [products, brandId]);
  const scopedTabs = offersOnly || brandId !== undefined;
  const visibleCategories = useMemo(() => offersOnly ? offerTabs : scopedTabs ? subCategories.filter(category => scoped.some(product => productCategoryId(product) === category._id)) : legacyName && legacyName.toUpperCase() !== 'ALL'
    ? subCategories.filter(item => typeof item.department === 'object' && item.department?.name?.toLowerCase().trim() === legacyName.toLowerCase().trim())
    : subCategories, [subCategories, legacyName, scopedTabs, scoped, offersOnly]);
  const filteredProducts = useMemo(() => offersOnly ? selectOffers(scoped, selectedSubCategory) : selectCatalog(scoped, visibleCategories, selectedSubCategory, scopedTabs || (!departmentId && legacyName?.toUpperCase() === 'ALL')), [scoped, visibleCategories, selectedSubCategory, departmentId, legacyName, scopedTabs, offersOnly]);
  const screen = offersOnly ? 'offers' : brandId ? 'brand-products' : departmentId ? 'department-categories' : 'category-products';
  const impressions = useProductImpressions(screen);
  useAnalyticsView('product_list_viewed', filteredProducts.length > 0, { screen, itemCount: filteredProducts.length,
    ...(brandId ? { brandId } : {}), ...(departmentId ? { departmentId } : {}), ...(selectedSubCategory !== 'ALL' && !offersOnly ? { categoryId: selectedSubCategory } : {}) });
  return { products, subCategories: visibleCategories, selectedSubCategory, setSelectedSubCategory, loadingProducts, loadingSubCategories,
    productsError, filteredProducts, impressions, isLoggedIn: session.authenticated, retry: () => { void refreshRef.current(true); } };
}
