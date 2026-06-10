import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { marketApi, ordersApi, type Instrument, type PlaceOrderPayload } from "@/lib/api";

const VALIDITY_OPTIONS = [
  { value: "day", label: "Day", description: "Expires at the end of the trading session." },
  { value: "gtc", label: "GTC", description: "Good till canceled — remains active until filled or canceled." },
  { value: "ioc", label: "IOC", description: "Immediate or cancel — fill instantly or cancel unfilled quantity." },
  { value: "fok", label: "FOK", description: "Fill or kill — all-or-nothing immediate execution." },
] as const;

export default function TradeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Instrument[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Instrument | null>(null);

  const qc = useQueryClient();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [validity, setValidity] = useState<PlaceOrderPayload["validity"]>("day");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [placing, setPlacing] = useState(false);
  const [showSearch, setShowSearch] = useState(true);

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await marketApi.search(q.trim());
      setResults(res.instruments ?? []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }

  function selectInstrument(inst: Instrument) {
    setSelected(inst);
    setShowSearch(false);
    setQuantity("");
    setLimitPrice("");
    Haptics.selectionAsync();
  }

  const lastNaira = selected ? parseFloat(selected.lastPriceNaira) : 0;
  const effectivePrice = orderType === "market" ? lastNaira : (parseFloat(limitPrice) || 0);
  const qty = parseInt(quantity) || 0;
  const grossValue = qty * effectivePrice;
  const brokerage = grossValue * 0.0075;
  const vat = brokerage * 0.075;
  const secLevy = grossValue * 0.003;
  const nseCharge = grossValue * 0.003;
  const cscs = grossValue * 0.001;
  const stampDuty = side === "buy" ? grossValue * 0.00075 : 0;
  const totalCost = grossValue + brokerage + vat + secLevy + nseCharge + cscs + stampDuty;

  async function placeOrder() {
    if (!selected || qty <= 0) { Alert.alert("Invalid order", "Enter a valid quantity."); return; }
    if (orderType === "limit" && parseFloat(limitPrice) <= 0) {
      Alert.alert("Invalid order", "Enter a valid limit price."); return;
    }
    setPlacing(true);
    try {
      const payload: PlaceOrderPayload = {
        symbol: selected.symbol,
        side,
        orderType,
        quantity: qty,
        validity,
        ...(orderType === "limit" ? { limitPriceKobo: Math.round(parseFloat(limitPrice) * 100) } : {}),
      };
      await ordersApi.place(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Order Placed", `${side.toUpperCase()} ${qty} ${selected.symbol} submitted to NGX.`);
      setQuantity(""); setLimitPrice("");
      qc.invalidateQueries({ queryKey: ["orders"] });
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Order Failed", e instanceof Error ? e.message : "Unknown error");
    } finally { setPlacing(false); }
  }

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: Platform.OS === "web" ? 67 : insets.top + 16,
      paddingHorizontal: 20, paddingBottom: 16,
    },
    title: { fontFamily: "Inter_700Bold", fontSize: 24, color: colors.foreground },
    sub: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    searchBox: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border,
      marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 14,
    },
    searchInput: { flex: 1, paddingVertical: 13, fontFamily: "Inter_400Regular", fontSize: 15, color: colors.foreground },
    resultRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    symbol: { fontFamily: "Inter_700Bold", fontSize: 15, color: colors.foreground },
    name: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
    price: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, textAlign: "right" },
    pctText: { fontFamily: "Inter_500Medium", fontSize: 12, textAlign: "right", marginTop: 1 },
    helper: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 8, lineHeight: 18 },
    selectedBanner: {
      marginHorizontal: 20, marginBottom: 16,
      backgroundColor: colors.card, borderRadius: 16,
      borderWidth: 1, borderColor: colors.border, padding: 16,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    },
    selectedSymbol: { fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground },
    selectedSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    selectedPrice: { fontFamily: "Inter_700Bold", fontSize: 20, color: colors.foreground, textAlign: "right" },
    section: { marginHorizontal: 20, marginBottom: 16 },
    label: { fontFamily: "Inter_500Medium", fontSize: 12, color: colors.mutedForeground, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
    segRow: { flexDirection: "row", gap: 10 },
    segBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border },
    segLabel: { fontFamily: "Inter_700Bold", fontSize: 14 },
    input: {
      backgroundColor: colors.card, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 16, paddingVertical: 13,
      fontFamily: "Inter_400Regular", fontSize: 16, color: colors.foreground,
    },
    feeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    feeLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground },
    feeValue: { fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
    totalLabel: { fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground },
    totalValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: colors.primary },
    placeBtn: { marginHorizontal: 20, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
    placeBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
    emptyCenter: { alignItems: "center", marginTop: 60 },
    emptyIcon: { marginBottom: 12 },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
    bottomPad: { height: Platform.OS === "web" ? 34 : insets.bottom + 88 },
  });

  const pctChange = selected
    ? ((parseFloat(selected.lastPriceNaira) - parseFloat(selected.prevClosePriceNaira)) / parseFloat(selected.prevClosePriceNaira)) * 100
    : 0;
  const isUp = pctChange >= 0;

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.title}>Place Order</Text>
        <Text style={s.sub}>Search NGX instruments and trade</Text>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 10 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by symbol or company…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={search}
          onFocus={() => setShowSearch(true)}
          autoCapitalize="characters"
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color={colors.primary} />}
        {selected && !showSearch && (
          <Pressable onPress={() => { setShowSearch(true); setSelected(null); }}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Search results */}
      {showSearch && results.length > 0 && (
        <View style={{ backgroundColor: colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
          {results.slice(0, 10).map((inst) => {
            const pct = ((parseFloat(inst.lastPriceNaira) - parseFloat(inst.prevClosePriceNaira)) / parseFloat(inst.prevClosePriceNaira)) * 100;
            return (
              <Pressable key={inst.symbol} style={s.resultRow} onPress={() => selectInstrument(inst)}>
                <View>
                  <Text style={s.symbol}>{inst.symbol}</Text>
                  <Text style={s.name}>{inst.name}</Text>
                </View>
                <View>
                  <Text style={s.price}>₦{parseFloat(inst.lastPriceNaira).toFixed(2)}</Text>
                  <Text style={[s.pctText, { color: pct >= 0 ? colors.positive : colors.negative }]}>
                    {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Empty search state */}
      {showSearch && query.length > 0 && results.length === 0 && !searching && (
        <View style={s.emptyCenter}>
          <Feather name="search" size={32} color={colors.mutedForeground} style={s.emptyIcon} />
          <Text style={s.emptyText}>No instruments found for "{query}"</Text>
        </View>
      )}

      {!showSearch && !selected && (
        <View style={s.emptyCenter}>
          <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} style={s.emptyIcon} />
          <Text style={s.emptyText}>Search for an NGX-listed stock{"\n"}to place an order</Text>
        </View>
      )}

      {/* Order Form */}
      {selected && !showSearch && (
        <>
          {/* Selected instrument banner */}
          <View style={s.selectedBanner}>
            <View>
              <Text style={s.selectedSymbol}>{selected.symbol}</Text>
              <Text style={s.selectedSub}>{selected.name}</Text>
              <Text style={s.selectedSub}>{selected.sector}</Text>
            </View>
            <View>
              <Text style={s.selectedPrice}>₦{parseFloat(selected.lastPriceNaira).toFixed(2)}</Text>
              <Text style={[s.pctText, { color: isUp ? colors.positive : colors.negative, textAlign: "right" }]}>
                {isUp ? "+" : ""}{pctChange.toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Buy / Sell */}
          <View style={s.section}>
            <Text style={s.label}>Direction</Text>
            <View style={s.segRow}>
              {(["buy", "sell"] as const).map((d) => (
                <Pressable
                  key={d}
                  style={[s.segBtn, side === d && {
                    backgroundColor: d === "buy" ? "#DCFCE7" : "#FEE2E2",
                    borderColor: d === "buy" ? colors.positive : colors.negative,
                  }]}
                  onPress={() => { setSide(d); Haptics.selectionAsync(); }}
                >
                  <Text style={[s.segLabel, {
                    color: side === d ? (d === "buy" ? colors.positive : colors.negative) : colors.mutedForeground
                  }]}>
                    {d === "buy" ? "▲  BUY" : "▼  SELL"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Market / Limit */}
          <View style={s.section}>
            <Text style={s.label}>Order Type</Text>
            <View style={s.segRow}>
              {(["market", "limit"] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[s.segBtn, orderType === t && { backgroundColor: colors.accent, borderColor: colors.primary }]}
                  onPress={() => { setOrderType(t); Haptics.selectionAsync(); }}
                >
                  <Text style={[s.segLabel, { color: orderType === t ? colors.primary : colors.mutedForeground }]}>
                    {t.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Quantity */}
          <View style={s.section}>
            <Text style={s.label}>Quantity (shares)</Text>
            <TextInput
              style={s.input}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
            />
          </View>

          {/* Limit price */}
          {orderType === "limit" && (
            <View style={s.section}>
              <Text style={s.label}>Limit Price (₦)</Text>
              <TextInput
                style={s.input}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                value={limitPrice}
                onChangeText={setLimitPrice}
                keyboardType="decimal-pad"
              />
            </View>
          )}

          {/* Fee breakdown */}
          {qty > 0 && effectivePrice > 0 && (
            <View style={[s.section, { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[s.label, { marginBottom: 12 }]}>Fee Breakdown</Text>
              {[
                ["Gross Value", grossValue],
                ["Brokerage (0.75%)", brokerage],
                ["VAT (7.5%)", vat],
                ["SEC Levy (0.3%)", secLevy],
                ["NGX Charge (0.3%)", nseCharge],
                ["CSCS (0.1%)", cscs],
                ...(stampDuty > 0 ? [["Stamp Duty (0.075%)", stampDuty]] : []),
              ].map(([label, value]) => (
                <View key={label as string} style={s.feeRow}>
                  <Text style={s.feeLabel}>{label}</Text>
                  <Text style={s.feeValue}>₦{(value as number).toFixed(2)}</Text>
                </View>
              ))}
              <View style={s.divider} />
              <View style={s.feeRow}>
                <Text style={s.totalLabel}>Total Cost</Text>
                <Text style={s.totalValue}>₦{totalCost.toFixed(2)}</Text>
              </View>
            </View>
          )}

          <View style={{ height: 16 }} />

          {/* Place order button */}
          <Pressable
            style={[s.placeBtn, {
              backgroundColor: side === "buy" ? colors.positive : colors.negative,
              opacity: placing || qty <= 0 ? 0.5 : 1,
            }]}
            onPress={placeOrder}
            disabled={placing || qty <= 0}
          >
            {placing
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.placeBtnText}>
                  {side === "buy" ? "Place Buy Order" : "Place Sell Order"} · {selected.symbol}
                </Text>
            }
          </Pressable>
        </>
      )}

      <View style={s.bottomPad} />
    </ScrollView>
  );
}
