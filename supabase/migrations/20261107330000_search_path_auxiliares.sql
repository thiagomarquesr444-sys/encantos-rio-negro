-- Alerta do Supabase (function_search_path_mutable): fixa search_path das funções auxiliares.
alter function public.eda_sobrepoe(public.eda_reservas_periodo, public.eda_reservas_periodo) set search_path = public;
alter function public.eda_valor_reserva(public.reservas) set search_path = public;
