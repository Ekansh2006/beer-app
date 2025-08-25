import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, X, Eye, Calendar, MapPin, Mail } from 'lucide-react-native';
import { router } from 'expo-router';
import { 
  collection, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';

import Colors from '@/constants/colors';
import { db, auth } from '@/lib/firebase';
import { generateUsername } from '@/lib/firebaseService';
import { useUserRole } from '@/lib/userRoles';



interface PendingUser {
  id: string;
  email: string;
  name: string;
  location: string;
  status: string;
  selfieUrl: string;
  createdAt: any;
}

export default function UserApproval() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  const { isAdmin, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (roleLoading) return;
    if (!isAdmin) {
      Alert.alert('Unauthorized', 'You do not have access to this screen.', [
        { text: 'OK', onPress: () => router.replace('/login' as any) },
      ]);
      return;
    }

    console.log('🔄 Setting up real-time listener for pending users...');
    
    const pendingQuery = query(
      collection(db, 'users'),
      where('status', '==', 'pending_verification')
    );

    const unsubscribe = onSnapshot(
      pendingQuery, 
      (snapshot) => {
        console.log('📋 REAL-TIME UPDATE - Total pending users:', snapshot.docs.length);
        
        const users = snapshot.docs.map(doc => {
          const userData = {
            id: doc.id,
            ...doc.data()
          } as PendingUser;
          
          console.log('📋 Pending user:', userData.email, 'Status:', userData.status);
          return userData;
        });
        
        console.log('📋 Updated pending users list:', users.map(u => `${u.email} (${u.status})`));
        
        setPendingUsers(users.sort((a, b) => 
          (b.createdAt?.toDate() || new Date()).getTime() - 
          (a.createdAt?.toDate() || new Date()).getTime()
        ));
        setLoading(false);
      },
      (error) => {
        console.error('❌ Real-time listener error:', error);
        Alert.alert('Error', 'Failed to load pending users');
        setLoading(false);
      }
    );

    return () => {
      console.log('🔄 Cleaning up real-time listener');
      unsubscribe();
    };
  }, [isAdmin, roleLoading]);



  const approveUser = async (userId: string) => {
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      
      const username = generateUsername();
      
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved_username_assigned',
        username: username,
        approvedAt: serverTimestamp()
      });
      
      Alert.alert('Success', `User approved! Username: ${username}`);
    } catch (error: any) {
      console.error('Approve error:', error);
      Alert.alert('Error', `Failed to approve user: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleApprove = async (userId: string) => {
    console.log('🟢 APPROVE BUTTON PRESSED for user:', userId);
    console.log('🟢 User ID type:', typeof userId);
    console.log('🟢 User ID length:', userId.length);
    console.log('🟢 User ID characters:', userId.split('').map((char, i) => `${i}:${char}`).join(' '));
    console.log('🟢 Will create document path: users/' + userId);
    
    Alert.alert(
      'Approve User',
      'Are you sure you want to approve this user?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('APPROVE CANCELLED for', userId) },
        {
          text: 'Approve',
          onPress: async () => {
            console.log('🟢 APPROVE CONFIRMED for', userId);
            setProcessingUserId(userId);
            await approveUser(userId);
            setProcessingUserId(null);
          },
        },
      ]
    );
  };

  const rejectUser = async (userId: string) => {
    console.log('🔴 REJECT STARTED for userId:', userId);
    console.log('🔴 Using direct Firestore update with status="rejected"');
    console.log('🔴 Current user:', auth.currentUser?.email);

    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const docRef = doc(db, 'users', userId);
      
      const updateData = {
        status: 'rejected',
        rejectionReason: 'Manual review rejection',
        rejectedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
      console.log('✅ REJECT SUCCESS via Firestore');
      Alert.alert('Success', 'User rejected successfully!');
    } catch (error: any) {
      console.log('❌ REJECT FAILED - ERROR:', error?.message ?? String(error));
      Alert.alert('Error', `Failed to reject user: ${error?.message ?? 'Unknown error'}`);
    }
  };

  const handleReject = async (userId: string) => {
    console.log('🔴 REJECT BUTTON PRESSED for user:', userId);
    console.log('🔴 User ID type:', typeof userId);
    console.log('🔴 User ID length:', userId.length);
    console.log('🔴 User ID characters:', userId.split('').map((char, i) => `${i}:${char}`).join(' '));
    console.log('🔴 Will create document path: users/' + userId);
    
    Alert.alert(
      'Reject User',
      'Are you sure you want to reject this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('REJECT CANCELLED for', userId) },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            console.log('🔴 REJECT CONFIRMED for', userId);
            setProcessingUserId(userId);
            await rejectUser(userId);
            setProcessingUserId(null);
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

  const UserCard = ({ user }: { user: PendingUser }) => {
    console.log('🎯 RENDERING UserCard - ID:', user.id, 'Email:', user.email);
    console.log('🎯 User ID in card - Type:', typeof user.id, 'Length:', user.id.length);
    console.log('🎯 User ID characters:', user.id.split('').map((char, i) => `${i}:${char}`).join(' '));
    
    return (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <TouchableOpacity
          style={styles.selfieContainer}
          onPress={() => setSelectedImage(user.selfieUrl)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: user.selfieUrl }} style={styles.selfieImage} />
          <View style={styles.viewImageOverlay}>
            <Eye size={16} color="white" />
          </View>
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.userDetail}>
            <Mail size={14} color={Colors.light.tabIconDefault} />
            <Text style={styles.userDetailText}>{user.email}</Text>
          </View>
          <View style={styles.userDetail}>
            <MapPin size={14} color={Colors.light.tabIconDefault} />
            <Text style={styles.userDetailText}>{user.location}</Text>
          </View>
          <View style={styles.userDetail}>
            <Calendar size={14} color={Colors.light.tabIconDefault} />
            <Text style={styles.userDetailText}>{formatDate(user.createdAt)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          testID={`reject-${user.id}`}
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(user.id)}
          disabled={processingUserId === user.id}
          activeOpacity={0.8}
        >
          {processingUserId === user.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <X size={16} color="white" />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID={`approve-${user.id}`}
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(user.id)}
          disabled={processingUserId === user.id}
          activeOpacity={0.8}
        >
          {processingUserId === user.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Check size={16} color="white" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  if (loading || roleLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>user approval</Text>
        </View>
        <View style={styles.loadingContainer} testID="user-approval-loading">
          <ActivityIndicator size="large" color={Colors.light.text} />
          <Text style={styles.loadingText}>Loading pending users...</Text>
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
        <Text style={styles.headerTitle}>user approval</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingUsers.length}</Text>
        </View>
      </View>

      {pendingUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No pending users to review</Text>
          <Text style={styles.emptySubtext}>All users have been processed</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT }}>
          {pendingUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </ScrollView>
      )}

      {/* Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={() => setSelectedImage(null)}
            activeOpacity={1}
          >
            <View style={styles.modalContent}>
              {selectedImage && (
                <Image source={{ uri: selectedImage }} style={styles.fullSizeImage} />
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedImage(null)}
              >
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
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
  badge: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900' as const,
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
  userCard: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  selfieContainer: {
    position: 'relative',
    marginRight: 16,
  },
  selfieImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  viewImageOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 4,
  },
  userInfo: {
    flex: 1,
    gap: 6,
  },
  userName: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  userDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userDetailText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
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
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900' as const,
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    position: 'relative',
    maxWidth: '90%',
    maxHeight: '90%',
  },
  fullSizeImage: {
    width: 300,
    height: 400,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
  },
});