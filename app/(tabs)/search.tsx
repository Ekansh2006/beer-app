import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Filter } from 'lucide-react-native';
import { Image } from 'expo-image';

import Colors from '@/constants/colors';
import { useProfiles } from '@/contexts/ProfilesContext';
import ProfileCard from '@/components/ProfileCard';
import { Profile } from '@/types/profile';

type SortOption = 'recent' | 'popular' | 'name' | 'location';
type FilterOption = 'all' | 'high-rated' | 'recent-comments';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;
  const { profiles } = useProfiles();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const filteredAndSortedProfiles = useMemo(() => {
    let filtered = profiles;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = profiles.filter(
        (profile) =>
          profile.name.toLowerCase().includes(query) ||
          profile.city.toLowerCase().includes(query) ||
          profile.description.toLowerCase().includes(query) ||
          profile.uploaderUsername.toLowerCase().includes(query)
      );
    }

    // Apply additional filters
    switch (filterBy) {
      case 'high-rated':
        filtered = filtered.filter((profile) => profile.greenFlags > profile.redFlags);
        break;
      case 'recent-comments':
        filtered = filtered.filter((profile) => profile.commentCount > 0);
        break;
      default:
        break;
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.greenFlags - b.redFlags) - (a.greenFlags - a.redFlags);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'location':
          return a.city.localeCompare(b.city);
        case 'recent':
        default:
          return parseInt(b.id) - parseInt(a.id);
      }
    });

    return sorted;
  }, [profiles, searchQuery, sortBy, filterBy]);

  const BeerLogo = () => (
    <View style={styles.logoContainer}>
      <Image 
        source={{ uri: 'https://r2-pub.rork.com/attachments/bcjlgxvpsdw5ajmunl9az' }}
        style={styles.logoImage}
        contentFit="contain"
      />
    </View>
  );

  const clearSearch = () => {
    setSearchQuery('');
  };

  const { addComment, vote } = useProfiles();

  const renderProfile = ({ item }: { item: Profile }) => (
    <ProfileCard 
      profile={item} 
      onPress={(profile) => console.log('Profile pressed:', profile.name)}
      onAddComment={addComment}
      onVote={vote}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Search size={48} color={Colors.light.tabIconDefault} />
      <Text style={styles.emptyTitle}>
        {searchQuery.trim() ? 'no results found' : 'search profiles'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery.trim()
          ? `no profiles match "${searchQuery}"`
          : 'search by name, location, or description'}
      </Text>
    </View>
  );

  const renderFilterButton = (option: SortOption | FilterOption, label: string, isSort: boolean) => {
    const isActive = isSort ? sortBy === option : filterBy === option;
    return (
      <TouchableOpacity
        key={option}
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => {
          if (isSort) {
            setSortBy(option as SortOption);
          } else {
            setFilterBy(option as FilterOption);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
          {label.toLowerCase()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoSection}>
          <BeerLogo />
          <Text style={styles.appTitle}>beer</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={styles.headerButton}
        >
          <Filter
            size={24}
            color={showFilters ? Colors.light.primary : Colors.light.text}
          />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.light.tabIconDefault} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="search profiles..."
            placeholderTextColor={Colors.light.text}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={20} color={Colors.light.tabIconDefault} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>sort by</Text>
            <View style={styles.filterRow}>
              {renderFilterButton('recent', 'recent', true)}
              {renderFilterButton('popular', 'popular', true)}
              {renderFilterButton('name', 'name', true)}
              {renderFilterButton('location', 'location', true)}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>filter</Text>
            <View style={styles.filterRow}>
              {renderFilterButton('all', 'all', false)}
              {renderFilterButton('high-rated', 'high rated', false)}
              {renderFilterButton('recent-comments', 'has comments', false)}
            </View>
          </View>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsContainer}>
        {searchQuery.trim() && (
          <Text style={styles.resultsCount}>
            {filteredAndSortedProfiles.length} {filteredAndSortedProfiles.length === 1 ? 'result' : 'results'}
          </Text>
        )}

        <FlatList
          data={filteredAndSortedProfiles}
          renderItem={renderProfile}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: insets.bottom + TAB_BAR_HEIGHT },
            filteredAndSortedProfiles.length === 0 && styles.emptyListContainer,
          ]}
          ListEmptyComponent={renderEmptyState}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textTransform: 'lowercase' as const,
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: Colors.light.background,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  filtersContainer: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
  },
  filterButtonActive: {
    backgroundColor: Colors.light.background,
    borderColor: '#000000',
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  filterButtonTextActive: {
    color: Colors.light.text,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.light.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
});