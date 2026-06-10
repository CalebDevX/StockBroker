import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type Tab = "login" | "register";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Register fields
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);

  const s = makeStyles(colors, insets);

  async function handleLogin() {
    if (!email.trim() || !password) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!fullName.trim() || !regEmail.trim() || !phone.trim() || !regPassword) {
      setError("Please fill in all fields"); return;
    }
    if (regPassword !== confirmPw) { setError("Passwords do not match"); return; }
    if (regPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    try {
      await register({
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[s.root, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>SB</Text>
          </View>
          <View>
            <Text style={[s.appName, { color: colors.foreground }]}>StockBroker NG</Text>
            <Text style={[s.appSub, { color: colors.mutedForeground }]}>Nigerian Exchange — NSE</Text>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={[s.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["login", "register"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              style={[s.tabBtn, tab === t && { backgroundColor: colors.primary }]}
              onPress={() => { setTab(t); setError(""); }}
            >
              <Text style={[s.tabLabel, { color: tab === t ? colors.primaryForeground : colors.mutedForeground }]}>
                {t === "login" ? "Sign In" : "Create Account"}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <View style={[s.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Login Form */}
        {tab === "login" && (
          <View style={s.form}>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Email Address</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Password</Text>
              <View>
                <TextInput
                  style={[s.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground, paddingRight: 48 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable style={s.eyeBtn} onPress={() => setShowPw(v => !v)}>
                  <Feather name={showPw ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
            <Pressable
              style={[s.primaryBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Sign In</Text>
              }
            </Pressable>
          </View>
        )}

        {/* Register Form */}
        {tab === "register" && (
          <View style={s.form}>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Full Name</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Chukwuemeka Okonkwo"
                placeholderTextColor={colors.mutedForeground}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Email Address</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={regEmail}
                onChangeText={setRegEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Phone Number</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="08012345678"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Password</Text>
              <View>
                <TextInput
                  style={[s.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground, paddingRight: 48 }]}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.mutedForeground}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry={!showRegPw}
                />
                <Pressable style={s.eyeBtn} onPress={() => setShowRegPw(v => !v)}>
                  <Feather name={showRegPw ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Confirm Password</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Repeat your password"
                placeholderTextColor={colors.mutedForeground}
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry
                onSubmitEditing={handleRegister}
              />
            </View>
            <View style={[s.noticeBox, { backgroundColor: colors.accent, borderColor: colors.border }]}>
              <Feather name="info" size={13} color={colors.mutedForeground} />
              <Text style={[s.noticeText, { color: colors.mutedForeground }]}>
                Full KYC (BVN/NIN) required before trading. Complete via your profile after sign-up.
              </Text>
            </View>
            <Pressable
              style={[s.primaryBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Create Account</Text>
              }
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: Platform.OS === "web" ? 67 : insets.top + 24,
      paddingBottom: insets.bottom + 32,
    },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
    logoBox: {
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
    logoText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
    appName: { fontFamily: "Inter_700Bold", fontSize: 17 },
    appSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
    tabBar: {
      flexDirection: "row", borderRadius: 14, borderWidth: 1,
      padding: 4, marginBottom: 24, gap: 4,
    },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
    tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
    errorBox: {
      flexDirection: "row", alignItems: "center", gap: 8,
      borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16,
    },
    errorText: { color: "#EF4444", fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
    form: { gap: 4 },
    field: { marginBottom: 16 },
    label: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 8 },
    input: {
      borderWidth: 1, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      fontFamily: "Inter_400Regular", fontSize: 15,
    },
    eyeBtn: { position: "absolute", right: 14, top: 14 },
    primaryBtn: {
      borderRadius: 14, paddingVertical: 16,
      alignItems: "center", marginTop: 8,
    },
    primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
    noticeBox: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8,
    },
    noticeText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 18 },
  });
}
