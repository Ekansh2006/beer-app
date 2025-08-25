import { Image } from "expo-image";
import React, { useState, useMemo, memo } from "react";
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ScrollView,
  Animated,
  Platform 
} from "react-native";
import { ChevronDown, ChevronUp, MessageCircle, Flag } from "lucide-react-native";

import Colors from "@/constants/colors";
import { Profile } from "@/types/profile";
import CommentInputModal from "./CommentInputModal";
import { transformCloudinaryUrl } from "@/lib/cloudinary";

interface ProfileCardProps {
  profile: Profile;
  onPress: (profile: Profile) => void;
  onGreenFlag?: (profile: Profile) => void;
  onRedFlag?: (profile: Profile) => void;
  onAddComment?: (profileId: string, comment: string) => void;
  onVote?: (profileId: string, voteType: 'green' | 'red') => void;
}

const ProfileCard = memo(function ProfileCard({ 
  profile, 
  onPress, 
  onGreenFlag, 
  onRedFlag,
  onAddComment,
  onVote
}: ProfileCardProps) {
  const [isCommentsExpanded, setIsCommentsExpanded] = useState<boolean>(false);
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false);
  const [animatedHeight] = useState(new Animated.Value(0));
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);
  
  const visibleComments = useMemo(() => {
    if (isCommentsExpanded) {
      return profile.comments;
    }
    return profile.comments.slice(0, 2);
  }, [profile.comments, isCommentsExpanded]);
  
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      return `${days}d`;
    }
  };
  const handleImagePress = () => {
    console.log('Image tapped for profile:', profile.name);
    onPress(profile);
  };

  const handleGreenFlag = () => {
    console.log('Green flag tapped for profile:', profile.name);
    if (profile.userVote === 'green') {
      console.log('User already voted green, ignoring');
      return;
    }
    onVote?.(profile.id, 'green');
    onGreenFlag?.(profile);
  };

  const handleRedFlag = () => {
    console.log('Red flag tapped for profile:', profile.name);
    if (profile.userVote === 'red') {
      console.log('User already voted red, ignoring');
      return;
    }
    onVote?.(profile.id, 'red');
    onRedFlag?.(profile);
  };
  
  const toggleComments = () => {
    const toValue = isCommentsExpanded ? 0 : 1;
    setIsCommentsExpanded(!isCommentsExpanded);
    
    if (Platform.OS !== 'web') {
      Animated.timing(animatedHeight, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };
  
  const handleAddComment = (commentText: string) => {
    console.log('Adding comment:', commentText, 'to profile:', profile.name);
    onAddComment?.(profile.id, commentText);
  };
  
  const openCommentModal = () => {
    setShowCommentModal(true);
  };
  
  const toggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };
  
  const shouldShowReadMore = profile.description && profile.description.length > 100;
  const displayDescription = useMemo(() => {
    if (!profile.description) return '';
    if (isDescriptionExpanded || !shouldShowReadMore) {
      return profile.description;
    }
    return profile.description.substring(0, 100) + '...';
  }, [profile.description, isDescriptionExpanded, shouldShowReadMore]);

  const imageUri = useMemo(() => {
    const base = profile.profileImageUrl;
    return transformCloudinaryUrl(base, {
      progressive: true,
      quality: "auto",
      format: "auto",
      crop: "fill",
      gravity: "auto",
      width: 1080,
      dpr: "auto",
    });
  }, [profile.profileImageUrl]);

  return (
    <View style={styles.container} testID={`profile-card-${profile.id}`}>
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={handleImagePress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          placeholder={blurhash}
        />
        
        <View style={styles.userInfoOverlay}>
          <Text style={styles.nameLocation}>
            {profile.name.toLowerCase()}, {profile.age} • {profile.city.toLowerCase()}
          </Text>
          <Text style={styles.uploaderText}>
            uploaded by @{profile.uploaderUsername.toLowerCase()}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Description Section */}
      <View style={styles.descriptionSection}>
        <Text style={styles.descriptionText}>
          {displayDescription.toLowerCase()}
        </Text>
        {shouldShowReadMore && (
          <TouchableOpacity 
            onPress={toggleDescription}
            activeOpacity={0.7}
            style={styles.readMoreButton}
          >
            <Text style={styles.readMoreText}>
              {isDescriptionExpanded ? 'read less' : 'read more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comments Section */}
      <View style={styles.commentsSection}>
        <TouchableOpacity 
          style={styles.commentsHeader}
          onPress={toggleComments}
          activeOpacity={0.7}
        >
          <View style={styles.commentsHeaderLeft}>
            <MessageCircle size={16} color={Colors.light.tabIconDefault} />
            <Text style={styles.commentsText}>
              {profile.commentCount} comment{profile.commentCount !== 1 ? 's' : ''}
            </Text>
          </View>
          {profile.comments.length > 2 && (
            <View style={styles.expandIcon}>
              {isCommentsExpanded ? (
                <ChevronUp size={16} color={Colors.light.tabIconDefault} />
              ) : (
                <ChevronDown size={16} color={Colors.light.tabIconDefault} />
              )}
            </View>
          )}
        </TouchableOpacity>
        
        {profile.comments.length > 0 && (
          <View style={styles.commentsContainer}>
            <ScrollView 
              style={[
                styles.commentsList,
                isCommentsExpanded && styles.commentsListExpanded
              ]}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {visibleComments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.commentUsername}>@{comment.username.toLowerCase()}</Text>
                  <Text style={styles.commentText}>{comment.text.toLowerCase()}</Text>
                  <Text style={styles.commentTimestamp}>
                    {formatTimestamp(comment.timestamp)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.addCommentButton}
              onPress={openCommentModal}
              activeOpacity={0.7}
            >
              <Text style={styles.addCommentText}>add a comment...</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {profile.comments.length === 0 && (
          <TouchableOpacity 
            style={styles.addCommentButton}
            onPress={openCommentModal}
            activeOpacity={0.7}
          >
            <Text style={styles.addCommentText}>be the first to comment...</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Flag System */}
      <View style={styles.flagSection}>
        <TouchableOpacity 
          style={[
            styles.flagButton,
            styles.greenFlagButton,
            profile.userVote === 'green' && styles.flagButtonSelected
          ]}
          onPress={handleGreenFlag}
          activeOpacity={0.7}
          disabled={profile.userVote === 'green'}
        >
          <View style={styles.flagContent}>
            <Flag size={16} color="#22c55e" />
            <Text style={[
              styles.flagText,
              styles.greenFlagText,
              profile.userVote === 'green' && styles.flagTextSelected
            ]}>{profile.greenFlags}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.flagButton,
            styles.redFlagButton,
            profile.userVote === 'red' && styles.flagButtonSelected
          ]}
          onPress={handleRedFlag}
          activeOpacity={0.7}
          disabled={profile.userVote === 'red'}
        >
          <View style={styles.flagContent}>
            <Flag size={16} color="#ef4444" />
            <Text style={[
              styles.flagText,
              styles.redFlagText,
              profile.userVote === 'red' && styles.flagTextSelected
            ]}>{profile.redFlags}</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <CommentInputModal
        visible={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onSubmit={handleAddComment}
        profileName={profile.name}
      />
    </View>
  );
});

const blurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: Colors.light.cardBackground,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    height: 300,
  },
  image: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  userInfoOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: "70%",
  },
  nameLocation: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  uploaderText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  descriptionSection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    backgroundColor: Colors.light.cardBackground,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    lineHeight: 19.6,
    marginBottom: 4,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  readMoreText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  commentsSection: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  commentsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentsText: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  expandIcon: {
    padding: 4,
  },
  commentsContainer: {
    marginTop: 8,
  },
  commentsList: {
    maxHeight: 80,
  },
  commentsListExpanded: {
    maxHeight: 200,
  },
  commentItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  commentUsername: {
    fontSize: 12,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    lineHeight: 18,
    marginBottom: 2,
  },
  commentTimestamp: {
    fontSize: 11,
    color: Colors.light.text,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  addCommentButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000000",
    minHeight: 44,
    justifyContent: 'center',
  },
  addCommentText: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  flagSection: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  flagButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000000",
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: Colors.light.cardBackground,
  },
  greenFlagButton: {
    backgroundColor: Colors.light.cardBackground,
  },
  redFlagButton: {
    backgroundColor: Colors.light.cardBackground,
  },
  flagButtonSelected: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  flagText: {
    fontSize: 14,
    fontWeight: "900" as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
  greenFlagText: {
    color: Colors.light.text,
  },
  redFlagText: {
    color: Colors.light.text,
  },
  flagTextSelected: {
    fontWeight: "900" as const,
  },
  flagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

export default ProfileCard;