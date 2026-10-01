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

// Three native pages bound each gesture to one neighbour and keep wrapping cheap.
export function PagedCarousel<T>(props: Props<T>) {
  const [width, setWidth] = useState(0);
  return <View style={{ width: '100%', height: props.height }}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    {width > 0 && props.items.length > 0 && <Pages {...props} width={width}
      key={`${width}:${props.items.map(props.itemKey).join('|')}`} />}
  </View>;
}

function Pages<T>({ items, renderItem, onIndexChange, width }: Props<T> & { width: number }) {
  const { index, scrollRef, handlers } = useOfferCarousel(items.length, width, onIndexChange);
  const offsets = items.length > 1 ? [-1, 0, 1] : [0];
  return <ScrollView ref={scrollRef} horizontal pagingEnabled
    snapToInterval={width} decelerationRate="fast" disableIntervalMomentum
    directionalLockEnabled bounces={false} showsHorizontalScrollIndicator={false}
    scrollEnabled={items.length > 1} scrollEventThrottle={16}
    contentOffset={{ x: items.length > 1 ? width : 0, y: 0 }}
    {...handlers}>
    {offsets.map(offset => <View key={offset} style={{ width, height: '100%' }}
      accessibilityElementsHidden={offset !== 0}
      importantForAccessibility={offset === 0 ? 'auto' : 'no-hide-descendants'}>
      {renderItem(items[(index + offset + items.length) % items.length])}
    </View>)}
  </ScrollView>;
}
