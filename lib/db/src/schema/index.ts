import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────────────

export const clientRoleEnum = pgEnum("client_role", [
  "client", "broker", "admin", "compliance",
]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "pending", "under_review", "verified", "rejected",
]);

export const kycTierEnum = pgEnum("kyc_tier", [
  "tier1", "tier2", "tier3",
]);

export const orderSideEnum = pgEnum("order_side", ["buy", "sell"]);

export const orderTypeEnum = pgEnum("order_type", ["market", "limit"]);

export const orderValidityEnum = pgEnum("order_validity", [
  "day", "gtc", "ioc", "fok",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending", "submitted", "partial", "filled", "cancelled", "rejected", "expired",
]);

export const instrumentTypeEnum = pgEnum("instrument_type", [
  "equity", "etf", "bond", "preference",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "deposit", "withdrawal", "buy", "sell", "fee", "dividend",
]);

// ── Tables ───────────────────────────────────────────────────────────────────

export const clientsTable = pgTable("clients", {
  id:                    text("id").primaryKey(),
  email:                 text("email").notNull().unique(),
  passwordHash:          text("password_hash").notNull(),
  refreshTokenHash:      text("refresh_token_hash"),
  passkeyCred:           text("passkey_cred"),
  fullName:              text("full_name").notNull(),
  phone:                 text("phone").notNull(),
  brokerCode:            text("broker_code").notNull().default("0001"),
  // CHN = Central Securities Clearing System Holder Number
  chn:                   text("chn"),
  bvn:                   text("bvn"),
  nin:                   text("nin"),
  role:                  clientRoleEnum("role").notNull().default("client"),
  kycStatus:             kycStatusEnum("kyc_status").notNull().default("pending"),
  kycTier:               kycTierEnum("kyc_tier").notNull().default("tier1"),
  // All monetary values stored in kobo (1 Naira = 100 kobo)
  cashBalanceKobo:       bigint("cash_balance_kobo", { mode: "number" }).notNull().default(0),
  dailyWithdrawLimitKobo: bigint("daily_withdraw_limit_kobo", { mode: "number" }).notNull().default(500_000_00), // ₦500k
  isActive:              boolean("is_active").notNull().default(true),
  isSuspended:           boolean("is_suspended").notNull().default(false),
  lastLoginAt:           timestamp("last_login_at"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});

export const instrumentsTable = pgTable("instruments", {
  id:                    text("id").primaryKey(),
  symbol:                text("symbol").notNull(),
  isin:                  text("isin"),
  name:                  text("name").notNull(),
  sector:                text("sector"),
  type:                  instrumentTypeEnum("type").notNull().default("equity"),
  // Prices in kobo
  lastPriceKobo:         integer("last_price_kobo").notNull().default(0),
  openPriceKobo:         integer("open_price_kobo").notNull().default(0),
  highPriceKobo:         integer("high_price_kobo").notNull().default(0),
  lowPriceKobo:          integer("low_price_kobo").notNull().default(0),
  prevClosePriceKobo:    integer("prev_close_price_kobo").notNull().default(0),
  // NGX circuit breaker limits (±10% of prev close)
  upperLimitKobo:        integer("upper_limit_kobo"),
  lowerLimitKobo:        integer("lower_limit_kobo"),
  volume:                bigint("volume", { mode: "number" }).notNull().default(0),
  isActive:              boolean("is_active").notNull().default(true),
  isTradingSuspended:    boolean("is_trading_suspended").notNull().default(false),
  priceUpdatedAt:        timestamp("price_updated_at"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("instruments_symbol_idx").on(t.symbol)]);

export const ordersTable = pgTable("orders", {
  id:                    text("id").primaryKey(),
  clientId:              text("client_id").notNull().references(() => clientsTable.id),
  clOrdId:               text("cl_ord_id").notNull().unique(), // FIX ClOrdID
  ngxOrderId:            text("ngx_order_id"),                // NGX ATS assigned ID
  symbol:                text("symbol").notNull(),
  isin:                  text("isin"),
  side:                  orderSideEnum("side").notNull(),
  orderType:             orderTypeEnum("order_type").notNull(),
  validity:              orderValidityEnum("validity").notNull().default("day"),
  quantity:              integer("quantity").notNull(),
  filledQuantity:        integer("filled_quantity").notNull().default(0),
  limitPriceKobo:        integer("limit_price_kobo"),
  avgFillPriceKobo:      integer("avg_fill_price_kobo"),
  status:                orderStatusEnum("status").notNull().default("pending"),
  rejectReason:          text("reject_reason"),
  brokerCode:            text("broker_code").notNull().default("0001"),
  // Fee breakdown (all kobo)
  grossConsiderationKobo: bigint("gross_consideration_kobo", { mode: "number" }),
  brokerageFeeKobo:      integer("brokerage_fee_kobo"),
  vatKobo:               integer("vat_kobo"),
  secLevyKobo:           integer("sec_levy_kobo"),
  nseChargeKobo:         integer("nse_charge_kobo"),
  cscsChargeKobo:        integer("cscs_charge_kobo"),
  stampDutyKobo:         integer("stamp_duty_kobo"),
  totalCostKobo:         bigint("total_cost_kobo", { mode: "number" }),
  // Timestamps
  submittedAt:           timestamp("submitted_at"),
  filledAt:              timestamp("filled_at"),
  cancelledAt:           timestamp("cancelled_at"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});

export const positionsTable = pgTable("positions", {
  id:                    text("id").primaryKey(),
  clientId:              text("client_id").notNull().references(() => clientsTable.id),
  symbol:                text("symbol").notNull(),
  quantity:              integer("quantity").notNull().default(0),
  reservedQuantity:      integer("reserved_quantity").notNull().default(0),
  avgCostKobo:           integer("avg_cost_kobo").notNull().default(0),
  currentPriceKobo:      integer("current_price_kobo").notNull().default(0),
  marketValueKobo:       bigint("market_value_kobo", { mode: "number" }).notNull().default(0),
  unrealisedPnlKobo:     bigint("unrealised_pnl_kobo", { mode: "number" }).notNull().default(0),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("positions_client_symbol_idx").on(t.clientId, t.symbol)]);

export const transactionsTable = pgTable("transactions", {
  id:                    text("id").primaryKey(),
  clientId:              text("client_id").notNull().references(() => clientsTable.id),
  orderId:               text("order_id"),
  type:                  transactionTypeEnum("type").notNull(),
  amountKobo:            bigint("amount_kobo", { mode: "number" }).notNull(),
  balanceAfterKobo:      bigint("balance_after_kobo", { mode: "number" }).notNull(),
  reference:             text("reference").notNull(),
  description:           text("description"),
  bankReference:         text("bank_reference"),
  bankName:              text("bank_name"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
});

export const auditLogTable = pgTable("audit_log", {
  id:                    text("id").primaryKey(),
  clientId:              text("client_id"),
  actorId:               text("actor_id"),
  action:                text("action").notNull(),
  entityType:            text("entity_type"),
  entityId:              text("entity_id"),
  details:               jsonb("details"),
  ipAddress:             text("ip_address"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
});

export const settingsTable = pgTable("settings", {
  id:        text("id").primaryKey(),
  key:       text("key").notNull(),
  value:     jsonb("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("settings_key_idx").on(t.key)]);

export const notificationsTable = pgTable("notifications", {
  id:        text("id").primaryKey(),
  clientId:  text("client_id").notNull().references(() => clientsTable.id),
  type:      text("type").notNull(),
  title:     text("title").notNull(),
  message:   text("message").notNull(),
  isRead:    boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const otpCodesTable = pgTable("otp_codes", {
  id:                text("id").primaryKey(),
  clientId:          text("client_id"),
  phone:             text("phone").notNull(),
  requestId:         text("request_id").notNull().unique(),
  provider:          text("provider").notNull(),
  type:              text("type").notNull(),
  code:              text("code"),
  externalReference: text("external_reference"),
  expiresAt:         timestamp("expires_at").notNull(),
  verifiedAt:        timestamp("verified_at"),
  attempts:          integer("attempts").notNull().default(0),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("otp_codes_request_id_idx").on(t.requestId)]);

// ── Types ────────────────────────────────────────────────────────────────────

export type Client     = typeof clientsTable.$inferSelect;
export type Instrument = typeof instrumentsTable.$inferSelect;
export type Order      = typeof ordersTable.$inferSelect;
export type Position   = typeof positionsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type AuditLog   = typeof auditLogTable.$inferSelect;

export type SafeClient = Omit<Client, "passwordHash" | "refreshTokenHash" | "passkeyCred">;
