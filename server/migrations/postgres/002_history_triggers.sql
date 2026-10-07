CREATE OR REPLACE FUNCTION aitrace_capture_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  organisation text;
  record_id text;
  record_value jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    organisation := OLD.organization_id;
    record_id := OLD.id;
    record_value := to_jsonb(OLD);
  ELSE
    organisation := NEW.organization_id;
    record_id := NEW.id;
    record_value := to_jsonb(NEW);
  END IF;
  INSERT INTO reporting_history(organization_id, entity, record_id, record_json, recorded_at, deleted)
  VALUES (organisation, TG_TABLE_NAME, record_id, record_value, clock_timestamp(), TG_OP = 'DELETE');
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION aitrace_capture_organization() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO reporting_coverage(organization_id, started_at) VALUES (NEW.id, clock_timestamp()) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

INSERT INTO reporting_coverage(organization_id, started_at)
SELECT id, clock_timestamp() FROM organizations ON CONFLICT DO NOTHING;

DROP TRIGGER IF EXISTS reporting_new_organization ON organizations;
CREATE TRIGGER reporting_new_organization AFTER INSERT ON organizations FOR EACH ROW EXECUTE FUNCTION aitrace_capture_organization();

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['ai_uses','assessments','governance_actions','policies'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS reporting_%s ON %I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER reporting_%s AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION aitrace_capture_history()', table_name, table_name);
  END LOOP;
END;
$$;

INSERT INTO schema_migrations(version) VALUES (13) ON CONFLICT DO NOTHING;
