--
-- PostgreSQL database dump
--

\restrict MKJwaDmDYy24FJ8uAnKbx3iN9bznUEufWlbH6qTIkDikxqylPW3iR2So9nrhNNe

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.services DROP CONSTRAINT services_provider_id_fkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_service_id_fkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_customer_id_fkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_booking_id_fkey;
ALTER TABLE ONLY public.bookings DROP CONSTRAINT bookings_time_slot_id_fkey;
ALTER TABLE ONLY public.bookings DROP CONSTRAINT bookings_service_id_fkey;
ALTER TABLE ONLY public.bookings DROP CONSTRAINT bookings_customer_id_fkey;
DROP INDEX public.idx_timeslots_date_service;
DROP INDEX public.idx_timeslots_capacity;
DROP INDEX public.idx_services_provider;
DROP INDEX public.idx_services_location;
DROP INDEX public.idx_services_category;
DROP INDEX public.idx_schedules_service;
DROP INDEX public.idx_reviews_service;
DROP INDEX public.idx_reviews_flagged;
DROP INDEX public.idx_reviews_customer;
DROP INDEX public.idx_payments_booking;
DROP INDEX public.idx_notifications_user;
DROP INDEX public.idx_messages_unread;
DROP INDEX public.idx_messages_conv;
DROP INDEX public.idx_bookings_status;
DROP INDEX public.idx_bookings_service;
DROP INDEX public.idx_bookings_customer;
DROP INDEX public.idx_blocked_service;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
ALTER TABLE ONLY public.time_slots DROP CONSTRAINT time_slots_service_id_slot_date_start_time_key;
ALTER TABLE ONLY public.time_slots DROP CONSTRAINT time_slots_pkey;
ALTER TABLE ONLY public.services DROP CONSTRAINT services_pkey;
ALTER TABLE ONLY public.service_schedules DROP CONSTRAINT service_schedules_service_id_day_of_week_key;
ALTER TABLE ONLY public.service_schedules DROP CONSTRAINT service_schedules_pkey;
ALTER TABLE ONLY public.service_blocked_dates DROP CONSTRAINT service_blocked_dates_service_id_blocked_date_key;
ALTER TABLE ONLY public.service_blocked_dates DROP CONSTRAINT service_blocked_dates_pkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_pkey;
ALTER TABLE ONLY public.reviews DROP CONSTRAINT reviews_customer_id_service_id_key;
ALTER TABLE ONLY public.payments DROP CONSTRAINT payments_pkey;
ALTER TABLE ONLY public.notifications DROP CONSTRAINT notifications_pkey;
ALTER TABLE ONLY public.messages DROP CONSTRAINT messages_pkey;
ALTER TABLE ONLY public.bookings DROP CONSTRAINT bookings_pkey;
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.time_slots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.services ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.service_schedules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.service_blocked_dates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.reviews ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.bookings ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE public.users_id_seq;
DROP TABLE public.users;
DROP SEQUENCE public.time_slots_id_seq;
DROP TABLE public.time_slots;
DROP SEQUENCE public.services_id_seq;
DROP TABLE public.services;
DROP SEQUENCE public.service_schedules_id_seq;
DROP TABLE public.service_schedules;
DROP SEQUENCE public.service_blocked_dates_id_seq;
DROP TABLE public.service_blocked_dates;
DROP SEQUENCE public.reviews_id_seq;
DROP TABLE public.reviews;
DROP SEQUENCE public.payments_id_seq;
DROP TABLE public.payments;
DROP SEQUENCE public.notifications_id_seq;
DROP TABLE public.notifications;
DROP SEQUENCE public.messages_id_seq;
DROP TABLE public.messages;
DROP SEQUENCE public.bookings_id_seq;
DROP TABLE public.bookings;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    service_id integer NOT NULL,
    booking_date timestamp without time zone NOT NULL,
    notes text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    location text,
    cancelled_by character varying(20),
    cancellation_reason text,
    cancelled_at timestamp without time zone,
    time_slot_id integer,
    payment_currency character varying(3),
    converted_price numeric(12,2),
    exchange_rate numeric(18,8),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'paused'::character varying])::text[])))
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    original_price numeric(12,2) NOT NULL,
    original_currency character varying(3) NOT NULL,
    converted_price numeric(12,2) NOT NULL,
    payment_currency character varying(3) NOT NULL,
    exchange_rate numeric(18,8) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    service_id integer NOT NULL,
    booking_id integer,
    rating integer NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_flagged boolean DEFAULT false,
    flag_reason text,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: service_blocked_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_blocked_dates (
    id integer NOT NULL,
    service_id integer NOT NULL,
    blocked_date date NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: service_blocked_dates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_blocked_dates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_blocked_dates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_blocked_dates_id_seq OWNED BY public.service_blocked_dates.id;


--
-- Name: service_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_schedules (
    id integer NOT NULL,
    service_id integer NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: service_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_schedules_id_seq OWNED BY public.service_schedules.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    category character varying(100) NOT NULL,
    location character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    image_url character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    duration_hours integer DEFAULT 1 NOT NULL,
    team_count integer DEFAULT 1 NOT NULL,
    availability_status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    image_urls text[] DEFAULT '{}'::text[] NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    CONSTRAINT chk_availability_status CHECK (((availability_status)::text = ANY ((ARRAY['available'::character varying, 'fully_booked'::character varying, 'paused'::character varying])::text[])))
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: time_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_slots (
    id integer NOT NULL,
    service_id integer NOT NULL,
    slot_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_booked boolean DEFAULT false NOT NULL,
    max_capacity integer DEFAULT 1 NOT NULL,
    booked_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: time_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.time_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.time_slots_id_seq OWNED BY public.time_slots.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'customer'::character varying,
    phone character varying(50),
    location character varying(255),
    avatar_url character varying(500),
    bio text,
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    password_reset_token character varying(255),
    password_reset_expires timestamp without time zone,
    account_type character varying(20) DEFAULT 'freelancer'::character varying,
    gallery_urls text[] DEFAULT '{}'::text[],
    CONSTRAINT chk_account_type CHECK (((account_type)::text = ANY ((ARRAY['freelancer'::character varying, 'business'::character varying])::text[]))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['customer'::character varying, 'provider'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: service_blocked_dates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_blocked_dates ALTER COLUMN id SET DEFAULT nextval('public.service_blocked_dates_id_seq'::regclass);


--
-- Name: service_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_schedules ALTER COLUMN id SET DEFAULT nextval('public.service_schedules_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: time_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots ALTER COLUMN id SET DEFAULT nextval('public.time_slots_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bookings (id, customer_id, service_id, booking_date, notes, status, created_at, updated_at, location, cancelled_by, cancellation_reason, cancelled_at, time_slot_id, payment_currency, converted_price, exchange_rate) FROM stdin;
1	8	5	2026-06-17 07:00:00	\N	pending	2026-06-15 13:00:50.663962	2026-06-15 13:00:50.663962	RegentHome BangNa,Bangkok	\N	\N	\N	\N	THB	4899.47	32.66313000
3	16	2	2026-06-22 20:56:00	hello	pending	2026-06-21 12:53:11.607366	2026-06-21 12:53:11.607366	bangkok	\N	\N	\N	\N	USD	60.00	1.00000000
2	16	2	2026-06-22 06:59:00	hello	completed	2026-06-21 12:00:05.603846	2026-06-21 13:04:48.197086	bangkok	\N	\N	\N	\N	THB	1972.99	32.88313200
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, sender_id, receiver_id, content, is_read, created_at) FROM stdin;
1	8	4	hello	t	2026-06-08 23:01:50.997277
2	4	8	hello	t	2026-06-08 23:43:36.22346
5	8	8	ok , i know	t	2026-06-15 13:05:14.102557
3	2	8	hello	t	2026-06-15 13:02:37.727544
4	2	8	the 150 usd is only for technician service fee , it is ok?	t	2026-06-15 13:04:32.975009
6	8	2	hello	t	2026-06-15 13:11:04.764472
7	8	2	hello	t	2026-06-15 13:22:39.683113
8	8	2	hekkkkkkkk	t	2026-06-15 13:23:19.853344
9	8	2	hello	t	2026-06-15 13:29:01.160939
10	6	2	hello	t	2026-06-15 13:31:05.489182
11	2	6	hello	t	2026-06-15 13:31:15.274197
12	2	8	hello	f	2026-06-15 13:31:28.167478
13	16	2	hello	t	2026-06-15 13:39:46.398245
14	2	16	hi	t	2026-06-15 13:40:13.386217
15	16	2	hello	t	2026-06-21 11:52:18.41737
16	2	16	hii	t	2026-06-21 11:52:36.87247
17	16	2	hello12	t	2026-06-21 12:51:47.445342
18	16	2	hello	f	2026-06-22 19:34:55.27672
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, data, is_read, created_at) FROM stdin;
1	4	booking_new	📅 New Booking Request	John Smith booked "Smart Home Installation" for Jun 10, 2026, 12:43 AM	{"booking_id": 1, "service_id": 5, "service_title": "Smart Home Installation"}	t	2026-06-08 23:43:03.584093
4	8	booking_status	Booking Completed 🏁	Your booking for "Smart Home Installation" on Jun 9, 2026, 5:43 PM is now completed.	{"booking_id": 1, "service_title": "Smart Home Installation"}	t	2026-06-08 23:44:15.306909
3	8	booking_status	Booking Confirmed ✅	Your booking for "Smart Home Installation" on Jun 9, 2026, 5:43 PM is now confirmed.	{"booking_id": 1, "service_title": "Smart Home Installation"}	t	2026-06-08 23:44:09.573572
2	8	booking_confirmed	✅ Booking Submitted	Your booking for "Smart Home Installation" on Jun 10, 2026, 12:43 AM has been received.	{"booking_id": 1, "service_id": 5, "service_title": "Smart Home Installation"}	t	2026-06-08 23:43:03.795363
6	8	booking_confirmed	✅ Booking Submitted	Your booking for "Smart Home Installation" on Jun 17, 2026, 2:00 PM has been received.	{"booking_id": 1, "service_id": 5, "service_title": "Smart Home Installation"}	f	2026-06-15 13:00:50.914787
5	2	booking_new	📅 New Booking Request	Michael Brown booked "Smart Home Installation" for Jun 17, 2026, 2:00 PM	{"booking_id": 1, "service_id": 5, "service_title": "Smart Home Installation"}	t	2026-06-15 13:00:50.709346
8	16	booking_confirmed	✅ Booking Submitted	Your booking for "Furniture Assembly" on Jun 22, 2026, 1:59 PM has been received.	{"booking_id": 2, "service_id": 2, "service_title": "Furniture Assembly"}	f	2026-06-21 12:00:05.921002
7	2	booking_new	📅 New Booking Request	Soe Ye Htut booked "Furniture Assembly" for Jun 22, 2026, 1:59 PM	{"booking_id": 2, "service_id": 2, "service_title": "Furniture Assembly"}	t	2026-06-21 12:00:05.745165
9	16	booking_status	Booking Confirmed ✅	Your booking for "Furniture Assembly" on Jun 22, 2026, 6:59 AM is now confirmed.	{"booking_id": 2, "service_title": "Furniture Assembly"}	t	2026-06-21 12:00:46.384464
11	16	booking_confirmed	✅ Booking Submitted	Your booking for "Furniture Assembly" on Jun 23, 2026, 3:56 AM has been received.	{"booking_id": 3, "service_id": 2, "service_title": "Furniture Assembly"}	f	2026-06-21 12:53:11.917775
10	2	booking_new	📅 New Booking Request	Soe Ye Htut booked "Furniture Assembly" for Jun 23, 2026, 3:56 AM	{"booking_id": 3, "service_id": 2, "service_title": "Furniture Assembly"}	t	2026-06-21 12:53:11.666531
12	16	booking_status	Booking Completed 🏁	Your booking for "Furniture Assembly" on Jun 22, 2026, 6:59 AM is now completed.	{"booking_id": 2, "service_title": "Furniture Assembly"}	t	2026-06-21 13:04:48.211286
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, booking_id, original_price, original_currency, converted_price, payment_currency, exchange_rate, created_at) FROM stdin;
1	1	150.00	USD	150.00	USD	1.00000000	2026-06-08 23:43:03.476136
2	1	150.00	USD	4899.47	THB	32.66313000	2026-06-15 13:00:50.67706
3	2	60.00	USD	1972.99	THB	32.88313200	2026-06-21 12:00:05.617096
4	3	60.00	USD	60.00	USD	1.00000000	2026-06-21 12:53:11.62149
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, customer_id, service_id, booking_id, rating, comment, created_at, is_flagged, flag_reason) FROM stdin;
\.


--
-- Data for Name: service_blocked_dates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_blocked_dates (id, service_id, blocked_date, reason, created_at) FROM stdin;
\.


--
-- Data for Name: service_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_schedules (id, service_id, day_of_week, start_time, end_time, is_active) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.services (id, provider_id, title, description, category, location, price, image_url, is_active, created_at, updated_at, duration_hours, team_count, availability_status, image_urls, currency) FROM stdin;
20	5	Seasonal Garden Cleanup	Spring or fall garden cleanup — clearing leaves, cutting back perennials, mulching beds, and prepping for the next season.	Gardening	Houston, TX	130.00	/uploads/service-1781498675664-802620205.webp	t	2026-06-11 11:57:57.357794	2026-06-15 11:44:35.683366	3	2	available	{/uploads/service-1781498675664-802620205.webp}	USD
19	5	Irrigation System Setup	Design and install drip or sprinkler irrigation systems for lawns and gardens. Includes controller programming.	Gardening	Houston, TX	300.00	/uploads/service-1781498834796-414516558.jpg	t	2026-06-11 11:57:57.35568	2026-06-15 11:47:14.812457	6	2	available	{/uploads/service-1781498834796-414516558.jpg,/uploads/service-1781498834796-798032453.jpg,/uploads/service-1781498834796-936794196.jpg,/uploads/service-1781498834797-205804120.jpg}	USD
18	5	Tree Trimming & Pruning	Safe and professional tree trimming, branch removal, and hedge pruning. Debris hauled away at no extra cost.	Gardening	Houston, TX	175.00	/uploads/service-1781499068648-696841832.jpg	t	2026-06-11 11:57:57.353614	2026-06-15 11:51:08.664255	4	2	available	{/uploads/service-1781499068648-696841832.jpg,/uploads/service-1781499068648-716657749.jpg,/uploads/service-1781499068649-531230034.jpg}	USD
17	5	Garden Design & Planting	Custom garden design and planting service. We source plants suited to your climate and aesthetic preferences.	Gardening	Houston, TX	200.00	/uploads/service-1781499181681-344324399.webp	t	2026-06-11 11:57:57.351929	2026-06-15 11:53:01.703089	5	2	available	{/uploads/service-1781499181681-344324399.webp,/uploads/service-1781499181690-614151151.jpg,/uploads/service-1781499181690-271218240.jpg,/uploads/service-1781499181690-676474388.jpg,/uploads/service-1781499181690-564762410.jpg}	USD
16	5	Lawn Mowing & Edging	Professional lawn mowing, edging, and trimming. Leaves your yard looking neat and well-maintained every time.	Gardening	Houston, TX	65.00	/uploads/service-1781499304164-366857097.jpg	t	2026-06-11 11:57:57.349885	2026-06-15 11:55:04.182018	2	1	available	{/uploads/service-1781499304164-366857097.jpg,/uploads/service-1781499304167-739153557.png,/uploads/service-1781499304172-547023824.webp}	USD
10	3	Home Organization	Professional decluttering and organization for closets, kitchens, garages, and any room. Includes labeling and storage solutions.	Cleaning	Los Angeles, CA	95.00	/uploads/service-1781499981835-603267514.jpg	t	2026-06-11 11:57:57.33709	2026-06-15 12:06:21.854232	3	1	available	{/uploads/service-1781499981835-603267514.jpg,/uploads/service-1781499981836-169042206.webp,/uploads/service-1781499981836-150801252.jpg,/uploads/service-1781499981840-99841485.jpg}	USD
9	3	Post-Party Cleanup	Quick and efficient post-event cleanup. We handle trash removal, surface cleaning, and restoring your space to its original state.	Cleaning	Los Angeles, CA	160.00	/uploads/service-1781500113979-911881547.jpg	t	2026-06-11 11:57:57.334358	2026-06-15 12:08:34.002957	3	2	available	{/uploads/service-1781500113979-911881547.jpg,/uploads/service-1781500113979-526861007.jpg,/uploads/service-1781500113980-808155612.jpg,/uploads/service-1781500113987-930726010.jpg}	USD
8	3	Office Cleaning	Professional office cleaning service for small to medium businesses. Flexible scheduling including evenings and weekends.	Cleaning	Los Angeles, CA	180.00	/uploads/service-1781500212420-691215702.jpg	t	2026-06-11 11:57:57.332345	2026-06-15 12:10:12.465508	4	3	available	{/uploads/service-1781500212420-691215702.jpg,/uploads/service-1781500212421-325332529.png,/uploads/service-1781500212452-93893526.jpg,/uploads/service-1781500212454-357409723.jpg}	USD
15	4	Home Inspection	Comprehensive home inspection covering electrical, plumbing, HVAC basics, and structural concerns. Detailed report provided.	Electrical	Chicago, IL	250.00	/uploads/service-1781500853328-278029195.png	t	2026-06-11 11:57:57.347523	2026-06-15 12:20:53.359934	3	1	available	{/uploads/service-1781500853328-278029195.png,/uploads/service-1781500853334-656398637.png,/uploads/service-1781500853346-255890093.png}	USD
14	4	Ceiling Fan Installation	Install or replace ceiling fans with or without existing wiring. Safety-certified and fully insured.	Electrical	Chicago, IL	85.00	/uploads/service-1781500966424-734230318.png	t	2026-06-11 11:57:57.345034	2026-06-15 12:22:46.453593	1	1	available	{/uploads/service-1781500966424-734230318.png,/uploads/service-1781500966429-413566420.png,/uploads/service-1781500966436-298638656.png,/uploads/service-1781500966440-955409863.png}	USD
13	4	Water Heater Installation	Professional installation and replacement of water heaters — tank and tankless. Includes disposal of old unit.	Plumbing	Chicago, IL	350.00	/uploads/service-1781501226825-465682365.png	t	2026-06-11 11:57:57.343101	2026-06-15 12:27:06.853279	4	2	available	{/uploads/service-1781501226825-465682365.png,/uploads/service-1781501226827-31390017.png,/uploads/service-1781501226833-314493321.png,/uploads/service-1781501226836-110219034.png}	USD
11	4	Electrical Repairs	Licensed electrician for outlet installation, circuit breaker issues, lighting fixtures, and all electrical troubleshooting.	Electrical	Chicago, IL	100.00	/uploads/service-1781501520650-276665571.png	t	2026-06-11 11:57:57.338887	2026-06-15 12:32:00.671175	2	1	available	{/uploads/service-1781501520650-276665571.png,/uploads/service-1781501520655-755151916.png,/uploads/service-1781501520659-183388551.png}	USD
5	2	Smart Home Installation	Setup and install smart home devices — thermostats, doorbells, locks, cameras, and speakers. Full configuration included.	Electrical	New York, NY	150.00	/uploads/service-1781501843297-343076315.png	t	2026-06-11 11:57:57.325073	2026-06-15 12:37:23.321444	8	1	available	{/uploads/service-1781501843297-343076315.png,/uploads/service-1781501843302-986760679.png,/uploads/service-1781501843307-885930453.png,/uploads/service-1781501843311-269349736.png}	USD
2	2	Furniture Assembly	Expert assembly of all flat-pack furniture including IKEA, Wayfair, Amazon. All tools provided. Quick and clean service.	Installing	New York, NY	60.00	/uploads/service-1781502265983-518039641.png	t	2026-06-11 11:57:57.317801	2026-06-15 12:54:31.534486	2	1	available	{/uploads/service-1781502265983-518039641.png,/uploads/service-1781502265989-349200101.png,/uploads/service-1781502265996-974371689.png,/uploads/service-1781502266012-767554926.png}	USD
4	2	TV Mounting Service	Professional TV wall mounting for all screen sizes. Includes cable management and wall repair if needed.	Installing	New York, NY	90.00	/uploads/service-1781501991574-318566318.png	t	2026-06-11 11:57:57.322622	2026-06-15 12:54:41.23057	1	1	available	{/uploads/service-1781501991574-318566318.png,/uploads/service-1781501991580-249776383.png,/uploads/service-1781501991590-381919749.png,/uploads/service-1781501991594-502631053.png,/uploads/service-1781501991601-446667766.png}	USD
12	4	Plumbing Services	Fix leaks, unclog drains, replace faucets, install toilets and showers. All plumbing work guaranteed for 90 days.	Plumbing	Chicago, IL	110.00	/uploads/service-1781501415094-63044234.png	t	2026-06-11 11:57:57.340769	2026-06-15 12:30:15.116281	2	1	available	{/uploads/service-1781501415094-63044234.png,/uploads/service-1781501415098-679154114.png,/uploads/service-1781501415103-936902800.png}	USD
3	2	Painting & Touch-ups	Interior wall painting, touch-ups, and small paint jobs. Quality materials, clean finish, and no mess left behind.	Painting	New York, NY	120.00	/uploads/service-1781502127257-1630402.png	t	2026-06-11 11:57:57.320084	2026-06-15 12:42:07.276859	4	1	available	{/uploads/service-1781502127257-1630402.png,/uploads/service-1781502127261-9555511.png,/uploads/service-1781502127264-880532132.png,/uploads/service-1781502127267-120709895.png}	USD
1	2	General Home Repair	Fix anything in your home — leaky faucets, broken doors, drywall patching, furniture assembly and more. Fast, reliable, and affordable.	Repairing	New York, NY	75.00	/uploads/service-1781502426727-7327108.png	t	2026-06-11 11:57:57.309825	2026-06-15 12:54:58.84949	2	1	available	{/uploads/service-1781502426727-7327108.png,/uploads/service-1781502426734-560396349.png,/uploads/service-1781502426738-656429428.png,/uploads/service-1781502426742-713142701.png}	USD
\.


--
-- Data for Name: time_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.time_slots (id, service_id, slot_date, start_time, end_time, is_booked, max_capacity, booked_count, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, role, phone, location, avatar_url, bio, is_verified, is_active, created_at, updated_at, password_reset_token, password_reset_expires, account_type, gallery_urls) FROM stdin;
1	Admin	admin@servicehub.com	$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmKMKvmDcIU8EY6dATuHl5OxilQoGy	admin	\N	\N	\N	\N	t	t	2026-06-11 11:57:43.575932	2026-06-11 11:57:43.575932	\N	\N	freelancer	{}
4	David Chen	david.provider@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	provider	+1-555-0103	Chicago, IL	\N	Licensed electrician and plumber. Certified for all residential and commercial work.	t	t	2026-06-11 11:57:57.278109	2026-06-11 11:57:57.278109	\N	\N	freelancer	{}
7	Emily Davis	emily.davis@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0202	Santa Monica, CA	\N	\N	t	t	2026-06-11 11:57:57.286745	2026-06-11 11:57:57.286745	\N	\N	freelancer	{}
8	Michael Brown	michael.brown@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0203	Naperville, IL	\N	\N	t	t	2026-06-11 11:57:57.289908	2026-06-11 11:57:57.289908	\N	\N	freelancer	{}
9	Jessica Wilson	jessica.wilson@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0204	Sugar Land, TX	\N	\N	t	t	2026-06-11 11:57:57.29259	2026-06-11 11:57:57.29259	\N	\N	freelancer	{}
10	Chris Martinez	chris.martinez@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0205	Queens, NY	\N	\N	t	t	2026-06-11 11:57:57.294853	2026-06-11 11:57:57.294853	\N	\N	freelancer	{}
11	Ashley Taylor	ashley.taylor@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0206	Pasadena, CA	\N	\N	t	t	2026-06-11 11:57:57.297848	2026-06-11 11:57:57.297848	\N	\N	freelancer	{}
12	Ryan Anderson	ryan.anderson@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0207	Evanston, IL	\N	\N	t	t	2026-06-11 11:57:57.300856	2026-06-11 11:57:57.300856	\N	\N	freelancer	{}
13	Amanda Thomas	amanda.thomas@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0208	Austin, TX	\N	\N	t	t	2026-06-11 11:57:57.303346	2026-06-11 11:57:57.303346	\N	\N	freelancer	{}
14	Kevin Jackson	kevin.jackson@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0209	Manhattan, NY	\N	\N	t	t	2026-06-11 11:57:57.305679	2026-06-11 11:57:57.305679	\N	\N	freelancer	{}
15	Lauren White	lauren.white@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0210	San Diego, CA	\N	\N	t	t	2026-06-11 11:57:57.307966	2026-06-11 11:57:57.307966	\N	\N	freelancer	{}
16	Soe Ye Htut	soeyehtut584@gmail.com	$2b$10$CIqHIlY0xRolaLs3np0UZuek/3u6acKvZF9zeOHdnbUxmVQ8KsHw6	customer	0638247885	Bangkok	/uploads/avatar-1781505551662-708906744.jpg		f	t	2026-06-15 13:38:16.343633	2026-06-15 13:39:25.076275	105226	2026-06-15 14:07:55.291	freelancer	{}
5	Sarah Williams	sarah.provider@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	provider	+1-555-0104	Houston, TX	/uploads/avatar-1781499432843-338874388.png	Professional gardener and landscaper. Creating beautiful outdoor spaces since 2010.	t	t	2026-06-11 11:57:57.281537	2026-06-15 11:57:36.498226	\N	\N	business	{}
3	Maria Garcia	maria.provider@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	provider	+1-555-0102	Los Angeles, CA	/uploads/avatar-1781499864010-488503177.png	Expert cleaning specialist and home organizer. Passionate about creating spotless spaces.	t	t	2026-06-11 11:57:57.275907	2026-06-15 12:04:26.791236	\N	\N	business	{}
2	Alex Johnson	alex.provider@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	provider	+1-555-0101	New York, NY	/uploads/avatar-1781502782766-269286794.png	Professional handyman with 10 years of experience in home repairs and renovations.	t	t	2026-06-11 11:57:57.270756	2026-06-15 12:53:06.144909	\N	\N	freelancer	{}
6	John Smith	john.smith@example.com	$2b$10$V3bDpck8vlU/Ko92Sm19kOYv6kQLbaPRx/t8NbqTSN1SA7WmWQ95q	customer	+1-555-0201	Brooklyn, NY	/uploads/avatar-1781505291297-239313504.png		t	t	2026-06-11 11:57:57.284211	2026-06-15 13:34:52.708604	\N	\N	freelancer	{}
\.


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bookings_id_seq', 3, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 18, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 12, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 4, true);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reviews_id_seq', 1, false);


--
-- Name: service_blocked_dates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.service_blocked_dates_id_seq', 1, false);


--
-- Name: service_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.service_schedules_id_seq', 1, false);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.services_id_seq', 20, true);


--
-- Name: time_slots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.time_slots_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 16, true);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_customer_id_service_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_service_id_key UNIQUE (customer_id, service_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: service_blocked_dates service_blocked_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_blocked_dates
    ADD CONSTRAINT service_blocked_dates_pkey PRIMARY KEY (id);


--
-- Name: service_blocked_dates service_blocked_dates_service_id_blocked_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_blocked_dates
    ADD CONSTRAINT service_blocked_dates_service_id_blocked_date_key UNIQUE (service_id, blocked_date);


--
-- Name: service_schedules service_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_schedules
    ADD CONSTRAINT service_schedules_pkey PRIMARY KEY (id);


--
-- Name: service_schedules service_schedules_service_id_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_schedules
    ADD CONSTRAINT service_schedules_service_id_day_of_week_key UNIQUE (service_id, day_of_week);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: time_slots time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_pkey PRIMARY KEY (id);


--
-- Name: time_slots time_slots_service_id_slot_date_start_time_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_service_id_slot_date_start_time_key UNIQUE (service_id, slot_date, start_time);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_blocked_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_service ON public.service_blocked_dates USING btree (service_id, blocked_date);


--
-- Name: idx_bookings_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_customer ON public.bookings USING btree (customer_id);


--
-- Name: idx_bookings_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_service ON public.bookings USING btree (service_id);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_messages_conv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conv ON public.messages USING btree (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (receiver_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_payments_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_booking ON public.payments USING btree (booking_id);


--
-- Name: idx_reviews_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_customer ON public.reviews USING btree (customer_id);


--
-- Name: idx_reviews_flagged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_flagged ON public.reviews USING btree (is_flagged) WHERE (is_flagged = true);


--
-- Name: idx_reviews_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_service ON public.reviews USING btree (service_id);


--
-- Name: idx_schedules_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_service ON public.service_schedules USING btree (service_id);


--
-- Name: idx_services_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_category ON public.services USING btree (category);


--
-- Name: idx_services_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_location ON public.services USING btree (location);


--
-- Name: idx_services_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_provider ON public.services USING btree (provider_id);


--
-- Name: idx_timeslots_capacity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeslots_capacity ON public.time_slots USING btree (service_id, slot_date, booked_count, max_capacity);


--
-- Name: idx_timeslots_date_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeslots_date_service ON public.time_slots USING btree (slot_date, service_id);


--
-- Name: bookings bookings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_time_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_time_slot_id_fkey FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: services services_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict MKJwaDmDYy24FJ8uAnKbx3iN9bznUEufWlbH6qTIkDikxqylPW3iR2So9nrhNNe

