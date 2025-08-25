import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Profile, Comment } from '@/types/profile';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { useUser } from '@/contexts/UserContext';

export const [ProfilesProvider, useProfiles] = createContextHook(() => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [commentsByProfile, setCommentsByProfile] = useState<Record<string, Comment[]>>({});
  const [localVotes, setLocalVotes] = useState<Record<string, 'green' | 'red' | null>>({});
  const [voteCountsByProfile, setVoteCountsByProfile] = useState<Record<string, { green: number; red: number; userVote: 'green' | 'red' | null }>>({});
  const commentUnsubsRef = useRef<Record<string, () => void>>({});
  const { isUserApproved, user } = useUser();

  useEffect(() => {
    const tearDownComments = () => {
      const currentUnsubs = commentUnsubsRef.current;
      Object.keys(currentUnsubs).forEach((id) => {
        try { currentUnsubs[id](); } catch {}
      });
      commentUnsubsRef.current = {};
    };

    if (!isUserApproved) {
      setProfiles([]);
      setIsLoading(false);
      tearDownComments();
      return;
    }

    setIsLoading(true);
    const profilesRef = collection(db, 'profiles');
    const q = query(
      profilesRef,
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Profile[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const createdAtTs = data.createdAt as Timestamp | undefined;
          const base: Profile = {
            id: d.id,
            name: String(data.name ?? ''),
            age: Number(data.age ?? 0),
            city: String(data.city ?? ''),
            description: String(data.description ?? ''),
            profileImageUrl: String(data.profileImageUrl ?? ''),
            profileImageThumbUrl: data.profileImageThumbUrl ? String(data.profileImageThumbUrl) : undefined,
            uploaderUserId: String(data.uploaderUserId ?? data.userId ?? ''),
            uploaderUsername: String(data.uploaderUsername ?? ''),
            greenFlags: Number(data.greenFlags ?? 0),
            redFlags: Number(data.redFlags ?? 0),
            commentCount: Number(data.commentCount ?? 0),
            comments: [],
            userVote: null,
            createdAt: createdAtTs ? createdAtTs.toDate() : new Date(),
            approvalStatus: (data.approvalStatus as Profile['approvalStatus']) ?? 'approved',
          } as Profile;
          const attachedComments = commentsByProfile[d.id] ?? [];
          return {
            ...base,
            comments: attachedComments,
            commentCount: attachedComments.length || base.commentCount,
            userVote: localVotes[d.id] ?? null,
          } as Profile;
        });
        setProfiles(next);
        setIsLoading(false);

        const currentUnsubs = commentUnsubsRef.current;
        const nextUnsubs: Record<string, () => void> = { ...currentUnsubs };
        const existingIds = new Set(Object.keys(currentUnsubs));
        const incomingIds = new Set(next.map(p => p.id));

        existingIds.forEach((id) => {
          if (!incomingIds.has(id) && currentUnsubs[id]) {
            try { currentUnsubs[id](); } catch {}
            delete nextUnsubs[id];
          }
        });

        next.forEach((p) => {
          if (!nextUnsubs[p.id]) {
            const cRef = collection(db, 'profiles', p.id, 'comments');
            const cq = query(cRef, orderBy('createdAt', 'desc'));
            const cUnsub = onSnapshot(cq, (csnap) => {
              const cmts: Comment[] = csnap.docs.map((cd) => {
                const cdata = cd.data() as any;
                return {
                  id: cd.id,
                  userId: String(cdata.userId ?? ''),
                  username: String(cdata.username ?? ''),
                  text: String(cdata.text ?? ''),
                  timestamp: cdata.createdAt?.toDate ? cdata.createdAt.toDate() : new Date(),
                } as Comment;
              });
              setCommentsByProfile((prev) => ({ ...prev, [p.id]: cmts }));
            }, (cerr) => {
              console.error('comments snapshot error', p.id, cerr);
            });

            const vRef = collection(db, 'profiles', p.id, 'votes');
            const vUnsub = onSnapshot(vRef, (vsnap) => {
              let green = 0;
              let red = 0;
              let userVote: 'green' | 'red' | null = null;
              const authUid = (require('@/lib/firebase') as typeof import('@/lib/firebase')).auth.currentUser?.uid ?? null;
              vsnap.docs.forEach((vd) => {
                const vdata = vd.data() as any;
                const type = String(vdata.type ?? '');
                if (type === 'green') green++;
                else if (type === 'red') red++;
                if (authUid && vd.id === authUid) {
                  userVote = type === 'green' || type === 'red' ? (type as 'green' | 'red') : null;
                }
              });
              setVoteCountsByProfile((prev) => ({ ...prev, [p.id]: { green, red, userVote } }));
              if (userVote) {
                setLocalVotes((prev) => ({ ...prev, [p.id]: userVote }));
              }
            }, (verr) => {
              console.error('votes snapshot error', p.id, verr);
            });

            nextUnsubs[p.id] = () => {
              try { cUnsub(); } catch {}
              try { vUnsub(); } catch {}
            };
          }
        });
        commentUnsubsRef.current = nextUnsubs;
      },
      (err) => {
        console.error('profiles snapshot error', err);
        setIsLoading(false);
      }
    );

    return () => {
      try { unsub(); } catch {}
      tearDownComments();
    };
  }, [isUserApproved]);

  const addProfile = useCallback(
    async (
      newProfile: Omit<
        Profile,
        'id' | 'commentCount' | 'comments' | 'greenFlags' | 'redFlags' | 'userVote' | 'createdAt' | 'approvalStatus'
      >
    ): Promise<string> => {
      try {
        const ref = await addDoc(collection(db, 'profiles'), {
          name: newProfile.name,
          age: newProfile.age,
          city: newProfile.city,
          description: newProfile.description,
          profileImageUrl: newProfile.profileImageUrl,
          profileImageThumbUrl: newProfile.profileImageThumbUrl ?? null,
          uploaderUserId: newProfile.uploaderUserId,
          uploaderUsername: newProfile.uploaderUsername,
          // Add userId for rules compatibility
          userId: newProfile.uploaderUserId,
          greenFlags: 0,
          redFlags: 0,
          commentCount: 0,
          createdAt: serverTimestamp(),
          approvalStatus: 'approved',
        });
        console.log('profile created with id', ref.id);
        return ref.id;
      } catch (e) {
        console.error('addProfile error', e);
        throw e;
      }
    },
    []
  );

  const addComment = useCallback(async (profileId: string, commentText: string) => {
    try {
      const { auth } = await import('@/lib/firebase');
      const uid = auth.currentUser?.uid ?? 'anon';
      const generatedUsername = (user?.username ?? auth.currentUser?.displayName ?? '').toString();
      const usernameToSave = generatedUsername && generatedUsername.length > 0 ? generatedUsername : (uid !== 'anon' ? `user_${uid.slice(0,6)}` : 'user');
      const cRef = collection(db, 'profiles', profileId, 'comments');
      await addDoc(cRef, {
        text: commentText,
        userId: uid,
        username: usernameToSave,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('addComment error', e);
      throw e;
    }
  }, [user]);

  const vote = useCallback(async (profileId: string, voteType: 'green' | 'red') => {
    try {
      const { auth } = await import('@/lib/firebase');
      const uid = auth.currentUser?.uid;
      const username = auth.currentUser?.displayName ?? 'user';
      if (!uid) {
        console.error('User not authenticated');
        return;
      }

      const existingVote = localVotes[profileId];
      if (existingVote === voteType) {
        console.log('User already voted', voteType, 'for profile', profileId);
        return;
      }

      const voteRef = doc(db, 'profiles', profileId, 'votes', uid);
      await setDoc(voteRef, {
        type: voteType,
        userId: uid,
        username,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setLocalVotes((prev) => ({ ...prev, [profileId]: voteType }));
      console.log('Vote recorded in votes subcollection:', voteType, 'for profile:', profileId);
    } catch (e) {
      console.error('vote error', e);
      throw e;
    }
  }, [localVotes]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const mergedProfiles = useMemo<Profile[]>(() => {
    return profiles.map((p) => {
      const cmts = commentsByProfile[p.id] ?? p.comments ?? [];
      const votes = voteCountsByProfile[p.id];
      return {
        ...p,
        comments: cmts,
        commentCount: cmts.length || p.commentCount,
        greenFlags: votes ? votes.green : p.greenFlags,
        redFlags: votes ? votes.red : p.redFlags,
        userVote: (votes?.userVote ?? null) ?? (localVotes[p.id] ?? p.userVote),
      };
    });
  }, [profiles, commentsByProfile, localVotes]);

  return {
    profiles: mergedProfiles,
    isLoading,
    refreshing,
    addProfile,
    addComment,
    vote,
    refresh,
  };
});