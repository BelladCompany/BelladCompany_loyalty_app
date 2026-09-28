--
-- PostgreSQL database dump
--

\restrict Pc7HoMwvV44X5U8lv4C5UBZLGt3Lrod4Nwk7uMJJIIBgncO2bdNibfBHWFXolZm

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: prevent_points_ledger_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_points_ledger_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Allow updates/deletes when session setting 'loyalty.allow_ledger_update' is 'on'
        -- or during customer merge ('loyalty.allow_merge' = 'on')
        IF current_setting('loyalty.allow_ledger_update', true) = 'on' OR current_setting('loyalty.allow_merge', true) = 'on' THEN
          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END IF;

        RAISE EXCEPTION 'points_ledger is strictly append-only. Updates and deletes are not permitted.';
      END;
      $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appsheet_pull_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appsheet_pull_log (
    log_id integer NOT NULL,
    table_name character varying(100) NOT NULL,
    rows_fetched integer DEFAULT 0,
    rows_synced integer DEFAULT 0,
    rows_skipped integer DEFAULT 0,
    rows_errored integer DEFAULT 0,
    details jsonb,
    tenant_id character varying(64) DEFAULT 'bellad_and_company'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: appsheet_pull_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appsheet_pull_log_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appsheet_pull_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appsheet_pull_log_log_id_seq OWNED BY public.appsheet_pull_log.log_id;


--
-- Name: appsheet_webhook_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appsheet_webhook_log (
    id integer NOT NULL,
    appsheet_row_id character varying(100),
    payload jsonb,
    result character varying(20) NOT NULL,
    error_message text,
    tenant_id character varying(64) DEFAULT 'BAC-MAIN'::character varying NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT appsheet_webhook_log_result_check CHECK (((result)::text = ANY ((ARRAY['success'::character varying, 'duplicate'::character varying, 'not_found'::character varying, 'error'::character varying])::text[])))
);


--
-- Name: appsheet_webhook_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appsheet_webhook_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appsheet_webhook_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appsheet_webhook_log_id_seq OWNED BY public.appsheet_webhook_log.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    audit_id bigint NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    actor_user_id integer,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    before_json jsonb,
    after_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_audit_id_seq OWNED BY public.audit_log.audit_id;


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    branch_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    branch_name text CONSTRAINT branches_name_not_null NOT NULL,
    branch_city text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: branches_branch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.branches_branch_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: branches_branch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.branches_branch_id_seq OWNED BY public.branches.branch_id;


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    brand_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    brand_name text CONSTRAINT brands_name_not_null NOT NULL,
    model text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brands_brand_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brands_brand_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brands_brand_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brands_brand_id_seq OWNED BY public.brands.brand_id;


--
-- Name: correction_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correction_requests (
    id integer NOT NULL,
    customer_id character varying(32) NOT NULL,
    points_ledger_reference character varying(100) NOT NULL,
    cashier_user_id integer,
    branch_id integer,
    wrong_bill_amount numeric(12,2) NOT NULL,
    correct_bill_amount numeric(12,2) NOT NULL,
    explanation text NOT NULL,
    screenshot_file_url text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    review_notes text,
    tenant_id character varying(64) DEFAULT 'bellad_and_company'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT correction_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: correction_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.correction_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: correction_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.correction_requests_id_seq OWNED BY public.correction_requests.id;


--
-- Name: customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_id_seq
    START WITH 100001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_merge_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_merge_log (
    merge_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    merged_from_id text NOT NULL,
    merged_into_id text NOT NULL,
    approved_by integer,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_merge_log_merge_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_merge_log_merge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_merge_log_merge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_merge_log_merge_id_seq OWNED BY public.customer_merge_log.merge_id;


--
-- Name: customer_phones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_phones (
    phone_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    customer_id text NOT NULL,
    phone_number public.citext NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_phones_phone_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_phones_phone_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_phones_phone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_phones_phone_id_seq OWNED BY public.customer_phones.phone_id;


--
-- Name: customer_tier_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_tier_snapshot (
    customer_id text NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    current_tier text,
    lifetime_points integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    customer_id text DEFAULT ('BAC-'::text || (nextval('public.customer_id_seq'::regclass))::text) NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    customer_name text CONSTRAINT customers_name_not_null NOT NULL,
    age integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_merged boolean DEFAULT false NOT NULL,
    merged_into_customer_id character varying(32),
    aadhaar_hash character varying(64),
    aadhaar_last4_enc text,
    address text,
    gst_number character varying(50),
    nominee_name character varying(100),
    nominee_relation character varying(50),
    firm_name character varying(100),
    email public.citext,
    branch_name character varying(100),
    branch_address text,
    dms_invoice_number character varying(100),
    dms_invoice_date character varying(50),
    sales_consultant character varying(100),
    aadhaar_number character varying(20),
    visit_type character varying(50) DEFAULT 'first_time'::character varying,
    is_first_time_visitor boolean DEFAULT true,
    ledger_name character varying(255),
    ledger_code character varying(100),
    ledger_group character varying(100),
    party_type character varying(100),
    customer_type character varying(100),
    gst_registration_type character varying(100),
    state character varying(100),
    city character varying(100),
    pincode character varying(20),
    vat_no character varying(50),
    pan_no character varying(50),
    service_tax_no character varying(50),
    ecc_no character varying(50)
);


--
-- Name: firms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.firms (
    firm_id integer NOT NULL,
    tenant_id character varying(64) NOT NULL,
    firm_name character varying(255) NOT NULL,
    legal_name character varying(255),
    brand_slug character varying(64),
    logo_url character varying(500),
    theme_color character varying(32) DEFAULT '#0f172a'::character varying,
    accent_color character varying(32) DEFAULT '#2563eb'::character varying,
    point_to_rupee_rate numeric(10,4) DEFAULT 0.25,
    contact_phone public.citext,
    contact_email public.citext,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: firms_firm_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.firms_firm_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: firms_firm_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.firms_firm_id_seq OWNED BY public.firms.firm_id;


--
-- Name: gift_card_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_card_redemptions (
    redemption_id integer NOT NULL,
    card_id integer NOT NULL,
    customer_id character varying(32),
    amount_paise bigint NOT NULL,
    balance_before_paise bigint NOT NULL,
    balance_after_paise bigint NOT NULL,
    transaction_type character varying(40) DEFAULT 'wallet_claim'::character varying NOT NULL,
    points_credited integer DEFAULT 0,
    reference_id character varying(100),
    cashier_id integer,
    notes text,
    tenant_id character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gift_card_redemptions_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['wallet_claim'::character varying, 'pos_redemption'::character varying, 'service_billing'::character varying, 'points_conversion'::character varying, 'manual_adjustment'::character varying])::text[])))
);


--
-- Name: gift_card_redemptions_redemption_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gift_card_redemptions_redemption_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gift_card_redemptions_redemption_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gift_card_redemptions_redemption_id_seq OWNED BY public.gift_card_redemptions.redemption_id;


--
-- Name: gift_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_cards (
    card_id integer NOT NULL,
    card_number character varying(32) NOT NULL,
    pin_code character varying(16) NOT NULL,
    initial_amount_paise bigint NOT NULL,
    balance_amount_paise bigint NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying NOT NULL,
    sender_name character varying(120),
    sender_email character varying(120),
    sender_phone character varying(30),
    recipient_name character varying(120),
    recipient_phone public.citext,
    recipient_email public.citext,
    assigned_customer_id character varying(32),
    custom_message text,
    card_theme character varying(50) DEFAULT 'celebration'::character varying,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    tenant_id character varying(64) NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gift_cards_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'partially_redeemed'::character varying, 'redeemed'::character varying, 'expired'::character varying, 'locked'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: gift_cards_card_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gift_cards_card_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gift_cards_card_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gift_cards_card_id_seq OWNED BY public.gift_cards.card_id;


--
-- Name: google_sheets_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_sheets_sync_log (
    id integer NOT NULL,
    sheet_id character varying(100) NOT NULL,
    customer_id character varying(50) NOT NULL,
    customer_name character varying(255),
    phone_number character varying(50),
    aadhaar_number character varying(50),
    source character varying(100) DEFAULT 'portal_enrollment'::character varying,
    status character varying(50) DEFAULT 'success'::character varying,
    error_message text,
    tenant_id character varying(50) DEFAULT 'bellad_and_company'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: google_sheets_sync_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.google_sheets_sync_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: google_sheets_sync_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.google_sheets_sync_log_id_seq OWNED BY public.google_sheets_sync_log.id;


--
-- Name: kyc_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_change_requests (
    id integer NOT NULL,
    customer_id character varying(32) NOT NULL,
    change_type character varying(50) DEFAULT 'phone_update'::character varying NOT NULL,
    old_value character varying(255),
    new_value character varying(255),
    reason text NOT NULL,
    id_proof_type character varying(50),
    id_proof_file_url text,
    requested_by integer,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    review_notes text,
    tenant_id character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kyc_change_requests_change_type_check CHECK (((change_type)::text = 'phone_update'::text)),
    CONSTRAINT kyc_change_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: kyc_change_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kyc_change_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kyc_change_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kyc_change_requests_id_seq OWNED BY public.kyc_change_requests.id;


--
-- Name: master_import; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_import (
    customer_name text,
    age integer,
    phone_number text,
    branch_name text,
    branch_city text,
    brand_name text,
    model text,
    chassis_no text,
    purchase_date date,
    exshowroom_price text
);


--
-- Name: nominees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nominees (
    id integer NOT NULL,
    customer_id character varying(32) NOT NULL,
    nominee_name character varying(255) NOT NULL,
    nominee_phone public.citext,
    relation character varying(100),
    id_proof_type character varying(50),
    id_proof_ref character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    tenant_id character varying(64) NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: nominees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nominees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nominees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nominees_id_seq OWNED BY public.nominees.id;


--
-- Name: otp_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_requests (
    otp_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    customer_id text,
    otp_hash text NOT NULL,
    purpose text DEFAULT 'redemption'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    phone_number character varying(20),
    is_used boolean DEFAULT false NOT NULL
);


--
-- Name: otp_requests_otp_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.otp_requests_otp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: otp_requests_otp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.otp_requests_otp_id_seq OWNED BY public.otp_requests.otp_id;


--
-- Name: point_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_rules (
    rule_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    rate_type text,
    points_per_100 numeric(10,2),
    effective_from date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vehicle_type character varying(16) DEFAULT 'all'::character varying,
    service_type character varying(32),
    condition_value character varying(100),
    points integer DEFAULT 0
);


--
-- Name: point_rules_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.point_rules_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: point_rules_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.point_rules_rule_id_seq OWNED BY public.point_rules.rule_id;


--
-- Name: points_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.points_ledger (
    entry_id bigint NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    customer_id text NOT NULL,
    vehicle_id integer,
    type text NOT NULL,
    points integer NOT NULL,
    source_ref text,
    branch_id integer,
    cashier_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    transaction_category character varying(32) NOT NULL,
    receipt_no character varying(100),
    account_ledger_no character varying(100),
    reason_type character varying(50) DEFAULT 'purchase'::character varying,
    reason_text text,
    CONSTRAINT points_ledger_transaction_category_check CHECK (((transaction_category)::text = ANY ((ARRAY['service'::character varying, 'sale'::character varying, 'accessory'::character varying, 'bodyshop'::character varying, 'referral'::character varying, 'redemption'::character varying, 'expiry'::character varying, 'adjust'::character varying])::text[]))),
    CONSTRAINT points_ledger_type_check CHECK ((type = ANY (ARRAY['earn'::text, 'earn_sale'::text, 'earn_service'::text, 'earn_accessory'::text, 'earn_bodyshop'::text, 'earn_referral'::text, 'redeem'::text, 'adjust'::text, 'expire'::text, 'sale'::text, 'service'::text, 'referral'::text, 'correction_reversal'::text, 'correction_applied'::text])))
);


--
-- Name: points_ledger_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.points_ledger_entry_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: points_ledger_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.points_ledger_entry_id_seq OWNED BY public.points_ledger.entry_id;


--
-- Name: public_balance_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.public_balance_tokens (
    id integer NOT NULL,
    customer_id character varying(32) NOT NULL,
    token character varying(64) NOT NULL,
    tenant_id character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_viewed_at timestamp with time zone,
    view_count integer DEFAULT 0 NOT NULL
);


--
-- Name: public_balance_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.public_balance_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: public_balance_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.public_balance_tokens_id_seq OWNED BY public.public_balance_tokens.id;


--
-- Name: realbooks_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.realbooks_sync_log (
    sync_id bigint NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    api_status text DEFAULT 'pending'::text NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: realbooks_sync_log_sync_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.realbooks_sync_log_sync_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: realbooks_sync_log_sync_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.realbooks_sync_log_sync_id_seq OWNED BY public.realbooks_sync_log.sync_id;


--
-- Name: redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.redemptions (
    redemption_code text NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    customer_id text NOT NULL,
    points_redeemed integer NOT NULL,
    discount_amount numeric(12,2) NOT NULL,
    branch_id integer,
    cashier_id integer,
    realbooks_sync_status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    vehicle_id integer,
    receipt_no character varying(100),
    account_ledger_no character varying(100)
);


--
-- Name: referral_approvers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_approvers (
    approver_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer,
    is_active boolean DEFAULT true
);


--
-- Name: referral_approvers_approver_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_approvers_approver_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_approvers_approver_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_approvers_approver_id_seq OWNED BY public.referral_approvers.approver_id;


--
-- Name: referral_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_leads (
    id integer NOT NULL,
    referrer_customer_id character varying(100) NOT NULL,
    lead_name character varying(255) NOT NULL,
    lead_phone character varying(20) NOT NULL,
    lead_aadhaar_hash character varying(255) NOT NULL,
    lead_aadhaar_last4_enc character varying(255) NOT NULL,
    generated_code character varying(20) NOT NULL,
    phone_verified boolean DEFAULT false,
    status character varying(30) DEFAULT 'pending'::character varying,
    matched_sale_reference character varying(255),
    flagged_reason text,
    tenant_id character varying(100) DEFAULT 'bellad_and_company'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT referral_leads_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'used'::character varying, 'rc_completed'::character varying, 'mismatched'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: referral_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_leads_id_seq OWNED BY public.referral_leads.id;


--
-- Name: referral_slabs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_slabs (
    id integer NOT NULL,
    category character varying(10) NOT NULL,
    price_range_label character varying(100) NOT NULL,
    price_min_paise bigint NOT NULL,
    price_max_paise bigint,
    base_amount_paise bigint NOT NULL,
    points_awarded bigint NOT NULL,
    tenant_id character varying(64) DEFAULT 'BAC-MAIN'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referral_slabs_category_check CHECK (((category)::text = ANY ((ARRAY['4W'::character varying, '2W'::character varying])::text[])))
);


--
-- Name: referral_slabs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referral_slabs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referral_slabs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referral_slabs_id_seq OWNED BY public.referral_slabs.id;


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    referral_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    referrer_customer_id text NOT NULL,
    referred_customer_id text NOT NULL,
    points_credited integer,
    reason text,
    approved_by integer,
    approved_at timestamp with time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    suggested_points bigint DEFAULT 0,
    points_awarded bigint DEFAULT 0,
    approval_reason text,
    approved_by_approver_id integer,
    CONSTRAINT referrals_check CHECK ((referrer_customer_id <> referred_customer_id)),
    CONSTRAINT referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: referrals_referral_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.referrals_referral_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: referrals_referral_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.referrals_referral_id_seq OWNED BY public.referrals.referral_id;


--
-- Name: sale_transaction_discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_transaction_discounts (
    id integer NOT NULL,
    sale_transaction_id integer,
    reference_id character varying(100) NOT NULL,
    discount_type character varying(100) NOT NULL,
    discount_name character varying(100) NOT NULL,
    amount_paise bigint DEFAULT 0 NOT NULL,
    tenant_id character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sale_transaction_discounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_transaction_discounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_transaction_discounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_transaction_discounts_id_seq OWNED BY public.sale_transaction_discounts.id;


--
-- Name: sale_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_transactions (
    id integer NOT NULL,
    customer_id character varying(32),
    vehicle_id integer,
    branch_id integer,
    ex_showroom_price_paise bigint DEFAULT 0 NOT NULL,
    source character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    reference_id character varying(100) NOT NULL,
    created_by integer,
    tenant_id character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tcs_amount_paise bigint DEFAULT 0,
    dealer_cash_discount_paise bigint DEFAULT 0,
    emps_discount_paise bigint DEFAULT 0,
    oem_offers_amount_paise bigint DEFAULT 0,
    stage character varying(32) DEFAULT 'finalized'::character varying,
    is_invoice_finalized boolean DEFAULT true,
    points_calculated boolean DEFAULT false,
    last_processed_at timestamp with time zone,
    CONSTRAINT sale_transactions_source_check CHECK (((source)::text = ANY ((ARRAY['auto_dms'::character varying, 'manual'::character varying, 'appsheet_bot'::character varying])::text[])))
);


--
-- Name: sale_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_transactions_id_seq OWNED BY public.sale_transactions.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    filename character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: service_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_transactions (
    id integer NOT NULL,
    customer_id character varying(32),
    vehicle_id integer,
    branch_id integer,
    job_card_number character varying(64) NOT NULL,
    bill_amount_paise bigint DEFAULT 0 NOT NULL,
    category character varying(32) DEFAULT 'service'::character varying NOT NULL,
    source character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    reference_id character varying(100),
    created_by integer,
    tenant_id character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT service_transactions_category_check CHECK (((category)::text = ANY ((ARRAY['service'::character varying, 'accessory'::character varying, 'bodyshop'::character varying])::text[]))),
    CONSTRAINT service_transactions_source_check CHECK (((source)::text = ANY ((ARRAY['auto_dms'::character varying, 'manual'::character varying, 'appsheet_bot'::character varying])::text[])))
);


--
-- Name: service_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_transactions_id_seq OWNED BY public.service_transactions.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tier_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tier_rules (
    tier_rule_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    tier_name text NOT NULL,
    min_lifetime_points integer NOT NULL,
    min_vehicles integer DEFAULT 0,
    benefits_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tier_rules_tier_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tier_rules_tier_rule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tier_rules_tier_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tier_rules_tier_rule_id_seq OWNED BY public.tier_rules.tier_rule_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    username public.citext NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    branch_id integer,
    mfa_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id integer,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['cashier'::text, 'admin'::text])))
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    vehicle_id integer NOT NULL,
    tenant_id text DEFAULT 'bellad_and_company'::text NOT NULL,
    customer_id text NOT NULL,
    brand_id integer,
    branch_id integer,
    model text,
    chassis_no public.citext,
    purchase_date date,
    exshowroom_price numeric(12,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ex_showroom_price bigint,
    vehicle_city character varying(100),
    redemption_status character varying(20) DEFAULT 'locked'::character varying NOT NULL,
    redemption_eligible_at timestamp with time zone,
    redemption_expires_at timestamp with time zone,
    redemption_notified_3m boolean DEFAULT false NOT NULL,
    redemption_notified_1m boolean DEFAULT false NOT NULL,
    vehicle_type character varying(10) DEFAULT '4W'::character varying,
    registration_number public.citext,
    variant character varying(100),
    brand_name character varying(50),
    firm_name character varying(100),
    branch_name character varying(100),
    branch_address text,
    dms_invoice_number character varying(100),
    dms_invoice_date character varying(50),
    sales_consultant character varying(100),
    vin character varying(64),
    fuel_type character varying(50),
    CONSTRAINT vehicles_redemption_status_check CHECK (((redemption_status)::text = ANY ((ARRAY['locked'::character varying, 'eligible'::character varying, 'expired'::character varying])::text[]))),
    CONSTRAINT vehicles_vehicle_type_check CHECK (((vehicle_type)::text = ANY ((ARRAY['2W'::character varying, '4W'::character varying])::text[])))
);


--
-- Name: vehicles_vehicle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicles_vehicle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicles_vehicle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehicles_vehicle_id_seq OWNED BY public.vehicles.vehicle_id;


--
-- Name: whatsapp_message_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_message_log (
    id bigint NOT NULL,
    customer_id character varying(32),
    phone_number character varying(20) NOT NULL,
    template_name character varying(100) NOT NULL,
    message_body text,
    status character varying(20) NOT NULL,
    error_message text,
    provider character varying(50) DEFAULT 'mock'::character varying,
    tenant_id character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_message_log_status_check CHECK (((status)::text = ANY ((ARRAY['sent'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: whatsapp_message_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_message_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_message_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_message_log_id_seq OWNED BY public.whatsapp_message_log.id;


--
-- Name: appsheet_pull_log log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appsheet_pull_log ALTER COLUMN log_id SET DEFAULT nextval('public.appsheet_pull_log_log_id_seq'::regclass);


--
-- Name: appsheet_webhook_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appsheet_webhook_log ALTER COLUMN id SET DEFAULT nextval('public.appsheet_webhook_log_id_seq'::regclass);


--
-- Name: audit_log audit_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN audit_id SET DEFAULT nextval('public.audit_log_audit_id_seq'::regclass);


--
-- Name: branches branch_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches ALTER COLUMN branch_id SET DEFAULT nextval('public.branches_branch_id_seq'::regclass);


--
-- Name: brands brand_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands ALTER COLUMN brand_id SET DEFAULT nextval('public.brands_brand_id_seq'::regclass);


--
-- Name: correction_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_requests ALTER COLUMN id SET DEFAULT nextval('public.correction_requests_id_seq'::regclass);


--
-- Name: customer_merge_log merge_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_merge_log ALTER COLUMN merge_id SET DEFAULT nextval('public.customer_merge_log_merge_id_seq'::regclass);


--
-- Name: customer_phones phone_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_phones ALTER COLUMN phone_id SET DEFAULT nextval('public.customer_phones_phone_id_seq'::regclass);


--
-- Name: firms firm_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firms ALTER COLUMN firm_id SET DEFAULT nextval('public.firms_firm_id_seq'::regclass);


--
-- Name: gift_card_redemptions redemption_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_redemptions ALTER COLUMN redemption_id SET DEFAULT nextval('public.gift_card_redemptions_redemption_id_seq'::regclass);


--
-- Name: gift_cards card_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards ALTER COLUMN card_id SET DEFAULT nextval('public.gift_cards_card_id_seq'::regclass);


--
-- Name: google_sheets_sync_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_sheets_sync_log ALTER COLUMN id SET DEFAULT nextval('public.google_sheets_sync_log_id_seq'::regclass);


--
-- Name: kyc_change_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_change_requests ALTER COLUMN id SET DEFAULT nextval('public.kyc_change_requests_id_seq'::regclass);


--
-- Name: nominees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominees ALTER COLUMN id SET DEFAULT nextval('public.nominees_id_seq'::regclass);


--
-- Name: otp_requests otp_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_requests ALTER COLUMN otp_id SET DEFAULT nextval('public.otp_requests_otp_id_seq'::regclass);


--
-- Name: point_rules rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_rules ALTER COLUMN rule_id SET DEFAULT nextval('public.point_rules_rule_id_seq'::regclass);


--
-- Name: points_ledger entry_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_ledger ALTER COLUMN entry_id SET DEFAULT nextval('public.points_ledger_entry_id_seq'::regclass);


--
-- Name: public_balance_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_balance_tokens ALTER COLUMN id SET DEFAULT nextval('public.public_balance_tokens_id_seq'::regclass);


--
-- Name: realbooks_sync_log sync_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realbooks_sync_log ALTER COLUMN sync_id SET DEFAULT nextval('public.realbooks_sync_log_sync_id_seq'::regclass);


--
-- Name: referral_approvers approver_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_approvers ALTER COLUMN approver_id SET DEFAULT nextval('public.referral_approvers_approver_id_seq'::regclass);


--
-- Name: referral_leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_leads ALTER COLUMN id SET DEFAULT nextval('public.referral_leads_id_seq'::regclass);


--
-- Name: referral_slabs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_slabs ALTER COLUMN id SET DEFAULT nextval('public.referral_slabs_id_seq'::regclass);


--
-- Name: referrals referral_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals ALTER COLUMN referral_id SET DEFAULT nextval('public.referrals_referral_id_seq'::regclass);


--
-- Name: sale_transaction_discounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transaction_discounts ALTER COLUMN id SET DEFAULT nextval('public.sale_transaction_discounts_id_seq'::regclass);


--
-- Name: sale_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transactions ALTER COLUMN id SET DEFAULT nextval('public.sale_transactions_id_seq'::regclass);


--
-- Name: service_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_transactions ALTER COLUMN id SET DEFAULT nextval('public.service_transactions_id_seq'::regclass);


--
-- Name: tier_rules tier_rule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tier_rules ALTER COLUMN tier_rule_id SET DEFAULT nextval('public.tier_rules_tier_rule_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: vehicles vehicle_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN vehicle_id SET DEFAULT nextval('public.vehicles_vehicle_id_seq'::regclass);


--
-- Name: whatsapp_message_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_log ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_message_log_id_seq'::regclass);


--
-- Name: appsheet_pull_log appsheet_pull_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appsheet_pull_log
    ADD CONSTRAINT appsheet_pull_log_pkey PRIMARY KEY (log_id);


--
-- Name: appsheet_webhook_log appsheet_webhook_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appsheet_webhook_log
    ADD CONSTRAINT appsheet_webhook_log_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (audit_id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (branch_id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (brand_id);


--
-- Name: correction_requests correction_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_requests
    ADD CONSTRAINT correction_requests_pkey PRIMARY KEY (id);


--
-- Name: customer_merge_log customer_merge_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_merge_log
    ADD CONSTRAINT customer_merge_log_pkey PRIMARY KEY (merge_id);


--
-- Name: customer_phones customer_phones_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_phones
    ADD CONSTRAINT customer_phones_phone_number_key UNIQUE (phone_number);


--
-- Name: customer_phones customer_phones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_phones
    ADD CONSTRAINT customer_phones_pkey PRIMARY KEY (phone_id);


--
-- Name: customer_tier_snapshot customer_tier_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tier_snapshot
    ADD CONSTRAINT customer_tier_snapshot_pkey PRIMARY KEY (customer_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customer_id);


--
-- Name: firms firms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firms
    ADD CONSTRAINT firms_pkey PRIMARY KEY (firm_id);


--
-- Name: firms firms_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firms
    ADD CONSTRAINT firms_tenant_id_key UNIQUE (tenant_id);


--
-- Name: gift_card_redemptions gift_card_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_redemptions
    ADD CONSTRAINT gift_card_redemptions_pkey PRIMARY KEY (redemption_id);


--
-- Name: gift_cards gift_cards_card_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_card_number_key UNIQUE (card_number);


--
-- Name: gift_cards gift_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_pkey PRIMARY KEY (card_id);


--
-- Name: google_sheets_sync_log google_sheets_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_sheets_sync_log
    ADD CONSTRAINT google_sheets_sync_log_pkey PRIMARY KEY (id);


--
-- Name: kyc_change_requests kyc_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_change_requests
    ADD CONSTRAINT kyc_change_requests_pkey PRIMARY KEY (id);


--
-- Name: nominees nominees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominees
    ADD CONSTRAINT nominees_pkey PRIMARY KEY (id);


--
-- Name: otp_requests otp_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_requests
    ADD CONSTRAINT otp_requests_pkey PRIMARY KEY (otp_id);


--
-- Name: point_rules point_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_rules
    ADD CONSTRAINT point_rules_pkey PRIMARY KEY (rule_id);


--
-- Name: points_ledger points_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_ledger
    ADD CONSTRAINT points_ledger_pkey PRIMARY KEY (entry_id);


--
-- Name: public_balance_tokens public_balance_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_balance_tokens
    ADD CONSTRAINT public_balance_tokens_pkey PRIMARY KEY (id);


--
-- Name: public_balance_tokens public_balance_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_balance_tokens
    ADD CONSTRAINT public_balance_tokens_token_key UNIQUE (token);


--
-- Name: realbooks_sync_log realbooks_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realbooks_sync_log
    ADD CONSTRAINT realbooks_sync_log_pkey PRIMARY KEY (sync_id);


--
-- Name: redemptions redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redemptions
    ADD CONSTRAINT redemptions_pkey PRIMARY KEY (redemption_code);


--
-- Name: referral_approvers referral_approvers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_approvers
    ADD CONSTRAINT referral_approvers_pkey PRIMARY KEY (approver_id);


--
-- Name: referral_leads referral_leads_generated_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_leads
    ADD CONSTRAINT referral_leads_generated_code_key UNIQUE (generated_code);


--
-- Name: referral_leads referral_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_leads
    ADD CONSTRAINT referral_leads_pkey PRIMARY KEY (id);


--
-- Name: referral_slabs referral_slabs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_slabs
    ADD CONSTRAINT referral_slabs_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (referral_id);


--
-- Name: sale_transaction_discounts sale_transaction_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transaction_discounts
    ADD CONSTRAINT sale_transaction_discounts_pkey PRIMARY KEY (id);


--
-- Name: sale_transactions sale_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transactions
    ADD CONSTRAINT sale_transactions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (filename);


--
-- Name: service_transactions service_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_transactions
    ADD CONSTRAINT service_transactions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: tier_rules tier_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tier_rules
    ADD CONSTRAINT tier_rules_pkey PRIMARY KEY (tier_rule_id);


--
-- Name: point_rules uq_point_rules_service_bonus; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_rules
    ADD CONSTRAINT uq_point_rules_service_bonus UNIQUE (tenant_id, vehicle_type, service_type);


--
-- Name: referral_slabs uq_referral_slabs_tenant_cat_label; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_slabs
    ADD CONSTRAINT uq_referral_slabs_tenant_cat_label UNIQUE (tenant_id, category, price_range_label);


--
-- Name: sale_transactions uq_sale_transactions_reference; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transactions
    ADD CONSTRAINT uq_sale_transactions_reference UNIQUE (tenant_id, reference_id);


--
-- Name: service_transactions uq_service_transactions_tenant_branch_job_card; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_transactions
    ADD CONSTRAINT uq_service_transactions_tenant_branch_job_card UNIQUE (tenant_id, branch_id, job_card_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: vehicles vehicles_chassis_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_chassis_no_key UNIQUE (chassis_no);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (vehicle_id);


--
-- Name: whatsapp_message_log whatsapp_message_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_log
    ADD CONSTRAINT whatsapp_message_log_pkey PRIMARY KEY (id);


--
-- Name: idx_appsheet_pull_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appsheet_pull_log_created ON public.appsheet_pull_log USING btree (created_at DESC);


--
-- Name: idx_appsheet_pull_log_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appsheet_pull_log_table ON public.appsheet_pull_log USING btree (table_name);


--
-- Name: idx_appsheet_webhook_log_received_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appsheet_webhook_log_received_at ON public.appsheet_webhook_log USING btree (received_at DESC);


--
-- Name: idx_appsheet_webhook_log_row_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appsheet_webhook_log_row_id ON public.appsheet_webhook_log USING btree (appsheet_row_id);


--
-- Name: idx_appsheet_webhook_log_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appsheet_webhook_log_tenant ON public.appsheet_webhook_log USING btree (tenant_id);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action);


--
-- Name: idx_audit_log_actor_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_actor_user ON public.audit_log USING btree (actor_user_id);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);


--
-- Name: idx_audit_log_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity_id ON public.audit_log USING btree (entity_id);


--
-- Name: idx_audit_log_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_tenant ON public.audit_log USING btree (tenant_id);


--
-- Name: idx_correction_requests_cashier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correction_requests_cashier ON public.correction_requests USING btree (cashier_user_id);


--
-- Name: idx_correction_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correction_requests_created_at ON public.correction_requests USING btree (created_at);


--
-- Name: idx_correction_requests_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correction_requests_ref ON public.correction_requests USING btree (points_ledger_reference);


--
-- Name: idx_correction_requests_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correction_requests_tenant_status ON public.correction_requests USING btree (tenant_id, status);


--
-- Name: idx_customer_merge_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_merge_log_created ON public.customer_merge_log USING btree (created_at DESC);


--
-- Name: idx_customer_merge_log_merged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_merge_log_merged ON public.customer_merge_log USING btree (tenant_id, merged_from_id);


--
-- Name: idx_customer_merge_log_surviving; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_merge_log_surviving ON public.customer_merge_log USING btree (tenant_id, merged_into_id);


--
-- Name: idx_customer_phones_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_phones_customer ON public.customer_phones USING btree (customer_id);


--
-- Name: idx_customer_phones_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_phones_customer_id ON public.customer_phones USING btree (customer_id);


--
-- Name: idx_customer_phones_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_phones_lookup ON public.customer_phones USING btree (tenant_id, phone_number);


--
-- Name: idx_customer_phones_tenant_num; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_phones_tenant_num ON public.customer_phones USING btree (tenant_id, phone_number);


--
-- Name: idx_customer_tier_snapshot_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_tier_snapshot_tenant ON public.customer_tier_snapshot USING btree (tenant_id);


--
-- Name: idx_customers_aadhaar_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_aadhaar_number ON public.customers USING btree (tenant_id, aadhaar_number);


--
-- Name: idx_customers_firm_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_firm_trgm ON public.customers USING gin (firm_name public.gin_trgm_ops);


--
-- Name: idx_customers_is_merged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_is_merged ON public.customers USING btree (tenant_id, is_merged);


--
-- Name: idx_customers_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_name_trgm ON public.customers USING gin (customer_name public.gin_trgm_ops);


--
-- Name: idx_customers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_tenant ON public.customers USING btree (tenant_id);


--
-- Name: idx_customers_tenant_aadhaar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_tenant_aadhaar ON public.customers USING btree (tenant_id, aadhaar_number);


--
-- Name: idx_customers_tenant_aadhaar_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_customers_tenant_aadhaar_hash ON public.customers USING btree (tenant_id, aadhaar_hash) WHERE (aadhaar_hash IS NOT NULL);


--
-- Name: idx_customers_tenant_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_tenant_name_trgm ON public.customers USING gin (customer_name public.gin_trgm_ops);


--
-- Name: idx_firms_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firms_active ON public.firms USING btree (is_active);


--
-- Name: idx_firms_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firms_tenant ON public.firms USING btree (tenant_id);


--
-- Name: idx_gift_card_redemptions_card; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_card_redemptions_card ON public.gift_card_redemptions USING btree (tenant_id, card_id);


--
-- Name: idx_gift_card_redemptions_cust; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_card_redemptions_cust ON public.gift_card_redemptions USING btree (tenant_id, customer_id);


--
-- Name: idx_gift_card_redemptions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_card_redemptions_date ON public.gift_card_redemptions USING btree (tenant_id, created_at);


--
-- Name: idx_gift_cards_assigned_cust; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_assigned_cust ON public.gift_cards USING btree (tenant_id, assigned_customer_id);


--
-- Name: idx_gift_cards_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_number ON public.gift_cards USING btree (tenant_id, card_number);


--
-- Name: idx_gift_cards_recipient_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_recipient_phone ON public.gift_cards USING btree (tenant_id, recipient_phone);


--
-- Name: idx_gift_cards_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_tenant_status ON public.gift_cards USING btree (tenant_id, status);


--
-- Name: idx_google_sheets_sync_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_sheets_sync_created ON public.google_sheets_sync_log USING btree (created_at DESC);


--
-- Name: idx_google_sheets_sync_cust; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_sheets_sync_cust ON public.google_sheets_sync_log USING btree (customer_id);


--
-- Name: idx_kyc_change_requests_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_change_requests_customer ON public.kyc_change_requests USING btree (tenant_id, customer_id);


--
-- Name: idx_kyc_change_requests_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kyc_change_requests_tenant_status ON public.kyc_change_requests USING btree (tenant_id, status);


--
-- Name: idx_ledger_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_customer ON public.points_ledger USING btree (customer_id);


--
-- Name: idx_nominees_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominees_customer ON public.nominees USING btree (tenant_id, customer_id);


--
-- Name: idx_nominees_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nominees_tenant ON public.nominees USING btree (tenant_id);


--
-- Name: idx_otp_requests_rate_limit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_requests_rate_limit ON public.otp_requests USING btree (tenant_id, customer_id, created_at);


--
-- Name: idx_points_ledger_account_ledger_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_ledger_account_ledger_no ON public.points_ledger USING btree (account_ledger_no);


--
-- Name: idx_points_ledger_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_ledger_category ON public.points_ledger USING btree (tenant_id, transaction_category);


--
-- Name: idx_points_ledger_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_ledger_created_at ON public.points_ledger USING btree (created_at);


--
-- Name: idx_points_ledger_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_ledger_customer ON public.points_ledger USING btree (tenant_id, customer_id);


--
-- Name: idx_points_ledger_reason_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_ledger_reason_type ON public.points_ledger USING btree (tenant_id, reason_type);


--
-- Name: idx_points_ledger_receipt_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_ledger_receipt_no ON public.points_ledger USING btree (receipt_no);


--
-- Name: idx_points_ledger_source_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_ledger_source_ref ON public.points_ledger USING btree (tenant_id, source_ref);


--
-- Name: idx_points_ledger_tenant_cust_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_ledger_tenant_cust_date ON public.points_ledger USING btree (tenant_id, customer_id, created_at DESC);


--
-- Name: idx_points_ledger_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_ledger_vehicle ON public.points_ledger USING btree (vehicle_id, created_at) WHERE (vehicle_id IS NOT NULL);


--
-- Name: idx_public_balance_tokens_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_balance_tokens_customer ON public.public_balance_tokens USING btree (tenant_id, customer_id);


--
-- Name: idx_public_balance_tokens_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_balance_tokens_expires ON public.public_balance_tokens USING btree (expires_at);


--
-- Name: idx_public_balance_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_public_balance_tokens_token ON public.public_balance_tokens USING btree (token);


--
-- Name: idx_realbooks_sync_log_redemption; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_realbooks_sync_log_redemption ON public.realbooks_sync_log USING btree (tenant_id, entity_id);


--
-- Name: idx_realbooks_sync_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_realbooks_sync_log_status ON public.realbooks_sync_log USING btree (tenant_id, api_status);


--
-- Name: idx_redemptions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemptions_created_at ON public.redemptions USING btree (created_at);


--
-- Name: idx_redemptions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemptions_customer ON public.redemptions USING btree (tenant_id, customer_id);


--
-- Name: idx_redemptions_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemptions_vehicle ON public.redemptions USING btree (vehicle_id) WHERE (vehicle_id IS NOT NULL);


--
-- Name: idx_referral_approvers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_approvers_tenant ON public.referral_approvers USING btree (tenant_id);


--
-- Name: idx_referral_leads_generated_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_leads_generated_code ON public.referral_leads USING btree (generated_code);


--
-- Name: idx_referral_leads_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_leads_referrer ON public.referral_leads USING btree (referrer_customer_id);


--
-- Name: idx_referral_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_leads_status ON public.referral_leads USING btree (status);


--
-- Name: idx_referral_leads_tenant_aadhaar_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_referral_leads_tenant_aadhaar_active ON public.referral_leads USING btree (tenant_id, lead_aadhaar_hash) WHERE ((status)::text <> 'expired'::text);


--
-- Name: idx_referral_slabs_tenant_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_slabs_tenant_cat ON public.referral_slabs USING btree (tenant_id, category);


--
-- Name: idx_referrals_referred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referred ON public.referrals USING btree (tenant_id, referred_customer_id);


--
-- Name: idx_referrals_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (tenant_id, referrer_customer_id);


--
-- Name: idx_referrals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_status ON public.referrals USING btree (tenant_id, status);


--
-- Name: idx_sale_transaction_discounts_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_transaction_discounts_ref ON public.sale_transaction_discounts USING btree (tenant_id, reference_id);


--
-- Name: idx_sale_transaction_discounts_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_transaction_discounts_sale_id ON public.sale_transaction_discounts USING btree (sale_transaction_id);


--
-- Name: idx_sale_transactions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_transactions_customer ON public.sale_transactions USING btree (tenant_id, customer_id);


--
-- Name: idx_sale_transactions_finalized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_transactions_finalized ON public.sale_transactions USING btree (tenant_id, is_invoice_finalized, points_calculated);


--
-- Name: idx_sale_transactions_tenant_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_transactions_tenant_ref ON public.sale_transactions USING btree (tenant_id, reference_id);


--
-- Name: idx_service_transactions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_transactions_customer ON public.service_transactions USING btree (tenant_id, customer_id);


--
-- Name: idx_service_transactions_job_card; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_transactions_job_card ON public.service_transactions USING btree (tenant_id, job_card_number);


--
-- Name: idx_service_transactions_tenant_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_transactions_tenant_branch ON public.service_transactions USING btree (tenant_id, branch_id);


--
-- Name: idx_vehicles_brand_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_brand_trgm ON public.vehicles USING gin (brand_name public.gin_trgm_ops);


--
-- Name: idx_vehicles_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_customer ON public.vehicles USING btree (customer_id);


--
-- Name: idx_vehicles_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_customer_id ON public.vehicles USING btree (customer_id);


--
-- Name: idx_vehicles_redemption_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_redemption_expires ON public.vehicles USING btree (redemption_expires_at) WHERE ((redemption_status)::text <> 'expired'::text);


--
-- Name: idx_vehicles_redemption_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_redemption_status ON public.vehicles USING btree (tenant_id, redemption_status);


--
-- Name: idx_vehicles_reg_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_reg_lookup ON public.vehicles USING btree (tenant_id, chassis_no);


--
-- Name: idx_vehicles_tenant_chassis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_tenant_chassis ON public.vehicles USING btree (tenant_id, chassis_no);


--
-- Name: idx_vehicles_tenant_reg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_tenant_reg ON public.vehicles USING btree (tenant_id, registration_number);


--
-- Name: idx_vehicles_variant_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_variant_trgm ON public.vehicles USING gin (variant public.gin_trgm_ops);


--
-- Name: idx_whatsapp_log_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_log_customer ON public.whatsapp_message_log USING btree (customer_id);


--
-- Name: idx_whatsapp_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_log_status ON public.whatsapp_message_log USING btree (status);


--
-- Name: idx_whatsapp_log_tenant_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_log_tenant_created ON public.whatsapp_message_log USING btree (tenant_id, created_at DESC);


--
-- Name: points_ledger trg_prevent_points_ledger_modification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_points_ledger_modification BEFORE DELETE OR UPDATE ON public.points_ledger FOR EACH ROW EXECUTE FUNCTION public.prevent_points_ledger_modification();


--
-- Name: audit_log audit_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(user_id);


--
-- Name: correction_requests correction_requests_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_requests
    ADD CONSTRAINT correction_requests_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;


--
-- Name: correction_requests correction_requests_cashier_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_requests
    ADD CONSTRAINT correction_requests_cashier_user_id_fkey FOREIGN KEY (cashier_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: correction_requests correction_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_requests
    ADD CONSTRAINT correction_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: correction_requests correction_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_requests
    ADD CONSTRAINT correction_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: customer_merge_log customer_merge_log_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_merge_log
    ADD CONSTRAINT customer_merge_log_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id);


--
-- Name: customer_merge_log customer_merge_log_merged_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_merge_log
    ADD CONSTRAINT customer_merge_log_merged_from_id_fkey FOREIGN KEY (merged_from_id) REFERENCES public.customers(customer_id);


--
-- Name: customer_merge_log customer_merge_log_merged_into_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_merge_log
    ADD CONSTRAINT customer_merge_log_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES public.customers(customer_id);


--
-- Name: customer_phones customer_phones_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_phones
    ADD CONSTRAINT customer_phones_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: customer_tier_snapshot customer_tier_snapshot_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_tier_snapshot
    ADD CONSTRAINT customer_tier_snapshot_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: customers customers_merged_into_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_merged_into_customer_id_fkey FOREIGN KEY (merged_into_customer_id) REFERENCES public.customers(customer_id);


--
-- Name: gift_card_redemptions gift_card_redemptions_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_redemptions
    ADD CONSTRAINT gift_card_redemptions_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.gift_cards(card_id) ON DELETE CASCADE;


--
-- Name: gift_card_redemptions gift_card_redemptions_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_redemptions
    ADD CONSTRAINT gift_card_redemptions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: gift_card_redemptions gift_card_redemptions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_redemptions
    ADD CONSTRAINT gift_card_redemptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- Name: gift_cards gift_cards_assigned_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_assigned_customer_id_fkey FOREIGN KEY (assigned_customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- Name: gift_cards gift_cards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: kyc_change_requests kyc_change_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_change_requests
    ADD CONSTRAINT kyc_change_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: kyc_change_requests kyc_change_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_change_requests
    ADD CONSTRAINT kyc_change_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: kyc_change_requests kyc_change_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_change_requests
    ADD CONSTRAINT kyc_change_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: nominees nominees_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominees
    ADD CONSTRAINT nominees_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: nominees nominees_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nominees
    ADD CONSTRAINT nominees_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: otp_requests otp_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_requests
    ADD CONSTRAINT otp_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: points_ledger points_ledger_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_ledger
    ADD CONSTRAINT points_ledger_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- Name: points_ledger points_ledger_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_ledger
    ADD CONSTRAINT points_ledger_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(user_id);


--
-- Name: points_ledger points_ledger_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_ledger
    ADD CONSTRAINT points_ledger_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: points_ledger points_ledger_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_ledger
    ADD CONSTRAINT points_ledger_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(vehicle_id);


--
-- Name: public_balance_tokens public_balance_tokens_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_balance_tokens
    ADD CONSTRAINT public_balance_tokens_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE CASCADE;


--
-- Name: redemptions redemptions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redemptions
    ADD CONSTRAINT redemptions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- Name: redemptions redemptions_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redemptions
    ADD CONSTRAINT redemptions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES public.users(user_id);


--
-- Name: redemptions redemptions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redemptions
    ADD CONSTRAINT redemptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: redemptions redemptions_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.redemptions
    ADD CONSTRAINT redemptions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(vehicle_id) ON DELETE SET NULL;


--
-- Name: referral_leads referral_leads_referrer_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_leads
    ADD CONSTRAINT referral_leads_referrer_customer_id_fkey FOREIGN KEY (referrer_customer_id) REFERENCES public.customers(customer_id) ON DELETE RESTRICT;


--
-- Name: referrals referrals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.referral_approvers(approver_id);


--
-- Name: referrals referrals_referred_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_customer_id_fkey FOREIGN KEY (referred_customer_id) REFERENCES public.customers(customer_id);


--
-- Name: referrals referrals_referrer_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_customer_id_fkey FOREIGN KEY (referrer_customer_id) REFERENCES public.customers(customer_id);


--
-- Name: sale_transaction_discounts sale_transaction_discounts_sale_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transaction_discounts
    ADD CONSTRAINT sale_transaction_discounts_sale_transaction_id_fkey FOREIGN KEY (sale_transaction_id) REFERENCES public.sale_transactions(id) ON DELETE CASCADE;


--
-- Name: sale_transactions sale_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transactions
    ADD CONSTRAINT sale_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;


--
-- Name: sale_transactions sale_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transactions
    ADD CONSTRAINT sale_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sale_transactions sale_transactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transactions
    ADD CONSTRAINT sale_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- Name: sale_transactions sale_transactions_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_transactions
    ADD CONSTRAINT sale_transactions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(vehicle_id) ON DELETE SET NULL;


--
-- Name: service_transactions service_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_transactions
    ADD CONSTRAINT service_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;


--
-- Name: service_transactions service_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_transactions
    ADD CONSTRAINT service_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: service_transactions service_transactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_transactions
    ADD CONSTRAINT service_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- Name: service_transactions service_transactions_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_transactions
    ADD CONSTRAINT service_transactions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(vehicle_id) ON DELETE SET NULL;


--
-- Name: users users_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- Name: vehicles vehicles_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id);


--
-- Name: vehicles vehicles_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(brand_id);


--
-- Name: vehicles vehicles_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id);


--
-- Name: whatsapp_message_log whatsapp_message_log_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_log
    ADD CONSTRAINT whatsapp_message_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Pc7HoMwvV44X5U8lv4C5UBZLGt3Lrod4Nwk7uMJJIIBgncO2bdNibfBHWFXolZm

