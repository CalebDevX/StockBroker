import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { fmtNaira, fundsApi, toNaira } from "@/lib/api";

type Mode = "deposit" | "withdraw";

const QUICK_AMOUNTS = [50_000, 100_000, 250_000, 500_000, 1_000_000];

export default function FundsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: balanceData, isLoading: loadingBalance, refetch } = useQuery({
    queryKey: ["funds-balance"],
    queryFn: () => fundsApi.balance(),
  });

  const balanceKobo = balanceData?.cashBalanceKobo ?? 0;
  const amountNaira = parseFloat(amount) || 0;
  const amountKobo = Math.round(amountNaira * 100);

  async function submit() {
    if (amountKobo <= 0) { Alert.alert("Invalid Amount", "Enter a valid amount."); return; }
    if (mode === "withdraw" && amountKobo > balanceKobo) {
      Alert.alert("Insufficient Funds", `Your cash balance is ${fmtNaira(balanceKobo)}.`); return;
    }
    setLoading(true);
    try {
      if (mode === "deposit") {
        await fundsApi.deposit(amountKobo, bankRef || undefined);
      } else {
        await fundsApi.withdraw(amountKobo);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        mode === "deposit" ? "Deposit Successful" : "Withdrawal Initiated",
        mode === "deposit"
          ? `₦${amountNaira.toLocaleString("en-NG")} added to your account.`
          : `₦${amountNaira.toLocaleString("en-NG")} withdrawal request submitted.`
      );
      setAmount(""); setBankRef("");
      qc.invalidateQueries({ queryKey: ["funds-balance"] });
      qc.invalidateQueries({ queryKey: ["portfolio-summary"] });
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", e instanceof Error ? e.message : "Transaction failed");
    } finally { setLoading(false); }
  }

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === "web" ? 67 : insets.top + 16,
      paddingHorizontal: 20, paddingBottom: 16,
    },
    title: { fontFamily: "Inter_700Bold", fontSize: 24, color: colors.foreground },
    sub: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    balanceCard: {
      marginHorizontal: 20, marginBottom: 24,
      backgroundColor: colors.primary, borderRadius: 20, padding: 24,
    },
    balLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.8 },
    balValue: { fontFamily: "Inter_700Bold", fontSize: 36, color: "#fff", marginTop: 6 },
    balSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 },
    balanceStats: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 16 },
    balanceStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 },
    balanceStatLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
    balanceStatValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
    modeRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 20, gap: 12 },
    modeBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1 },
    modeLabel: { fontFamily: "Inter_700Bold", fontSize: 14 },
    formCard: { marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20 },
    label: { fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
    amountRow: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.muted, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 16, marginBottom: 16,
    },
    nairaSign: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.mutedForeground, marginRight: 4 },
    amountInput: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 28, color: colors.foreground, paddingVertical: 14 },
    quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    quickBtn: {
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.muted,
    },
    quickText: { fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground },
    input: {
      backgroundColor: colors.muted, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 16, paddingVertical: 13,
      fontFamily: "Inter_400Regular", fontSize: 15, color: colors.foreground, marginBottom: 16,
    },
    infoBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 16, padding: 12, backgroundColor: colors.muted, borderRadius: 10 },
    infoText: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, flex: 1, lineHeight: 17 },
    submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
    submitText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
    limitsCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
    limitsTitle: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
    limitRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    limitLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground },
    limitValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground },
    bottomPad: { height: Platform.OS === "web" ? 34 : insets.bottom + 88 },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView
        style={s.root}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={loadingBalance} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <View style={s.header}>
          <Text style={s.title}>Funds</Text>
          <Text style={s.sub}>Manage your cash account</Text>
        </View>

        {/* Balance card */}
        <View style={s.balanceCard}>
          <Text style={s.balLabel}>Cash Balance</Text>
          {loadingBalance
            ? <ActivityIndicator color="#fff" style={{ marginTop: 10 }} />
            : <Text style={s.balValue}>{toNaira(balanceKobo)}</Text>
          }
          <View style={s.balanceStats}>
            <View style={s.balanceStat}>
              <Text style={s.balanceStatLabel}>Available</Text>
              <Text style={s.balanceStatValue}>{toNaira(balanceKobo)}</Text>
            </View>
            <View style={s.balanceStat}>
              <Text style={s.balanceStatLabel}>Pending</Text>
              <Text style={s.balanceStatValue}>₦0.00</Text>
            </View>
          </View>
          <Text style={s.balSub}>Funds are ready for trading after reconciliation.</Text>
        </View>

        {/* Mode toggle */}
        <View style={s.modeRow}>
          {(["deposit", "withdraw"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              style={[s.modeBtn, {
                backgroundColor: mode === m ? (m === "deposit" ? colors.positive : colors.negative) : colors.card,
                borderColor: mode === m ? (m === "deposit" ? colors.positive : colors.negative) : colors.border,
              }]}
              onPress={() => { setMode(m); Haptics.selectionAsync(); }}
            >
              <Text style={[s.modeLabel, { color: mode === m ? "#fff" : colors.mutedForeground }]}>
                {m === "deposit" ? "↓  Deposit" : "↑  Withdraw"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Form */}
        <View style={s.formCard}>
          <Text style={s.label}>Amount (Naira)</Text>
          <View style={s.amountRow}>
            <Text style={s.nairaSign}>₦</Text>
            <TextInput
              style={s.amountInput}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            {amount.length > 0 && (
              <Pressable onPress={() => setAmount("")} hitSlop={10}>
                <Feather name="x-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Quick amounts */}
          <Text style={[s.label, { marginBottom: 8 }]}>Quick Select</Text>
          <View style={s.quickRow}>
            {QUICK_AMOUNTS.map((a) => (
              <Pressable key={a} style={s.quickBtn} onPress={() => { setAmount((a / 100).toString()); Haptics.selectionAsync(); }}>
                <Text style={s.quickText}>₦{(a / 100).toLocaleString()}</Text>
              </Pressable>
            ))}
          </View>

          {/* Bank reference (deposit only) */}
          {mode === "deposit" && (
            <>
              <Text style={s.label}>Bank Reference (optional)</Text>
              <TextInput
                style={s.input}
                placeholder="Transfer reference / bank teller no."
                placeholderTextColor={colors.mutedForeground}
                value={bankRef}
                onChangeText={setBankRef}
              />
            </>
          )}

          {/* Info notices */}
          <View style={s.infoBox}>
            <Feather name="info" size={13} color={colors.mutedForeground} />
            <Text style={s.infoText}>
              {mode === "deposit"
                ? "Deposits are credited instantly for reconciliation purposes. Funds from bank transfers reflect after confirmation by your bank."
                : "Withdrawals are processed within 1–2 business days via NIBSS. Minimum withdrawal: ₦1,000."
              }
            </Text>
          </View>

          <Pressable
            style={[s.submitBtn, {
              backgroundColor: mode === "deposit" ? colors.positive : colors.negative,
              opacity: loading || amountKobo <= 0 ? 0.5 : 1,
            }]}
            onPress={submit}
            disabled={loading || amountKobo <= 0}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitText}>
                  {mode === "deposit" ? `Deposit ₦${amountNaira.toLocaleString("en-NG")}` : `Withdraw ₦${amountNaira.toLocaleString("en-NG")}`}
                </Text>
            }
          </Pressable>
        </View>

        {/* Account limits */}
        <View style={s.limitsCard}>
          <Text style={s.limitsTitle}>Account Limits</Text>
          {[
            ["Daily Withdrawal Limit", "₦500,000"],
            ["Min Deposit", "₦1,000"],
            ["Min Withdrawal", "₦1,000"],
            ["Settlement", "T+3 (NGX rolling)"],
            ["Withdrawal Processing", "1–2 business days"],
          ].map(([label, value]) => (
            <View key={label} style={s.limitRow}>
              <Text style={s.limitLabel}>{label}</Text>
              <Text style={s.limitValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
