import React, { memo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';

import type { StoreSuggestion } from '../../../api/mapStoreApi';
import { HOME_COLORS } from '../styles/homeTokens';

type MapFiltersProps = {
  searchTerm: string;
  onChangeSearchTerm: (text: string) => void;
  onClearSearch: () => void;
  suggestions: StoreSuggestion[];
  suggestLoading: boolean;
  lastSearchedTerm: string;
  onSelectSuggestion: (item: StoreSuggestion) => void;
  searchTop: number;
  suggestionTop: number;
  filtersVisible: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  onResetFilters: () => void;
  onApplyFilters: () => void;
  hasPendingChanges: boolean;
  categoryOptions: string[];
  tagOptions: string[];
  draftCategory: string;
  onSelectCategory: (value: string) => void;
  draftTag: string;
  onSelectTag: (value: string) => void;
  radiusMeters: number;
  onChangeRadius: (value: number) => void;
  radiusLabel: string;
};

const SearchBar = memo<{
  searchTerm: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  loading: boolean;
}>(({ searchTerm, onChangeText, onClear, loading }) => (
  <View style={styles.searchBarContainer} pointerEvents="box-none">
    <View style={styles.searchBox}>
      <Ionicons name="search" size={18} color={HOME_COLORS.mapMuted} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="매장 이름 또는 키워드를 검색하세요"
        placeholderTextColor={HOME_COLORS.mapMutedAlt}
        value={searchTerm}
        onChangeText={onChangeText}
      />
      {searchTerm.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={onClear}>
          <Ionicons name="close-circle" size={16} color={HOME_COLORS.mapMutedAlt} />
        </TouchableOpacity>
      )}
      {loading && (
        <ActivityIndicator size="small" color={HOME_COLORS.action} style={styles.searchSpinner} />
      )}
    </View>
  </View>
));

SearchBar.displayName = 'SearchBar';

const SuggestionList = memo<{
  suggestions: StoreSuggestion[];
  onSelect: (item: StoreSuggestion) => void;
}>(({ suggestions, onSelect }) => (
  <View style={styles.suggestionList}>
    <ScrollView
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {suggestions.map((item) => (
        <TouchableOpacity
          key={`${item.placeId}-${item.lat}-${item.lng}`}
          style={styles.suggestionItem}
          onPress={() => onSelect(item)}
          activeOpacity={0.85}
        >
          <Text style={styles.suggestionTitle} numberOfLines={1}>
            {item.storeName}
          </Text>
          <Text style={styles.suggestionAddress} numberOfLines={1}>
            {item.address ?? '주소 정보 없음'}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
));

SuggestionList.displayName = 'SuggestionList';

const MapFilters: React.FC<MapFiltersProps> = ({
  searchTerm,
  onChangeSearchTerm,
  onClearSearch,
  suggestions,
  suggestLoading,
  lastSearchedTerm,
  onSelectSuggestion,
  searchTop,
  suggestionTop,
  filtersVisible,
  onToggleFilters,
  activeFilterCount,
  onResetFilters,
  onApplyFilters,
  hasPendingChanges,
  categoryOptions,
  tagOptions,
  draftCategory,
  onSelectCategory,
  draftTag,
  onSelectTag,
  radiusMeters,
  onChangeRadius,
  radiusLabel,
}) => (
  <View style={[styles.searchOverlay, { top: searchTop }]} pointerEvents="box-none">
    <View style={styles.searchRow}>
      <View style={styles.searchGrow}>
        <SearchBar
          searchTerm={searchTerm}
          onChangeText={onChangeSearchTerm}
          onClear={onClearSearch}
          loading={suggestLoading}
        />
      </View>
      <TouchableOpacity
        style={styles.filterToggle}
        onPress={onToggleFilters}
        activeOpacity={0.8}
      >
        <Ionicons name="options-outline" size={18} color={HOME_COLORS.inkSoft} />
        <Text style={styles.filterToggleText}>
          {filtersVisible ? '필터 닫기' : `필터${activeFilterCount ? ` · ${activeFilterCount}` : ''}`}
        </Text>
      </TouchableOpacity>
    </View>
    {activeFilterCount > 0 && (
      <View style={styles.filterBadgeRow}>
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>필터 {activeFilterCount}개 적용</Text>
        </View>
        <TouchableOpacity style={styles.filterReset} onPress={onResetFilters}>
          <Text style={styles.filterResetText}>초기화</Text>
        </TouchableOpacity>
      </View>
    )}
    {filtersVisible && (
      <View style={styles.filterPanel}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>카테고리</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {categoryOptions.map(option => {
              const isActive = draftCategory === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => onSelectCategory(option)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>해시태그</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {tagOptions.map(option => {
              const isActive = draftTag === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => onSelectTag(option)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterRowHeader}>
            <Text style={styles.filterLabel}>내 위치 반경</Text>
            <Text style={styles.filterValue}>{radiusLabel}</Text>
          </View>
          <Slider
            value={radiusMeters}
            onValueChange={onChangeRadius}
            minimumValue={300}
            maximumValue={5000}
            step={100}
            minimumTrackTintColor={HOME_COLORS.ink}
            maximumTrackTintColor={HOME_COLORS.border}
            thumbTintColor={HOME_COLORS.ink}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterApply, !hasPendingChanges && styles.filterApplyDisabled]}
          onPress={onApplyFilters}
          activeOpacity={0.85}
        >
          <Text style={styles.filterApplyText}>적용</Text>
        </TouchableOpacity>
      </View>
    )}
    {searchTerm.trim().length > 0 && (
      <View style={[styles.suggestionOverlay, { top: suggestionTop }]} pointerEvents="box-none">
        {suggestions.length > 0 ? (
          <SuggestionList suggestions={suggestions} onSelect={onSelectSuggestion} />
        ) : !suggestLoading && lastSearchedTerm ? (
          <View style={styles.suggestionEmpty}>
            <Text style={styles.suggestionEmptyText}>
              '{lastSearchedTerm}'에 대한 결과가 없습니다.
            </Text>
          </View>
        ) : null}
      </View>
    )}
  </View>
);

export default memo(MapFilters);

const styles = StyleSheet.create({
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  searchGrow: {
    flex: 1,
  },
  filterToggle: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: HOME_COLORS.surfacePanel,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleText: {
    marginTop: 4,
    fontSize: 11,
    color: HOME_COLORS.inkSoft,
    fontWeight: '600',
  },
  filterBadgeRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: HOME_COLORS.mapBadge,
  },
  filterBadgeText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 11,
    fontWeight: '600',
  },
  filterReset: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: HOME_COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: HOME_COLORS.borderMuted,
  },
  filterResetText: {
    fontSize: 11,
    fontWeight: '600',
    color: HOME_COLORS.textSecondary,
  },
  filterPanel: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: HOME_COLORS.surfacePanelSoft,
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  filterRow: {
    marginBottom: 10,
  },
  filterRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  filterLabel: {
    fontSize: 12,
    color: HOME_COLORS.mapLabel,
    marginBottom: 6,
    fontWeight: '600',
  },
  filterValue: {
    fontSize: 12,
    color: HOME_COLORS.ink,
    fontWeight: '700',
  },
  filterApply: {
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME_COLORS.ink,
  },
  filterApplyDisabled: {
    opacity: 0.4,
  },
  filterApplyText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 13,
    fontWeight: '700',
  },
  filterScroll: {
    paddingRight: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: HOME_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: HOME_COLORS.borderStrong,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: HOME_COLORS.ink,
    borderColor: HOME_COLORS.ink,
  },
  filterChipText: {
    fontSize: 12,
    color: HOME_COLORS.textMutedAlt,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: HOME_COLORS.textOnDark,
  },
  searchBarContainer: {
    width: '100%',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HOME_COLORS.mapSearchBg,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: HOME_COLORS.borderSubtle,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: HOME_COLORS.mapText,
    fontSize: 15,
  },
  clearButton: {
    paddingHorizontal: 6,
  },
  searchSpinner: {
    marginLeft: 6,
  },
  suggestionList: {
    backgroundColor: HOME_COLORS.surface,
    borderRadius: 14,
    paddingVertical: 4,
    maxHeight: 200,
    borderWidth: 1.5,
    borderColor: HOME_COLORS.borderHint,
    shadowColor: HOME_COLORS.shadowSoft,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  suggestionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 11,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HOME_COLORS.divider,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: HOME_COLORS.inkSoft,
  },
  suggestionAddress: {
    marginTop: 2,
    fontSize: 12,
    color: HOME_COLORS.mapMuted,
  },
  suggestionEmpty: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: HOME_COLORS.overlayDarkMid,
  },
  suggestionEmptyText: {
    color: HOME_COLORS.textOnDark,
    fontSize: 13,
  },
});
