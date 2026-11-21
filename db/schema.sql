--
-- PostgreSQL database dump
--

\restrict 6S9MZfi1QCXLW05z1bh8sKPyYUYr81undfLqmeHd5pLSRc5EErscOHVpoBuFe9J

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    apellidos character varying(100),
    rut character varying(12),
    correo character varying(254) NOT NULL,
    telefono character varying(20),
    direccion character varying(200),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT clientes_correo_check CHECK ((((correo)::text = lower(btrim((correo)::text))) AND ((correo)::text <> ''::text))),
    CONSTRAINT clientes_nombre_check CHECK ((btrim((nombre)::text) <> ''::text))
);


--
-- Name: mascotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mascotas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    nombre character varying(100) NOT NULL,
    especie character varying(40) NOT NULL,
    raza character varying(100),
    sexo character varying(20) DEFAULT 'Desconocido'::character varying NOT NULL,
    fecha_nacimiento date,
    peso_kg numeric(7,3),
    color character varying(60),
    microchip character varying(50),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mascotas_especie_check CHECK ((btrim((especie)::text) <> ''::text)),
    CONSTRAINT mascotas_microchip_check CHECK (((microchip IS NULL) OR (btrim((microchip)::text) <> ''::text))),
    CONSTRAINT mascotas_nombre_check CHECK ((btrim((nombre)::text) <> ''::text)),
    CONSTRAINT mascotas_peso_kg_check CHECK (((peso_kg > (0)::numeric) AND (peso_kg < 'Infinity'::numeric))),
    CONSTRAINT mascotas_sexo_check CHECK (((sexo)::text = ANY ((ARRAY['Macho'::character varying, 'Hembra'::character varying, 'Desconocido'::character varying])::text[])))
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(100) NOT NULL,
    correo character varying(254) NOT NULL,
    contrasena_hash character varying(100) NOT NULL,
    rol character varying(20) DEFAULT 'cliente'::character varying NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cliente_id uuid,
    CONSTRAINT usuarios_correo_check CHECK ((((correo)::text = lower(btrim((correo)::text))) AND ((correo)::text <> ''::text))),
    CONSTRAINT usuarios_nombre_check CHECK ((btrim((nombre)::text) <> ''::text)),
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['cliente'::character varying, 'admin'::character varying, 'recepcion'::character varying, 'veterinario'::character varying, 'tecnico'::character varying])::text[])))
);


--
-- Name: clientes clientes_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_correo_key UNIQUE (correo);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_rut_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_rut_key UNIQUE (rut);


--
-- Name: mascotas mascotas_microchip_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mascotas
    ADD CONSTRAINT mascotas_microchip_key UNIQUE (microchip);


--
-- Name: mascotas mascotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mascotas
    ADD CONSTRAINT mascotas_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_cliente_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_cliente_id_key UNIQUE (cliente_id);


--
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_mascotas_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mascotas_cliente_id ON public.mascotas USING btree (cliente_id);


--
-- Name: mascotas mascotas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mascotas
    ADD CONSTRAINT mascotas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;


--
-- Name: usuarios usuarios_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 6S9MZfi1QCXLW05z1bh8sKPyYUYr81undfLqmeHd5pLSRc5EErscOHVpoBuFe9J

