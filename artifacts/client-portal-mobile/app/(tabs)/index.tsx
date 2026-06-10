import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { fmtNaira, marketApi, ordersApi, portfolioApi, toNaira } from "@/lib/api";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const { data: summaryData, isLoading: loadingSummary, refetch: refetchSummary } =
    useQuery({ queryKey: ["portfolio-summary"], queryFn: () => portfolioApi.summary() });

  const { data: moversData, isLoading: loadingMovers, refetch: refetchMovers } =
    useQuery({ queryKey: ["market-movers"], queryFn: () => marketApi.movers() });

  const { data: ordersData, refetch: refetchOrders } =
    useQuery({ queryKey: ["orders"], queryFn: () => ordersApi.list() });

  const isRefreshing = loadingSummary || loadingMovers;
  const refetchAll = () => Promise.all([refetchSummary(), refetchMovers(), refetchOrders()]);

  const summary = summaryData?.summary;
  const totalValue = (summary?.cashBalanceKobo ?? 0) + (summary?.totalMarketValueKobo ?? 0);
  const pnl = summary?.totalUnrealisedPnlKobo ?? 0;
  const pnlPct = summary?.pnlPercent ?? 0;
  const isUp = pnl >= 0;
  const recentOrders = (ordersData?.orders ?? []).slice(0, 5);
  const openOrders = (ordersData?.orders ?? []).filter((order) => ["submitted", "pending"].includes(order.status)).length;
  const filledOrders = (ordersData?.orders ?? []).filter((order) => order.status === "filled").length;
  const fillRate = ordersData?.orders?.length ? Math.round((filledOrders / ordersData.orders.length) * 100) : 0;
  const activeOrderValue = toNaira((ordersData?.orders ?? []).reduce((sum, order) => sum + (order.totalCostKobo ?? 0), 0));
  const gainers = moversData?.gainers?.slice(0, 4) ?? [];
  const losers = moversData?.losers?.slice(0, 4) ?? [];
  const needsKyc = user?.kycStatus !== "verified" && !!user?.email;

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === "web" ? 67 : insets.top + 16,
      paddingHorizontal: 20, paddingBottom: 16,
    },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    greeting: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground },
    name: { fontFamily: "Inter_700Bold", fontSize: 22, color: colors.foreground, marginTop: 2 },
    portfolioCard: {
      marginHorizontal: 20, marginTop: 8,
      backgroundColor: colors.card, borderRadius: 20,
      padding: 24, borderWidth: 1, borderColor: colors.border,
    },
    portfolioLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8 },
    portfolioValue: { fontFamily: "Inter_700Bold", fontSize: 34, color: colors.foreground, marginTop: 4 },
    pnlRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
    pnlText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
    statsRow: { flexDirection: "row", gap: 10, marginTop: 18 },
    statItem: {
      flex: 1, backgroundColor: colors.muted,
      borderRadius: 12, padding: 12,
    },
    statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: colors.mutedForeground, marginBottom: 3 },
    statValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground },
    actionRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 18 },
    actionBtn: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      alignItems: "center",
    },
    actionBtnLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.mutedForeground, letterSpacing: 0.6, textTransform: "uppercase" },
    actionBtnValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground, marginTop: 4 },
    kycBanner: {
      marginTop: 16,
      padding: 16,
      borderRadius: 18,
    },
    kycTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: colors.primaryForeground,
      marginBottom: 6,
    },
    kycSubtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.primaryForeground,
      opacity: 0.9,
    },
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
    card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    moverRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    moverSymbol: { fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground },
    moverName: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    moverPrice: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, textAlign: "right" },
    moverPct: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "right", marginTop: 1 },
    orderRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    orderSymbol: { fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground },
    orderSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
    emptyCell: { alignItems: "center", paddingVertical: 28 },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 8 },
    bottomPad: { height: Platform.OS === "web" ? 34 : insets.bottom + 88 },
  });

  function statusBadge(status: string) {
    const map: Record<string, { bg: string; fg: string }> = {
      filled:    { bg: "#DCFCE7", fg: "#15803D" },
      submitted: { bg: "#DBEAFE", fg: "#1D4ED8" },
      pending:   { bg: "#FEF9C3", fg: "#A16207" },
      cancelled: { bg: "#F3F4F6", fg: "#6B7280" },
      rejected:  { bg: "#FEE2E2", fg: "#DC2626" },
    };
    const c = map[status] ?? { bg: "#F3F4F6", fg: "#6B7280" };
    return (
      <View style={[s.badge, { backgroundColor: c.bg }]}>
        <Text style={[s.badgeText, { color: c.fg }]}>{status.toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.root}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refetchAll} tintColor={colors.primary} />
      }
    >
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.greeting}>Good day,</Text>
            <Text style={s.name}>{user?.fullName?.split(" ")[0] ?? "Investor"}</Text>
          </View>
          <Pressable onPress={logout} hitSlop={12}>
            <Feather name="log-out" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
        {needsKyc ? (
          <Pressable style={[s.kycBanner, { backgroundColor: colors.primary }]} onPress={() => router.push("/kyc")}> 
            <Text style={s.kycTitle}>Complete KYC Verification</Text>
            <Text style={s.kycSubtitle}>Required before you can trade real securities. Tap to continue.</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Portfolio Value */}
      {loadingSummary ? (
        <View style={[s.portfolioCard, { alignItems: "center", paddingVertical: 40 }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={s.portfolioCard}>
          <Text style={s.portfolioLabel}>Total Portfolio Value</Text>
          <Text style={s.portfolioValue}>{toNaira(totalValue)}</Text>
          <View style={s.pnlRow}>
            <Feather name={isUp ? "trending-up" : "trending-down"} size={14} color={isUp ? colors.positive : colors.negative} />
            <Text style={[s.pnlText, { color: isUp ? colors.positive : colors.negative }]}>
              {isUp ? "+" : ""}{fmtNaira(pnl)} ({isUp ? "+" : ""}{pnlPct.toFixed(2)}%)
            </Text>
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statLabel}>Cash Balance</Text>
              <Text style={s.statValue}>{toNaira(summary?.cashBalanceKobo ?? 0)}</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statLabel}>Invested</Text>
              <Text style={s.statValue}>{toNaira(summary?.totalMarketValueKobo ?? 0)}</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statLabel}>Positions</Text>
              <Text style={s.statValue}>{summary?.holdingsCount ?? 0}</Text>
            </View>
          </View>
          <View style={s.actionRow}>
            <Pressable style={[s.actionBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/trade") }>
              <Text style={[s.actionBtnLabel, { color: colors.primaryForeground }]}>Trade</Text>
              <Text style={[s.actionBtnValue, { color: colors.primaryForeground }]}>Start order</Text>
            </Pressable>
            <Pressable style={s.actionBtn} onPress={() => router.push("/orders") }>
              <Text style={s.actionBtnLabel}>Orders</Text>
              <Text style={s.actionBtnValue}>{openOrders} open</Text>
            </Pressable>
            <Pressable style={s.actionBtn} onPress={() => router.push("/funds") }>
              <Text style={s.actionBtnLabel}>Funds</Text>
              <Text style={s.actionBtnValue}>{activeOrderValue}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Gainers */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Top Gainers</Text>
        <View style={s.card}>
          {loadingMovers
            ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
            : gainers.length === 0
            ? <View style={s.emptyCell}><Text style={s.emptyText}>No data available</Text></View>
            : gainers.map((m, i) => (
              <View key={m.symbol} style={[s.moverRow, i === gainers.length - 1 && { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={s.moverSymbol}>{m.symbol}</Text>
                  <Text style={s.moverName}>{m.name}</Text>
                </View>
                <View>
                  <Text style={s.moverPrice}>₦{(m.lastPriceKobo / 100).toFixed(2)}</Text>
                  <Text style={[s.moverPct, { color: colors.positive }]}>+{m.changePct.toFixed(2)}%</Text>
                </View>
              </View>
            ))
          }
        </View>
      </View>

      {/* Losers */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Top Losers</Text>
        <View style={s.card}>
          {loadingMovers
            ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
            : losers.length === 0
            ? <View style={s.emptyCell}><Text style={s.emptyText}>No data available</Text></View>
            : losers.map((m, i) => (
              <View key={m.symbol} style={[s.moverRow, i === losers.length - 1 && { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={s.moverSymbol}>{m.symbol}</Text>
                  <Text style={s.moverName}>{m.name}</Text>
                </View>
                <View>
                  <Text style={s.moverPrice}>₦{(m.lastPriceKobo / 100).toFixed(2)}</Text>
                  <Text style={[s.moverPct, { color: colors.negative }]}>{m.changePct.toFixed(2)}%</Text>
                </View>
              </View>
            ))
          }
        </View>
      </View>

      {/* Recent Orders */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Recent Orders</Text>
        <View style={s.card}>
          {recentOrders.length === 0
            ? <View style={s.emptyCell}>
                <Feather name="file-text" size={28} color={colors.mutedForeground} />
                <Text style={s.emptyText}>No orders yet</Text>
              </View>
            : recentOrders.map((o, i) => (
              <View key={o.id} style={[s.orderRow, i === recentOrders.length - 1 && { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={s.orderSymbol}>
                    <Text style={{ color: o.side === "buy" ? colors.positive : colors.negative }}>
                      {o.side === "buy" ? "▲" : "▼"}
                    </Text>
                    {" "}{o.symbol}
                  </Text>
                  <Text style={s.orderSub}>{o.quantity.toLocaleString()} shares · {o.orderType}</Text>
                </View>
                {statusBadge(o.status)}
              </View>
            ))
          }
        </View>
      </View>

      <View style={s.bottomPad} />
    </ScrollView>
  );
}
