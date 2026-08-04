-- Every "Add Equipment" click in RoomCard/MasterAddEquipmentForm always
-- includes daily_rate in the payload, but the column never existed —
-- PostgREST rejected the whole insert, and since createReq's useMutation
-- has no onError handler, it failed completely silently (looked like
-- clicking an item just did nothing). QuoteBuilder.jsx already reads
-- req.daily_rate to preserve pricing at time of request when building
-- quote line items, confirming this is a real, needed field.

alter table public.show_requirements
  add column if not exists daily_rate numeric;
