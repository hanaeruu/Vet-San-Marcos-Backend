-- Catálogo de servicios y citas. Ejecutar después de schema.sql.
-- Los datos iniciales son ficticios.

CREATE TABLE IF NOT EXISTS public.servicios (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre character varying(100) NOT NULL UNIQUE,
    descripcion character varying(500),
    precio numeric(12,2) NOT NULL CHECK (precio >= 0),
    duracion_min integer NOT NULL CHECK (duracion_min BETWEEN 5 AND 480),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT servicios_nombre_check CHECK (btrim(nombre) <> '')
);

CREATE TABLE IF NOT EXISTS public.citas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    mascota_id uuid NOT NULL REFERENCES public.mascotas(id) ON DELETE RESTRICT,
    servicio_id uuid NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
    veterinario_id uuid REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    fecha_hora timestamp with time zone NOT NULL,
    motivo character varying(500),
    precio numeric(12,2) NOT NULL CHECK (precio >= 0),
    estado character varying(20) DEFAULT 'pendiente' NOT NULL
        CHECK (estado IN ('pendiente', 'confirmada', 'atendida', 'cancelada')),
    creado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_citas_cliente_id ON public.citas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_veterinario_fecha ON public.citas (veterinario_id, fecha_hora);

-- Un veterinario no puede tener dos citas vigentes a la misma hora
CREATE UNIQUE INDEX IF NOT EXISTS citas_veterinario_hora_unica
    ON public.citas (veterinario_id, fecha_hora)
    WHERE veterinario_id IS NOT NULL AND estado IN ('pendiente', 'confirmada');

GRANT SELECT, INSERT ON public.mascotas TO vet_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicios TO vet_app;
GRANT SELECT, INSERT, UPDATE ON public.citas TO vet_app;

INSERT INTO public.servicios (nombre, descripcion, precio, duracion_min) VALUES
    ('Consulta general', 'Revisión clínica general de la mascota', 15000, 30),
    ('Vacunación', 'Aplicación de vacuna según calendario', 20000, 20),
    ('Desparasitación', 'Tratamiento antiparasitario', 12000, 15),
    ('Control de peso', 'Pesaje y recomendaciones de alimentación', 8000, 15)
ON CONFLICT (nombre) DO NOTHING;
