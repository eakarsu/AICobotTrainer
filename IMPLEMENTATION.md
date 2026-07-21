# Governed cobot observation workflow

`/api/governed-operations` verifies Ed25519-signed, monotonically sequenced device telemetry; pins reviewed inspection logic; records traceable detections; enforces operator/safety-review transitions; and preserves explicit overrides. The API never emits PLC, robot, or motion commands. Approved interventions remain records until a separately certified industrial adapter and safety controller are provided.

Run `scripts/bootstrap.sh`, configure `.env`, run `scripts/migrate.sh`, then `start.sh`. Startup is non-destructive. The legacy demo seed is destructive and requires an explicit disposable-database confirmation. Generated gap routes are unmounted.

PLC/MES/QMS, camera/edge, OPC-UA/MQTT, work-order and labeling integrations; plant data; hardware fail-safe tests; hazard/defect evaluation; worker consultation; machinery risk assessment; and certified safety validation remain external blockers.
