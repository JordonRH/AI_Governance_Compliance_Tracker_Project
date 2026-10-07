CREATE OR REPLACE FUNCTION aitrace_capture_history() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE organisation text; record_id text; record_value jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN organisation := OLD.organization_id; record_id := OLD.id; record_value := to_jsonb(OLD);
  ELSE organisation := NEW.organization_id; record_id := NEW.id; record_value := to_jsonb(NEW); END IF;
  INSERT INTO reporting_history(organization_id,entity,record_id,record_json,recorded_at,deleted)
  VALUES (organisation,TG_TABLE_NAME,record_id,record_value,clock_timestamp(),TG_OP='DELETE');
  RETURN COALESCE(NEW,OLD);
END; $$;

CREATE OR REPLACE FUNCTION aitrace_capture_organization() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO reporting_coverage(organization_id,started_at) VALUES (NEW.id,clock_timestamp()) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

INSERT INTO schema_migrations(version) VALUES (14) ON CONFLICT DO NOTHING;
