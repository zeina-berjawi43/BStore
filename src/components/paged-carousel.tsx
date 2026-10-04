import { ReactNode, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useOfferCarousel } from '../hooks/useOfferCarousel';

type Props<T> = {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onIndexChange: (index: number) => void;
  height: number;
};

// Native paging with stable images and duplicate endpoints for seamless looping.
export function PagedCarousel<T>(props: Props<T>) {
  const [width, setWidth] = useState(0);
  return <View style={{ width: '100%', height: props.height }}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 && props.items.length > 0 && <Pages {...props} width={width}
      key={`${width}:${props.items.map(props.itemKey).join('|')}`} />}
  </View>;
}

function Pages<T>({ items, itemKey, renderItem, onIndexChange, width }: Props<T> & { width: number }) {
  const { index, scrollRef, handlers } = useOfferCarousel(items.length, width, onIndexChange);
  // Stable product pages retain their decoded image during a swipe. Only the
  // duplicate end pages jump, after momentum settles, to the identical original.
  const pages = items.length > 1 ? [items[items.length - 1], ...items, items[0]] : items;
  return <ScrollView ref={scrollRef} horizontal pagingEnabled
    snapToInterval={width} decelerationRate="fast" disableIntervalMomentum
    directionalLockEnabled bounces={false} showsHorizontalScrollIndicator={false}
    scrollEnabled={items.length > 1} scrollEventThrottle={16}
    contentOffset={{ x: items.length > 1 ? width : 0, y: 0 }}
    {...handlers}>
    {pages.map((item, page) => <View key={`${page === 0 && items.length > 1 ? 'leading' : page === pages.length - 1 && items.length > 1 ? 'trailing' : 'item'}:${itemKey(item)}`} style={{ width, height: '100%', backgroundColor: '#FFFFFF' }}
      accessibilityElementsHidden={page !== (items.length > 1 ? index + 1 : 0)}
      aria-hidden={page !== (items.length > 1 ? index + 1 : 0)}
      importantForAccessibility={page === (items.length > 1 ? index + 1 : 0) ? 'auto' : 'no-hide-descendants'}>
      {renderItem(item)}
    </View>)}
  </ScrollView>;
}
