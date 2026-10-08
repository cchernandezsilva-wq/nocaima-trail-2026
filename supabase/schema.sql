-- ====================================================================
-- ESQUEMA OFICIAL SUPABASE POSTGRESQL - NOCAIMA TRAIL 2026
-- ====================================================================

-- 1. EXTENSIÓN PARA GENERACIÓN DE IDENTIFICADORES UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA PRINCIPAL: INSCRIPCIONES
CREATE TABLE IF NOT EXISTS public.inscripciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referencia VARCHAR(40) UNIQUE NOT NULL,
    distancia VARCHAR(10) NOT NULL, -- '5k', '10k', '21k'
    
    -- Datos del atleta
    nombres VARCHAR(150) NOT NULL,
    tipo_documento VARCHAR(10) NOT NULL DEFAULT 'CC', -- 'CC', 'TI', 'CE', 'PASAPORTE'
    documento VARCHAR(30) NOT NULL,
    fecha_nacimiento DATE,
    es_menor_edad BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Datos del acudiente (si es menor de edad)
    nombre_acudiente VARCHAR(150),
    documento_acudiente VARCHAR(30),
    telefono_acudiente VARCHAR(30),
    parentesco_acudiente VARCHAR(50),
    
    -- Contacto y detalles
    email VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    genero VARCHAR(20) NOT NULL, -- 'Masculino', 'Femenino'
    categoria VARCHAR(60) NOT NULL,
    talla_camiseta VARCHAR(10) NOT NULL, -- 'S', 'M', 'L', 'XL'
    eps VARCHAR(100) NOT NULL,
    contacto_emergencia_nombre VARCHAR(150) NOT NULL,
    contacto_emergencia_telefono VARCHAR(30) NOT NULL,
    
    -- Desglose financiero (Pesos y centavos COP)
    precio_base_cop INTEGER NOT NULL,
    comision_wompi_cop INTEGER NOT NULL,
    total_pagar_cop INTEGER NOT NULL,
    total_centavos BIGINT NOT NULL,
    
    -- Estado de pago y datos Wompi
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'APROBADO', 'DECLINADO', 'ANULADO', 'EXPIRADO'
    transaccion_wompi_id VARCHAR(100),
    metodo_pago VARCHAR(50),
    dorsal INTEGER,
    
    -- Logística de entrega de kit el día de la carrera
    kit_entregado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_entrega_kit TIMESTAMP WITH TIME ZONE,
    
    -- Consentimientos legales
    acepta_reglamento BOOLEAN NOT NULL DEFAULT TRUE,
    acepta_datos_ley1581 BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Marcas de tiempo
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pagado_en TIMESTAMP WITH TIME ZONE
);

-- Índices para búsquedas ultrarrápidas
CREATE INDEX IF NOT EXISTS idx_inscripciones_referencia ON public.inscripciones(referencia);
CREATE INDEX IF NOT EXISTS idx_inscripciones_documento ON public.inscripciones(documento);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado ON public.inscripciones(estado_pago);
CREATE INDEX IF NOT EXISTS idx_inscripciones_distancia ON public.inscripciones(distancia);

-- 3. TABLA DE AUDITORÍA DE WEBHOOKS (IDEMPOTENCIA Y SEGURIDAD)
CREATE TABLE IF NOT EXISTS public.wompi_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id VARCHAR(100) UNIQUE,
    transaccion_id VARCHAR(100),
    referencia VARCHAR(50),
    estado VARCHAR(30),
    payload JSONB NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA DE CONFIGURACIÓN DE CUPOS POR DISTANCIA
CREATE TABLE IF NOT EXISTS public.cupos_carrera (
    distancia VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    cupo_maximo INTEGER NOT NULL DEFAULT 500,
    precio_preventa_cop INTEGER NOT NULL,
    dorsal_inicial INTEGER NOT NULL
);

-- Inicializar cupos y precios de Nocaima Trail 2026
INSERT INTO public.cupos_carrera (distancia, nombre, cupo_maximo, precio_preventa_cop, dorsal_inicial)
VALUES 
    ('5k', '5K Iniciación & Familiar', 350, 75000, 5001),
    ('10k', '10K Desafío Aventura', 500, 95000, 1001),
    ('21k', '21K Media Maratón Élite', 300, 125000, 2001)
ON CONFLICT (distancia) DO NOTHING;

-- 5. FUNCIÓN ATÓMICA PARA ASIGNACIÓN AUTOMÁTICA DE DORSAL
CREATE OR REPLACE FUNCTION public.asignar_dorsal_corredor(p_referencia TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_distancia TEXT;
    v_dorsal_base INTEGER;
    v_siguiente_dorsal INTEGER;
    v_dorsal_actual INTEGER;
BEGIN
    -- Obtener distancia y dorsal actual si ya lo tiene
    SELECT distancia, dorsal INTO v_distancia, v_dorsal_actual 
    FROM public.inscripciones 
    WHERE referencia = p_referencia;

    -- Si ya tiene dorsal asignado, devolverlo
    IF v_dorsal_actual IS NOT NULL THEN
        RETURN v_dorsal_actual;
    END IF;

    -- Obtener dorsal inicial y bloquear fila para evitar condiciones de carrera concurrentes
    SELECT dorsal_inicial INTO v_dorsal_base 
    FROM public.cupos_carrera 
    WHERE distancia = v_distancia
    FOR UPDATE;

    IF v_dorsal_base IS NULL THEN
        v_dorsal_base := 1000;
    END IF;

    -- Calcular siguiente dorsal disponible para esta distancia
    SELECT COALESCE(MAX(dorsal) + 1, v_dorsal_base)
    INTO v_siguiente_dorsal
    FROM public.inscripciones
    WHERE distancia = v_distancia AND dorsal IS NOT NULL;

    -- Actualizar el corredor
    UPDATE public.inscripciones
    SET dorsal = v_siguiente_dorsal,
        estado_pago = 'APROBADO',
        pagado_en = NOW(),
        actualizado_en = NOW()
    WHERE referencia = p_referencia;

    RETURN v_siguiente_dorsal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. SEGURIDAD: ROW LEVEL SECURITY (RLS)
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wompi_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupos_carrera ENABLE ROW LEVEL SECURITY;

-- Por seguridad estricta, solo el rol de servicio del Backend (service_role)
-- tiene permisos totales de inserción, actualización y lectura.
-- La llave anónima pública NO puede alterar datos directamente.
