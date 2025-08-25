import { Tabs } from "expo-router";
import { Beer, Plus, Search } from "lucide-react-native";
import React, { useMemo } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";

export default function TabLayout() {
  const { user } = useUser();
  const hideTabs = useMemo(() => !user, [user]);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tabIconSelected,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: false,
        tabBarStyle: hideTabs
          ? { display: 'none' }
          : {
              backgroundColor: Colors.light.background,
              borderTopColor: "#D1D5DB",
              borderTopWidth: 1,
              borderBottomColor: "#D1D5DB",
              borderBottomWidth: 1,
              paddingBottom: bottomPadding,
              paddingTop: 8,
            },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "900",
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
          textTransform: 'lowercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "home",
          tabBarIcon: ({ color, size }) => <Beer color={color} size={size} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "add",
          tabBarIcon: ({ color, size }) => <Plus color={color} size={size} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "search",
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}