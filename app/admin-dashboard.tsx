import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Flag, BarChart3, Settings, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import Colors from '@/constants/colors';
import { db } from '@/lib/firebase';
import { useUser } from '@/contexts/UserContext';
import { useUserRole } from '@/lib/userRoles';

interface AdminStats {
  pendingUsers: number;
  totalUsers: number;
  contentReports: number;
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;
  const { logout } = useUser();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState<AdminStats>({
    pendingUsers: 0,
    totalUsers: 0,
    contentReports: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      Alert.alert('Unauthorized', 'You do not have access to the admin dashboard.', [
        {
          text: 'OK',
          onPress: () => router.replace('/login' as any),
        },
      ]);
      return;
    }
    const unsubscribers: (() => void)[] = [];
    try {
      const pendingQ = query(collection(db, 'users'), where('status', '==', 'pending_verification'));
      const usersQ = query(collection(db, 'users'));
      const flagsQ = query(collection(db, 'flags'));

      unsubscribers.push(onSnapshot(pendingQ, 
        (snap) => setStats((p) => ({ ...p, pendingUsers: snap.size })),
        (error) => {
          console.error('[admin] pending users listener error:', error);
          setStats((p) => ({ ...p, pendingUsers: 0 }));
        }
      ));
      
      unsubscribers.push(onSnapshot(usersQ, 
        (snap) => setStats((p) => ({ ...p, totalUsers: snap.size })),
        (error) => {
          console.error('[admin] total users listener error:', error);
          setStats((p) => ({ ...p, totalUsers: 0 }));
        }
      ));
      
      unsubscribers.push(onSnapshot(flagsQ, 
        (snap) => setStats((p) => ({ ...p, contentReports: snap.size })),
        (error) => {
          console.error('[admin] flags listener error:', error);
          setStats((p) => ({ ...p, contentReports: 0 }));
        }
      ));
    } catch (e) {
      console.error('[admin] stats listeners setup error', e);
      Alert.alert('Error', 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
    return () => {
      unsubscribers.forEach((u) => {
        try {
          u();
        } catch {}
      });
    };
  }, [isAdmin, roleLoading]);

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/login' as any);
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  }, [logout]);

  const StatCard = useCallback(({ title, value, color }: { title: string; value: number; color: string }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]} testID={`stat-${title.replace(/\s/g, '-')}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  ), []);

  const ActionCard = useCallback(({ title, description, icon, onPress, badge }: { title: string; description: string; icon: React.ReactNode; onPress: () => void; badge?: number; }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85} testID={`action-${title.replace(/\s/g, '-')}`}>
      <View style={styles.actionCardHeader}>
        <View style={styles.actionCardIcon}>{icon}</View>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.actionCardTitle}>{title}</Text>
      <Text style={styles.actionCardDescription}>{description}</Text>
    </TouchableOpacity>
  ), []);

  const content = useMemo(() => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT }}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <StatCard title="pending users" value={stats.pendingUsers} color="#FF6B35" />
          <StatCard title="total users" value={stats.totalUsers} color="#2196F3" />
          <StatCard title="flagged content" value={stats.contentReports} color="#FF9800" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionCard
            title="User Approval"
            description="Review and approve pending user registrations"
            icon={<Users size={24} color={Colors.light.text} />}
            onPress={() => router.push('/admin/user-approval' as any)}
            badge={stats.pendingUsers}
          />
          <ActionCard
            title="Content Moderation"
            description="Review flagged profiles and content"
            icon={<Flag size={24} color={Colors.light.text} />}
            onPress={() => router.push('/admin/content-moderation' as any)}
            badge={stats.contentReports}
          />
          <ActionCard
            title="Analytics"
            description="View detailed app analytics and insights"
            icon={<BarChart3 size={24} color={Colors.light.text} />}
            onPress={() => router.push('/admin/analytics' as any)}
          />
          <ActionCard
            title="Settings"
            description="Configure app settings and preferences"
            icon={<Settings size={24} color={Colors.light.text} />}
            onPress={() => Alert.alert('Coming Soon', 'Settings feature will be available soon')}
          />
        </View>
      </View>
    </ScrollView>
  ), [ActionCard, StatCard, stats.contentReports, stats.pendingUsers, stats.totalUsers]);

  if (loading || roleLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingBottom: insets.bottom }] }>
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header]}>
        <Text style={styles.headerTitle}>Beer App Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} testID="logout-button">
          <LogOut size={20} color={Colors.light.text} />
        </TouchableOpacity>
      </View>
      {content}
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
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 12,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.text,
    textTransform: 'capitalize',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 16,
    width: '48%',
    minHeight: 120,
  },
  actionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  actionCardIcon: {
    padding: 8,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 6,
  },
  badge: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900' as const,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  actionCardDescription: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.tabIconDefault,
    lineHeight: 16,
  },
});