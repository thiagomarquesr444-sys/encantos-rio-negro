-- ERN: descrição obrigatória nas imagens das publicações.
-- Aplicado e validado manualmente no Supabase em 2026-10-21.
-- Este arquivo registra somente esta alteração, não todo o banco.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.publicacao_midias'::regclass
          AND conname = 'publicacao_midias_imagem_alt_obrigatorio_ern'
    ) THEN
        ALTER TABLE public.publicacao_midias
        ADD CONSTRAINT publicacao_midias_imagem_alt_obrigatorio_ern
        CHECK (
            tipo <> 'imagem'
            OR (
                alt_text IS NOT NULL
                AND alt_text ~ '[^[:space:]]'
            )
        ) NOT VALID;
    END IF;
END;
$$;

ALTER TABLE public.publicacao_midias
VALIDATE CONSTRAINT publicacao_midias_imagem_alt_obrigatorio_ern;

COMMIT;