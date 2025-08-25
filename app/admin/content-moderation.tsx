import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Flag, MessageSquare } from 'lucide-react-native';
import { router } from 'expo-router';
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

import Colors from '@/constants/colors';
import { db } from '@/lib/firebase';

interface FlaggedContent {
  id: string;
  profileId: string;
  userId: string;
  username: string;
  flagType: 'inappropriate' | 'spam' | 'fake' | 'other';
  timestamp: any;
  profileData?: {
    name: string;
    profileImageUrl: string;
    description: string;
  };
}

interface FlaggedComment {
  id: string;
  profileId: string;
  commenterId: string;
  commenterUsername: string;
  commentText: string;
  flagType: 'inappropriate' | 'spam' | 'harassment' | 'other';
  timestamp: any;
}

export default function ContentModeration() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;
  const [flaggedProfiles, setFlaggedProfiles] = useState<FlaggedContent[]>([]);
  const [flaggedComments, setFlaggedComments] = useState<FlaggedComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profiles' | 'comments'>('profiles');

  useEffect(() => {
    // Listen to flagged profiles
    const flagsQuery = query(
      collection(db, 'flags'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeFlags = onSnapshot(flagsQuery, (snapshot) => {
      const flags = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FlaggedContent[];
      
      setFlaggedProfiles(flags);
      setLoading(false);
    });

    // Listen to flagged comments
    const commentsQuery = query(
      collection(db, 'comments'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const comments = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as FlaggedComment))
        .filter(comment => comment.flagType);
      
      setFlaggedComments(comments);
    });

    return () => {
      unsubscribeFlags();
      unsubscribeComments();
    };
  }, []);

  const handleDeleteProfile = async (flagId: string, profileId: string) => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this profile? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(flagId);
            try {
              // Delete the profile
              await deleteDoc(doc(db, 'profiles', profileId));
              // Delete the flag
              await deleteDoc(doc(db, 'flags', flagId));
              Alert.alert('Success', 'Profile has been deleted');
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(commentId);
            try {
              await deleteDoc(doc(db, 'comments', commentId));
              Alert.alert('Success', 'Comment has been deleted');
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDismissFlag = async (flagId: string) => {
    Alert.alert(
      'Dismiss Flag',
      'Are you sure you want to dismiss this flag? The content will remain visible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          onPress: async () => {
            setProcessingId(flagId);
            try {
              await deleteDoc(doc(db, 'flags', flagId));
              Alert.alert('Success', 'Flag has been dismissed');
            } catch (error) {
              console.error('Error dismissing flag:', error);
              Alert.alert('Error', 'Failed to dismiss flag');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFlagTypeColor = (flagType: string): string => {
    switch (flagType) {
      case 'inappropriate': return '#F44336';
      case 'spam': return '#FF9800';
      case 'fake': return '#9C27B0';
      case 'harassment': return '#E91E63';
      default: return '#757575';
    }
  };

  const ProfileCard = ({ flag }: { flag: FlaggedContent }) => (
    <View style={styles.contentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.flagInfo}>
          <Flag size={16} color={getFlagTypeColor(flag.flagType)} />
          <Text style={[styles.flagType, { color: getFlagTypeColor(flag.flagType) }]}>
            {flag.flagType}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatDate(flag.timestamp)}</Text>
      </View>

      <View style={styles.contentInfo}>
        <Text style={styles.reportedBy}>Reported by: {flag.username}</Text>
        <Text style={styles.profileId}>Profile ID: {flag.profileId}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.dismissButton]}
          onPress={() => handleDismissFlag(flag.id)}
          disabled={processingId === flag.id}
          activeOpacity={0.8}
        >
          {processingId === flag.id ? (
            <ActivityIndicator size="small" color={Colors.light.text} />
          ) : (
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteProfile(flag.id, flag.profileId)}
          disabled={processingId === flag.id}
          activeOpacity={0.8}
        >
          {processingId === flag.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Trash2 size={16} color="white" />
              <Text style={styles.deleteButtonText}>Delete Profile</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const CommentCard = ({ comment }: { comment: FlaggedComment }) => (
    <View style={styles.contentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.flagInfo}>
          <MessageSquare size={16} color={getFlagTypeColor(comment.flagType)} />
          <Text style={[styles.flagType, { color: getFlagTypeColor(comment.flagType) }]}>
            {comment.flagType}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatDate(comment.timestamp)}</Text>
      </View>

      <View style={styles.commentContent}>
        <Text style={styles.commenterInfo}>
          By: {comment.commenterUsername}
        </Text>
        <Text style={styles.commentText}>{comment.commentText}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteComment(comment.id)}
          disabled={processingId === comment.id}
          activeOpacity={0.8}
        >
          {processingId === comment.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Trash2 size={16} color="white" />
              <Text style={styles.deleteButtonText}>Delete Comment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>content moderation</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.text} />
          <Text style={styles.loadingText}>Loading flagged content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>content moderation</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profiles' && styles.activeTab]}
          onPress={() => setActiveTab('profiles')}
        >
          <Text style={[styles.tabText, activeTab === 'profiles' && styles.activeTabText]}>
            Profiles ({flaggedProfiles.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
          onPress={() => setActiveTab('comments')}
        >
          <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
            Comments ({flaggedComments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'profiles' ? (
        flaggedProfiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No flagged profiles</Text>
            <Text style={styles.emptySubtext}>All profiles are clean</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT }}>
            {flaggedProfiles.map((flag) => (
              <ProfileCard key={flag.id} flag={flag} />
            ))}
          </ScrollView>
        )
      ) : (
        flaggedComments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No flagged comments</Text>
            <Text style={styles.emptySubtext}>All comments are clean</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT }}>
            {flaggedComments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </ScrollView>
        )
      )}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  activeTab: {
    backgroundColor: Colors.light.text,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  activeTabText: {
    color: Colors.light.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
  },
  contentCard: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagType: {
    fontSize: 14,
    fontWeight: '900' as const,
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.tabIconDefault,
  },
  contentInfo: {
    marginBottom: 16,
    gap: 4,
  },
  reportedBy: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  profileId: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.tabIconDefault,
  },
  commentContent: {
    marginBottom: 16,
    gap: 8,
  },
  commenterInfo: {
    fontSize: 14,
    fontWeight: '900' as const,
    color: Colors.light.text,
  },
  commentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minHeight: 44,
  },
  dismissButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  dismissButtonText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '900' as const,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900' as const,
  },
});