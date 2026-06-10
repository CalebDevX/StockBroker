import { useMutation } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { authApi } from "@/lib/api";

export default function KycScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [postalCode, setPostalCode] = useState("");
  const [sourceOfFunds, setSourceOfFunds] = useState("");
  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [chn, setChn] = useState("");

  const isVerified = user?.kycStatus === "verified";
  const isPending = user?.kycStatus === "pending";

  const mutation = useMutation({
    mutationFn: () =>
      authApi.submitKyc({
        fullName,
        phone,
        dob,
        address,
        city,
        state,
        country,
        postalCode,
        sourceOfFunds,
        bvn,
        nin,
        chn,
      }),
    onSuccess: () => {
      Alert.alert("KYC Submitted", "Your KYC application has been submitted. We will notify you when it is verified.");
      router.push("/");
    },
    onError: (error: any) => {
      Alert.alert("Submission Failed", error?.message ?? "Unable to submit KYC right now.");
    },
  });

  const readyToSubmit = useMemo(
    () =>
      !!fullName &&
      !!phone &&
      !!dob &&
      !!address &&
      !!city &&
      !!state &&
      !!country &&
      !!postalCode &&
      !!sourceOfFunds &&
      !!bvn &&
      !!nin,
    [fullName, phone, dob, address, city, state, country, postalCode, sourceOfFunds, bvn, nin]
  );

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 20, paddingTop: Platform.OS === "web" ? 72 : insets.top + 20, paddingBottom: insets.bottom + 24 },
    title: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.foreground, marginBottom: 8 },
    subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginBottom: 20 },
    field: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      marginBottom: 14,
      padding: 14,
    },
    label: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.mutedForeground, marginBottom: 6 },
    actionButton: {
      marginTop: 12,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    actionText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.primaryForeground },
    infoBox: { backgroundColor: colors.muted, borderRadius: 16, padding: 16, marginBottom: 20 },
    helper: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginBottom: 20 },
  });

  if (isVerified) {
    return (
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}>
        <Stack.Screen options={{ title: "KYC Verification" }} />
        <ScrollView style={s.root} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>KYC Verified</Text>
          <Text style={s.subtitle}>Your identity has been confirmed and premium trading is unlocked.</Text>
          <View style={[s.infoBox, { backgroundColor: colors.positive }]}> 
            <Text style={[s.actionText, { color: colors.primaryForeground, marginBottom: 8 }]}>Verification complete</Text>
            <Text style={[s.helper, { color: colors.primaryForeground }]}>You are ready to trade. Return to the dashboard to continue.</Text>
          </View>
          <Pressable style={[s.actionButton, { backgroundColor: colors.primaryForeground }]} onPress={() => router.push("/") }>
            <Text style={[s.actionText, { color: colors.primary }]}>Go to Dashboard</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}>
      <Stack.Screen options={{ title: "KYC Verification" }} />
      <ScrollView style={s.root} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Complete Your KYC</Text>
        <Text style={s.subtitle}>Submit your details so we can verify your identity and unlock trading.</Text>
        {isPending && (
          <View style={[s.infoBox, { backgroundColor: colors.muted, marginBottom: 16 }]}> 
            <Text style={[s.helper, { color: colors.foreground }]}>Your KYC is currently under review. We will notify you when verification is complete.</Text>
          </View>
        )}

        <Text style={s.label}>Full Name</Text>
        <TextInput style={s.field} value={fullName} onChangeText={setFullName} placeholder="Enter your full name" placeholderTextColor={colors.mutedForeground} />

        <Text style={s.label}>Phone Number</Text>
        <TextInput style={s.field} value={phone} onChangeText={setPhone} placeholder="0801 234 5678" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" />

        <Text style={s.label}>Date of Birth</Text>
        <TextInput style={s.field} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} />

        <Text style={s.label}>Address</Text>
        <TextInput style={s.field} value={address} onChangeText={setAddress} placeholder="Street address" placeholderTextColor={colors.mutedForeground} />

        <Text style={s.label}>City</Text>
        <TextInput style={s.field} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.mutedForeground} />

        <Text style={s.label}>State</Text>
        <TextInput style={s.field} value={state} onChangeText={setState} placeholder="State" placeholderTextColor={colors.mutedForeground} />

        <Text style={s.label}>Postal Code</Text>
        <TextInput style={s.field} value={postalCode} onChangeText={setPostalCode} placeholder="Postal code" placeholderTextColor={colors.mutedForeground} keyboardType="numbers-and-punctuation" />

        <Text style={s.label}>Source of Funds</Text>
        <TextInput style={s.field} value={sourceOfFunds} onChangeText={setSourceOfFunds} placeholder="Salary, savings, business, etc." placeholderTextColor={colors.mutedForeground} />

        <Text style={s.label}>BVN</Text>
        <TextInput style={s.field} value={bvn} onChangeText={setBvn} placeholder="11-digit BVN" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" maxLength={11} />

        <Text style={s.label}>NIN</Text>
        <TextInput style={s.field} value={nin} onChangeText={setNin} placeholder="11-digit NIN" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" maxLength={11} />

        <Text style={s.label}>Customer Reference Number</Text>
        <TextInput style={s.field} value={chn} onChangeText={setChn} placeholder="CHN (optional)" placeholderTextColor={colors.mutedForeground} />

        <Text style={s.helper}>We will use these details to verify your identity and comply with local KYC requirements.</Text>

        <Pressable
          style={[s.actionButton, { opacity: readyToSubmit && mutation.status !== "pending" ? 1 : 0.65 }]}
          onPress={() => mutation.mutate()}
          disabled={!readyToSubmit || mutation.status === "pending"}
        >
          {mutation.status === "pending" ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={s.actionText}>Submit KYC</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
