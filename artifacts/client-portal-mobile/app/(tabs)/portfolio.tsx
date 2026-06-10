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
import { useColors } from "@/hooks/useColors";
import { fmtNaira, portfolioApi, toNaira, type Holding } from "@/lib/api";

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: summaryData, isLoading: loadingSummary, refetch: refetchSummary } =
    useQuery({ queryKey: ["portfolio-summary"], queryFn: () => portfolioApi.summary() });

  const { data: holdingsData, isLoading: loadingHoldings, refetch: refetchHoldings } =
    useQuery({ queryKey: ["holdings"], queryFn: () => portfolioApi.holdings() });

  const { data: txData, isLoading: loadingTx, refetch: refetchTx } =
    useQuery({ queryKey: ["transactions"], queryFn: () => portfolioApi.transactions(15) });

  const isLoading = loadingSummary || loadingHoldings;
  const refetchAll = () => Promise.all([refetchSummary(), refetchHoldings(), refetchTx()]);

  const summary = summaryData?.summary;
  const holdings = holdingsData?.holdings ?? [];
  const transactions = txData?.transactions ?? [];

  const totalValue = (summary?.cashBalanceKobo ?? 0) + (summary?.totalMarketValueKobo ?? 0);
  const pnl = summary?.totalUnrealisedPnlKobo ?? 0;
  const pnlPct = summary?.pnlPercent ?? 0;
  const isUp = pnl >= 0;

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === "web" ? 67 : insets.top + 16,
      paddingHorizontal: 20, paddingBottom: 16,
    },
    title: { fontFamily: "Inter_700Bold", fontSize: 24, color: colors.foreground },
    sub: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    summaryCard: {
      marginHorizontal: 20, marginBottom: 24,
      backgroundColor: colors.card, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border, padding: 20,
    },
    summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8 },
    summaryValue: { fontFamily: "Inter_700Bold", fontSize: 30, color: colors.foreground, marginTop: 4 },
    pnlRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
    pnlText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
    statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
    statBox: { flex: 1, backgroundColor: colors.muted, borderRadius: 10, padding: 12 },
    statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: colors.mutedForeground, marginBottom: 2 },
    statValue: { fontFamily: "Inter_700Bold", fontSize: 13, color: colors.foreground },
    sectionHeader: {
      paddingHorizontal: 20, marginBottom: 10,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8 },
    holdingCard: {
      marginHorizontal: 20, marginBottom: 10,
      backgroundColor: colors.card, borderRadius: 16,
      borderWidth: 1, borderColor: colors.border, padding: 16,
    },
    holdingTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    holdingSymbol: { fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground },
    holdingQty: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    holdingValue: { fontFamily: "Inter_700Bold", fontSize: 16, color: colors.foreground, textAlign: "right" },
    holdingPnl: { fontFamily: "Inter_600SemiBold", fontSize: 12, textAlign: "right", marginTop: 2 },
    holdingMeta: { flexDirection: "row", marginTop: 12, gap: 20 },
    metaLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: colors.mutedForeground, marginBottom: 2 },
    metaValue: { fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground },
    progressBar: { height: 3, borderRadius: 3, marginTop: 12, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 3 },
    txRow: {
      marginHorizontal: 20, marginBottom: 1,
      backgroundColor: colors.card,
      borderRadius: 0, borderWidth: 0,
      paddingHorizontal: 16, paddingVertical: 13,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    txType: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground },
    txRef: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    txAmount: { fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "right" },
    txDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, textAlign: "right", marginTop: 1 },
    txContainer: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginHorizontal: 20, overflow: "hidden" },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
    empty: { alignItems: "center", paddingVertical: 32 },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 8 },
    emptyNote: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 10, textAlign: "center", maxWidth: 240 },
    emptyAction: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
    emptyActionText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.primaryForeground },
    bottomPad: { height: Platform.OS === "web" ? 34 : insets.bottom + 88 },
  });

  function txTypeColor(type: string) {
    const map: Record<string, string> = {
      deposit: colors.positive, buy: colors.negative,
      sell: colors.positive, withdrawal: colors.negative,
      fee: "#EF4444", dividend: colors.positive,
    };
    return map[type] ?? colors.foreground;
  }

  function txSign(type: string) {
    return ["deposit", "sell", "dividend"].includes(type) ? "+" : "-";
  }

  return (
    <ScrollView
      style={s.root}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetchAll} tintColor={colors.primary} />
      }
    >
      <View style={s.header}>
        <Text style={s.title}>Portfolio</Text>
        <Text style={s.sub}>Holdings &amp; performance</Text>
      </View>

      {/* Summary card */}
      {loadingSummary ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
      ) : (
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Total Portfolio Value</Text>
          <Text style={s.summaryValue}>{toNaira(totalValue)}</Text>
          <View style={s.pnlRow}>
            <Feather name={isUp ? "trending-up" : "trending-down"} size={14} color={isUp ? colors.positive : colors.negative} />
            <Text style={[s.pnlText, { color: isUp ? colors.positive : colors.negative }]}>
              {isUp ? "+" : ""}{fmtNaira(pnl)} ({isUp ? "+" : ""}{pnlPct.toFixed(2)}%)
            </Text>
          </View>
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Cash</Text>
              <Text style={s.statValue}>{toNaira(summary?.cashBalanceKobo ?? 0)}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Invested</Text>
              <Text style={s.statValue}>{toNaira(summary?.totalMarketValueKobo ?? 0)}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Cost Basis</Text>
              <Text style={s.statValue}>{toNaira(summary?.totalCostBasisKobo ?? 0)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Holdings */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Holdings ({holdings.length})</Text>
      </View>

      {loadingHoldings ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
      ) : holdings.length === 0 ? (
        <View style={[{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginHorizontal: 20 }]}>
          <View style={s.empty}>
            <Feather name="briefcase" size={32} color={colors.mutedForeground} />
            <Text style={s.emptyText}>You don't have any holdings yet.</Text>
            <Text style={s.emptyNote}>Start building your premium portfolio with your first order.</Text>
            <Pressable style={s.emptyAction} onPress={() => router.push("/trade") }>
              <Text style={s.emptyActionText}>Place a trade</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        holdings.map((h: Holding) => {
          const pnl = h.unrealisedPnlKobo;
          const up = pnl >= 0;
          const weight = summary?.totalMarketValueKobo
            ? Math.min(100, (h.marketValueKobo / summary.totalMarketValueKobo) * 100)
            : 0;
          return (
            <View key={h.symbol} style={s.holdingCard}>
              <View style={s.holdingTop}>
                <View>
                  <Text style={s.holdingSymbol}>{h.symbol}</Text>
                  <Text style={s.holdingQty}>{h.quantity.toLocaleString()} shares</Text>
                </View>
                <View>
                  <Text style={s.holdingValue}>{fmtNaira(h.marketValueKobo)}</Text>
                  <Text style={[s.holdingPnl, { color: up ? colors.positive : colors.negative }]}>
                    {up ? "+" : ""}{fmtNaira(pnl)} ({up ? "+" : ""}{h.pnlPercent.toFixed(2)}%)
                  </Text>
                </View>
              </View>
              <View style={s.holdingMeta}>
                <View>
                  <Text style={s.metaLabel}>Avg Cost</Text>
                  <Text style={s.metaValue}>₦{(h.avgCostKobo / 100).toFixed(2)}</Text>
                </View>
                <View>
                  <Text style={s.metaLabel}>Current Price</Text>
                  <Text style={s.metaValue}>₦{(h.currentPriceKobo / 100).toFixed(2)}</Text>
                </View>
                <View>
                  <Text style={s.metaLabel}>Weight</Text>
                  <Text style={s.metaValue}>{weight.toFixed(1)}%</Text>
                </View>
              </View>
              <View style={[s.progressBar, { backgroundColor: colors.border }]}>
                <View style={[s.progressFill, { width: `${weight}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
          );
        })
      )}

      {/* Transaction history */}
      <View style={[s.sectionHeader, { marginTop: 24 }]}>
        <Text style={s.sectionTitle}>Recent Transactions</Text>
      </View>

      {loadingTx ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
      ) : transactions.length === 0 ? (
        <View style={[{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginHorizontal: 20 }]}>
          <View style={s.empty}>
            <Text style={s.emptyText}>No transactions yet</Text>
          </View>
        </View>
      ) : (
        <View style={s.txContainer}>
          {transactions.map((tx, i) => (
            <View key={tx.id}>
              <View style={s.txRow}>
                <View>
                  <Text style={s.txType}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
                  <Text style={s.txRef}>{tx.description ?? tx.reference}</Text>
                </View>
                <View>
                  <Text style={[s.txAmount, { color: txTypeColor(tx.type) }]}>
                    {txSign(tx.type)}{fmtNaira(Math.abs(tx.amountKobo))}
                  </Text>
                  <Text style={s.txDate}>
                    {new Date(tx.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                  </Text>
                </View>
              </View>
              {i < transactions.length - 1 && <View style={s.divider} />}
            </View>
          ))}
        </View>
      )}

      <View style={s.bottomPad} />
    </ScrollView>
  );
}
