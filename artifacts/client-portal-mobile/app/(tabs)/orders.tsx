import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { fmtNaira, ordersApi, type Order } from "@/lib/api";

const STATUS_FILTERS = ["all", "pending", "submitted", "filled", "cancelled", "rejected"] as const;
type Filter = (typeof STATUS_FILTERS)[number];

function statusStyle(status: string): { bg: string; fg: string } {
  const map: Record<string, { bg: string; fg: string }> = {
    filled:    { bg: "#DCFCE7", fg: "#15803D" },
    submitted: { bg: "#DBEAFE", fg: "#1D4ED8" },
    pending:   { bg: "#FEF9C3", fg: "#A16207" },
    cancelled: { bg: "#F3F4F6", fg: "#6B7280" },
    rejected:  { bg: "#FEE2E2", fg: "#DC2626" },
    partial:   { bg: "#F3E8FF", fg: "#7C3AED" },
  };
  return map[status] ?? { bg: "#F3F4F6", fg: "#6B7280" };
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list(),
  });

  const totalOrders = data?.orders?.length ?? 0;
  const openOrders = (data?.orders ?? []).filter((order) => ["submitted", "pending"].includes(order.status)).length;
  const executedCount = (data?.orders ?? []).filter((order) => order.status === "filled").length;
  const fillRate = totalOrders ? Math.round((executedCount / totalOrders) * 100) : 0;
  const executedValue = fmtNaira((data?.orders ?? []).reduce((sum, order) => sum + (order.totalCostKobo ?? 0), 0));

  const orders = (data?.orders ?? []).filter(
    (o) => filter === "all" || o.status === filter
  );

  async function cancelOrder(order: Order) {
    Alert.alert(
      "Cancel Order",
      `Cancel ${order.side.toUpperCase()} ${order.quantity} ${order.symbol}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: async () => {
            try {
              await ordersApi.cancel(order.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              qc.invalidateQueries({ queryKey: ["orders"] });
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "Could not cancel order");
            }
          },
        },
      ]
    );
  }

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === "web" ? 67 : insets.top + 16,
      paddingHorizontal: 20, paddingBottom: 12,
    },
    title: { fontFamily: "Inter_700Bold", fontSize: 24, color: colors.foreground },
    sub: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    filterScroll: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
    filterChip: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1, marginRight: 8,
    },
    filterLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
    orderCard: {
      marginHorizontal: 20, marginBottom: 12,
      backgroundColor: colors.card, borderRadius: 16,
      borderWidth: 1, borderColor: colors.border,
      padding: 16,
    },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
    symbolRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    symbol: { fontFamily: "Inter_700Bold", fontSize: 17, color: colors.foreground },
    sideBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    sideText: { fontFamily: "Inter_700Bold", fontSize: 11 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
    metaRow: { flexDirection: "row", gap: 20, marginBottom: 6 },
    metaLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginBottom: 1 },
    metaValue: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
    rejectBox: {
      backgroundColor: "#FEF2F2", borderRadius: 8, padding: 10,
      flexDirection: "row", gap: 8, alignItems: "flex-start",
    },
    rejectText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#EF4444", flex: 1 },
    cancelBtn: {
      borderRadius: 10, borderWidth: 1, borderColor: colors.negative,
      paddingVertical: 9, alignItems: "center", marginTop: 10,
    },
    cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.negative },
    dateText: { fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground },
    orderSummary: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 16 },
    summaryItem: { flex: 1, backgroundColor: colors.muted, borderRadius: 14, padding: 12, alignItems: "center" },
    summaryLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
    summaryValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground },
    empty: { alignItems: "center", marginTop: 80 },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: colors.mutedForeground, marginTop: 12 },
    bottomPad: { height: Platform.OS === "web" ? 34 : insets.bottom + 88 },
  });

  return (
    <ScrollView
      style={s.root}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <View style={s.header}>
        <Text style={s.title}>Orders</Text>
        <Text style={s.sub}>{totalOrders} total orders · {fillRate}% filled</Text>
        <View style={s.orderSummary}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Open</Text>
            <Text style={s.summaryValue}>{openOrders}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Executed</Text>
            <Text style={s.summaryValue}>{executedCount}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>Value</Text>
            <Text style={s.summaryValue}>{executedValue}</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[s.filterChip, {
              backgroundColor: filter === f ? colors.primary : colors.card,
              borderColor: filter === f ? colors.primary : colors.border,
            }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterLabel, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={s.empty}>
          <Feather name="file-text" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyText}>
            {filter === "all" ? "No orders yet.\nGo to Trade to place your first order." : `No ${filter} orders.`}
          </Text>
        </View>
      ) : (
        orders.map((order) => {
          const { bg, fg } = statusStyle(order.status);
          const canCancel = order.status === "pending" || order.status === "submitted";
          const date = new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

          return (
            <View key={order.id} style={s.orderCard}>
              <View style={s.cardTop}>
                <View style={s.symbolRow}>
                  <Text style={s.symbol}>{order.symbol}</Text>
                  <View style={[s.sideBadge, { backgroundColor: order.side === "buy" ? "#DCFCE7" : "#FEE2E2" }]}>
                    <Text style={[s.sideText, { color: order.side === "buy" ? "#15803D" : "#DC2626" }]}>
                      {order.side.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={[s.badge, { backgroundColor: bg }]}>
                  <Text style={[s.badgeText, { color: fg }]}>{order.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={s.metaRow}>
                <View>
                  <Text style={s.metaLabel}>Qty</Text>
                  <Text style={s.metaValue}>{order.quantity.toLocaleString()}</Text>
                </View>
                {order.filledQuantity > 0 && (
                  <View>
                    <Text style={s.metaLabel}>Filled</Text>
                    <Text style={[s.metaValue, { color: colors.positive }]}>{order.filledQuantity.toLocaleString()}</Text>
                  </View>
                )}
                <View>
                  <Text style={s.metaLabel}>Type</Text>
                  <Text style={s.metaValue}>{order.orderType}</Text>
                </View>
                {order.limitPriceKobo && (
                  <View>
                    <Text style={s.metaLabel}>Limit</Text>
                    <Text style={s.metaValue}>₦{(order.limitPriceKobo / 100).toFixed(2)}</Text>
                  </View>
                )}
                {order.avgFillPriceKobo && (
                  <View>
                    <Text style={s.metaLabel}>Fill Price</Text>
                    <Text style={[s.metaValue, { color: colors.primary }]}>₦{(order.avgFillPriceKobo / 100).toFixed(2)}</Text>
                  </View>
                )}
              </View>

              {order.totalCostKobo && (
                <View style={s.metaRow}>
                  <View>
                    <Text style={s.metaLabel}>Total Cost</Text>
                    <Text style={[s.metaValue, { color: colors.primary }]}>{fmtNaira(order.totalCostKobo)}</Text>
                  </View>
                  {order.brokerageFeeKobo && (
                    <View>
                      <Text style={s.metaLabel}>Brokerage</Text>
                      <Text style={s.metaValue}>{fmtNaira(order.brokerageFeeKobo)}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={s.divider} />
              <Text style={s.dateText}>{date}</Text>

              {order.rejectReason && (
                <View style={[s.rejectBox, { marginTop: 10 }]}>
                  <Feather name="alert-circle" size={13} color="#EF4444" />
                  <Text style={s.rejectText}>{order.rejectReason}</Text>
                </View>
              )}

              {canCancel && (
                <Pressable style={s.cancelBtn} onPress={() => cancelOrder(order)}>
                  <Text style={s.cancelText}>Cancel Order</Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      <View style={s.bottomPad} />
    </ScrollView>
  );
}
