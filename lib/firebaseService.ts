import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { User as AppUser, RegistrationData, UserStatus } from '@/types/profile';

export interface FirebaseUserDoc {
  id: string;
  email: string;
  name: string;
  phone: string;
  location: string;
  status: UserStatus;
  username?: string;
  selfieUrl?: string;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
}

// Auth Services
export const authService = {
  // Register new user
  async register(data: RegistrationData): Promise<{ user: AppUser; firebaseUser: FirebaseUserDoc }> {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseAuthUser = userCredential.user;

      // Upload selfie to Firebase Storage
      let selfieUrl = '';
      if (data.selfieUri) {
        selfieUrl = await storageService.uploadSelfie(firebaseAuthUser.uid, data.selfieUri);
      }

      // Create user document in Firestore
      const userData: FirebaseUserDoc = {
        id: firebaseAuthUser.uid,
        email: data.email.toLowerCase().trim(),
        name: data.name.trim(),
        phone: data.phone.replace(/[\s\-\(\)]/g, ''),
        location: data.location.trim(),
        status: 'pending_verification',
        selfieUrl,
        createdAt: serverTimestamp() as Timestamp,
      };

      await setDoc(doc(db, 'users', firebaseAuthUser.uid), userData);

      // Update Firebase Auth profile
      await updateProfile(firebaseAuthUser, {
        displayName: data.name.trim()
      });

      const user: AppUser = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        location: userData.location,
        selfieUrl: selfieUrl,
        status: userData.status,
        createdAt: new Date(),
      };

      return { user, firebaseUser: userData };
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      
      throw new Error('Failed to create account. Please try again.');
    }
  },

  // Login user
  async login(email: string, password: string): Promise<AppUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }
      
      const userData = userDoc.data() as FirebaseUserDoc;
      
      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        location: userData.location,
        selfieUrl: userData.selfieUrl || '',
        status: userData.status,
        username: userData.username,
        createdAt: userData.createdAt.toDate(),
        approvedAt: userData.approvedAt?.toDate(),
      };
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      }
      
      throw new Error('Login failed. Please try again.');
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: FirebaseUserDoc | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            callback(userDoc.data() as FirebaseUserDoc);
          } else {
            callback(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  },
};

// User Services
export const userService = {
  // Get user by ID
  async getUser(userId: string): Promise<AppUser | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return null;
      }
      
      const userData = userDoc.data() as FirebaseUserDoc;
      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        location: userData.location,
        selfieUrl: userData.selfieUrl || '',
        status: userData.status,
        username: userData.username,
        createdAt: userData.createdAt.toDate(),
        approvedAt: userData.approvedAt?.toDate(),
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Update user status (admin function)
  async updateUserStatus(userId: string, status: UserStatus, username?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
      };
      
      if (status === 'approved_username_assigned' && username) {
        updateData.username = username;
        updateData.approvedAt = serverTimestamp();
      }
      
      await updateDoc(doc(db, 'users', userId), updateData);
    } catch (error) {
      console.error('Error updating user status:', error);
      throw new Error('Failed to update user status');
    }
  },

  // Listen to user status changes
  onUserStatusChanged(userId: string, callback: (user: AppUser | null) => void) {
    return onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as FirebaseUserDoc;
        callback({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          location: userData.location,
          selfieUrl: userData.selfieUrl || '',
          status: userData.status,
          username: userData.username,
          createdAt: userData.createdAt.toDate(),
          approvedAt: userData.approvedAt?.toDate(),
        });
      } else {
        callback(null);
      }
    });
  },

  // Get pending users (admin function)
  async getPendingUsers(): Promise<AppUser[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('status', '==', 'pending_verification')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const userData = doc.data() as FirebaseUserDoc;
        return {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          location: userData.location,
          selfieUrl: userData.selfieUrl || '',
          status: userData.status,
          username: userData.username,
          createdAt: userData.createdAt.toDate(),
          approvedAt: userData.approvedAt?.toDate(),
        };
      });
    } catch (error) {
      console.error('Error getting pending users:', error);
      return [];
    }
  },
};

// Storage Services
export const storageService = {
  // Upload selfie image
  async uploadSelfie(userId: string, imageUri: string): Promise<string> {
    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Create storage reference
      const imageRef = ref(storage, `selfies/${userId}/selfie.jpg`);
      
      // Upload image
      await uploadBytes(imageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading selfie:', error);
      throw new Error('Failed to upload selfie');
    }
  },

  // Delete selfie image
  async deleteSelfie(userId: string): Promise<void> {
    try {
      const imageRef = ref(storage, `selfies/${userId}/selfie.jpg`);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting selfie:', error);
      // Don't throw error as this is not critical
    }
  },
};

// Username generation utility
export const generateUsername = (): string => {
  const adjectives = ['cool', 'wild', 'night', 'fire', 'storm', 'swift', 'bold', 'dark', 'bright', 'strong'];
  const nouns = ['bear', 'wolf', 'lion', 'eagle', 'tiger', 'hawk', 'fox', 'shark', 'bull', 'ram'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 3-digit number
  
  return `${adjective}${noun}${number}`;
};