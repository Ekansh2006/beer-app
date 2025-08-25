import React, { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from "expo-router";
import { UserPlus } from "lucide-react-native";

import ProfileCard from "@/components/ProfileCard";
import Colors from "@/constants/colors";
import { Profile } from "@/types/profile";
import { useProfiles } from "@/contexts/ProfilesContext";
import { useUser } from "@/contexts/UserContext";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;
  const { profiles, isLoading, refreshing, addComment, vote, refresh } = useProfiles();
  const { user, isLoading: userLoading, isUserApproved, isUserPending } = useUser();

  const handleRegister = () => {
    console.log('[Landing] Create Account pressed');
    router.push('/register');
  };

  const handleSignIn = () => {
    console.log('[Landing] Sign In pressed');
    router.push('/login');
  };

  const handleProfilePress = (profile: Profile) => {
    console.log("Profile pressed:", profile.name);
  };

  const renderProfile = useCallback(({ item }: { item: Profile }) => (
    <ProfileCard 
      profile={item} 
      onPress={handleProfilePress}
      onAddComment={addComment}
      onVote={vote}
    />
  ), [addComment, vote]);

  const keyExtractor = useCallback((item: Profile) => item.id, []);

  const onEndReached = useCallback(() => {
    console.log('Reached end of list');
  }, []);

  const EST_ITEM_HEIGHT = 480;
  const getItemLayout = useCallback((_: any, index: number) => {
    const length = EST_ITEM_HEIGHT;
    const offset = EST_ITEM_HEIGHT * index;
    return { length, offset, index };
  }, []);

  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        return;
      } else if (isUserPending) {
        router.replace('/verification-pending');
      } else if (!isUserApproved) {
        return;
      }
    }
  }, [user, userLoading, isUserApproved, isUserPending]);

  const BeerLogo = () => (
    <View style={styles.logoContainer}>
      <Image 
        source={{ uri: 'https://r2-pub.rork.com/attachments/bcjlgxvpsdw5ajmunl9az' }}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.logoSection}>
        <BeerLogo />
        <Text style={styles.appTitle}>beer</Text>
      </View>
      {!user && (
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          activeOpacity={0.8}
        >
          <UserPlus size={20} color={Colors.light.text} />
          <Text style={styles.registerButtonText}>join</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (userLoading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={[styles.registrationPrompt, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT }]}>
          <View style={styles.promptContainer}>
            <UserPlus size={64} color={Colors.light.text} />
            <Text style={styles.promptTitle}>join the beer community</Text>
            <Text style={styles.promptSubtitle}>
              men-only beer sharing platform
            </Text>
            <Text style={styles.promptDescription}>
              • share your beer experiences
            </Text>
            <Text style={styles.promptDescription}>
              • discover new brews from the community
            </Text>
            <Text style={styles.promptDescription}>
              • connect with fellow beer enthusiasts
            </Text>
            <View style={styles.ctaRow}>
              <TouchableOpacity
                testID="cta-create-account"
                style={[styles.ctaButton, styles.primaryCta]}
                onPress={handleRegister}
                activeOpacity={0.8}
              >
                <Text style={[styles.ctaText, styles.primaryCtaText]}>create account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="cta-sign-in"
                style={[styles.ctaButton, styles.secondaryCta]}
                onPress={handleSignIn}
                activeOpacity={0.8}
              >
                <Text style={[styles.ctaText, styles.secondaryCtaText]}>sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        testID="profiles-list"
        data={profiles}
        renderItem={renderProfile}
        keyExtractor={keyExtractor}
        numColumns={1}
        contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        windowSize={10}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={16}
        onEndReachedThreshold={0.3}
        onEndReached={onEndReached}
        getItemLayout={getItemLayout}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: Colors.light.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textTransform: 'lowercase' as const,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.background,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
  registrationPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  promptContainer: {
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 32,
    width: '100%',
    maxWidth: 400,
  },
  promptTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  promptSubtitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  promptDescription: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  ctaButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryCta: {
    backgroundColor: Colors.light.background,
    borderColor: '#000000',
  },
  secondaryCta: {
    backgroundColor: 'transparent',
    borderColor: '#000000',
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  primaryCtaText: {
    color: Colors.light.text,
  },
  secondaryCtaText: {
    color: Colors.light.text,
    opacity: 0.9,
  },
});