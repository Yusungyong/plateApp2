// src/screens/videoFeeds/components/SuggestionList.tsx
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface SuggestionItem {
  title: string;
  subtitle?: string;
}

interface SuggestionListProps<T> {
  items: T[];
  loading: boolean;
  keyword: string;
  maxHeight: number;
  onSelect: (item: T) => void;
  renderTitle: (item: T) => string;
  renderSubtitle: (item: T) => string;
}

function SuggestionListComponent<T>({
  items,
  loading,
  keyword,
  maxHeight,
  onSelect,
  renderTitle,
  renderSubtitle,
}: SuggestionListProps<T>) {
  return (
    <View style={[styles.container, { maxHeight }]}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#5a6bff" />
        </View>
      ) : items.length > 0 ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {items.map((item, index) => {
            const title = renderTitle(item);
            const subtitle = renderSubtitle(item);
            return (
              <TouchableOpacity
                key={`${title}-${subtitle}-${index}`}
                style={styles.item}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : keyword.trim().length > 0 ? (
        <Text style={styles.empty}>검색 결과가 없습니다.</Text>
      ) : null}
    </View>
  );
}

export default memo(SuggestionListComponent) as typeof SuggestionListComponent;

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d9dee8',
    backgroundColor: '#fff',
    maxHeight: 180,
    paddingVertical: 4,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontSize: 14,
    color: '#1b1f2a',
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#7a818f',
  },
  loading: {
    paddingVertical: 12,
  },
  empty: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 12,
    color: '#7a818f',
  },
});
