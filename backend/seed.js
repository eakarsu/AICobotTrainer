require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    // Drop and create all tables
    await client.query(`
      DROP TABLE IF EXISTS ai_predictive_maintenance CASCADE;
      DROP TABLE IF EXISTS ai_nl_programming CASCADE;
      DROP TABLE IF EXISTS ai_anomaly_detection CASCADE;
      DROP TABLE IF EXISTS ai_task_optimization CASCADE;
      DROP TABLE IF EXISTS ai_safety_assessment CASCADE;
      DROP TABLE IF EXISTS ai_quality_analysis CASCADE;
      DROP TABLE IF EXISTS ai_motion_planning CASCADE;
      DROP TABLE IF EXISTS work_cells CASCADE;
      DROP TABLE IF EXISTS tool_configs CASCADE;
      DROP TABLE IF EXISTS waypoints CASCADE;
      DROP TABLE IF EXISTS demonstrations CASCADE;
      DROP TABLE IF EXISTS quality_checkpoints CASCADE;
      DROP TABLE IF EXISTS safety_boundaries CASCADE;
      DROP TABLE IF EXISTS task_sequences CASCADE;
      DROP TABLE IF EXISTS programs CASCADE;

      CREATE TABLE programs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'general',
        status VARCHAR(50) DEFAULT 'draft',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE task_sequences (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        steps JSONB DEFAULT '[]',
        program_id INTEGER,
        priority INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE safety_boundaries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        zone_type VARCHAR(50) DEFAULT 'restricted',
        coordinates JSONB DEFAULT '{}',
        max_speed DECIMAL(10,2),
        max_force DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE quality_checkpoints (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        inspection_type VARCHAR(50) DEFAULT 'visual',
        tolerance DECIMAL(10,4),
        measurement_unit VARCHAR(20) DEFAULT 'mm',
        pass_criteria TEXT,
        program_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE demonstrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        program_id INTEGER,
        duration_seconds DECIMAL(10,2) DEFAULT 0,
        waypoint_count INTEGER DEFAULT 0,
        recording_data JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'recorded',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE waypoints (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        x DECIMAL(10,3) DEFAULT 0,
        y DECIMAL(10,3) DEFAULT 0,
        z DECIMAL(10,3) DEFAULT 0,
        rx DECIMAL(10,3) DEFAULT 0,
        ry DECIMAL(10,3) DEFAULT 0,
        rz DECIMAL(10,3) DEFAULT 0,
        speed DECIMAL(10,2) DEFAULT 100,
        program_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE tool_configs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tool_type VARCHAR(50) DEFAULT 'gripper',
        payload_kg DECIMAL(10,2) DEFAULT 0,
        tcp_offset JSONB DEFAULT '{}',
        grip_force DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE work_cells (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        dimensions JSONB DEFAULT '{}',
        robot_model VARCHAR(100),
        max_reach_mm DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE ai_motion_planning (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_point JSONB DEFAULT '{}',
        end_point JSONB DEFAULT '{}',
        constraints JSONB DEFAULT '{}',
        ai_generated_path JSONB,
        optimization_score DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE ai_quality_analysis (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checkpoint_id INTEGER,
        measurement_data JSONB DEFAULT '{}',
        ai_analysis JSONB,
        confidence_score DECIMAL(5,4) DEFAULT 0,
        recommendation TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE ai_safety_assessment (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        boundary_id INTEGER,
        scenario_description TEXT,
        ai_assessment JSONB,
        risk_level VARCHAR(20) DEFAULT 'medium',
        mitigation_steps JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE ai_task_optimization (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        original_sequence JSONB DEFAULT '[]',
        ai_optimized_sequence JSONB,
        improvement_percentage DECIMAL(5,2) DEFAULT 0,
        optimization_type VARCHAR(50) DEFAULT 'time',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE ai_anomaly_detection (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sensor_data JSONB DEFAULT '{}',
        ai_detected_anomalies JSONB,
        severity VARCHAR(20) DEFAULT 'low',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE ai_nl_programming (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        natural_language_input TEXT,
        ai_generated_code TEXT,
        ai_explanation TEXT,
        program_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE ai_predictive_maintenance (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        component VARCHAR(255),
        operational_hours DECIMAL(10,2) DEFAULT 0,
        sensor_readings JSONB DEFAULT '{}',
        ai_prediction JSONB,
        next_maintenance_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Tables created. Seeding data...');

    // 1. Programs (15 items)
    const programTypes = ['pick_and_place', 'welding', 'assembly', 'painting', 'inspection', 'palletizing', 'polishing', 'dispensing'];
    const programStatuses = ['active', 'draft', 'testing', 'archived'];
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO programs (name, description, type, status, created_by) VALUES ($1, $2, $3, $4, $5)',
        [
          ['Pick & Place - Electronics Assembly', 'Arc Welding - Chassis Frame', 'Screw Driving - PCB Board', 'Spray Painting - Body Panel', 'Vision Inspection - Connector Quality', 'Palletizing - Carton Stacking', 'Surface Polishing - Metal Housing', 'Adhesive Dispensing - Windshield', 'Bin Picking - Mixed Parts', 'Machine Tending - CNC Lathe', 'Deburring - Cast Aluminum', 'Riveting - Fuselage Section', 'Laser Cutting - Sheet Metal', 'Cable Routing - Harness Assembly', 'Quality Sorting - Defect Separation'][i-1],
          'Automated ' + ['electronic component placement on PCB boards', 'MIG welding for automotive chassis frames', 'precision screw insertion for circuit boards', 'uniform coating application for vehicle body panels', 'camera-based quality inspection for connectors', 'end-of-line carton palletizing operations', 'automated surface finishing for housings', 'precision adhesive application for windshields', 'random bin picking with 3D vision', 'automated part loading/unloading for CNC', 'edge finishing on cast aluminum parts', 'automated riveting for aerospace structures', 'precision laser cutting operations', 'flexible cable routing and assembly', 'AI-powered defect classification and sorting'][i-1],
          programTypes[(i-1) % programTypes.length],
          programStatuses[(i-1) % programStatuses.length],
          ['Admin', 'J. Smith', 'M. Chen', 'K. Patel'][i % 4]
        ]
      );
    }

    // 2. Task Sequences (15 items)
    for (let i = 1; i <= 15; i++) {
      const steps = Array.from({length: 3 + (i % 4)}, (_, j) => ({
        step: j + 1,
        action: ['move_to', 'grip', 'move_linear', 'release', 'wait', 'inspect', 'weld'][j % 7],
        target: `waypoint_${j + 1}`,
        speed: 50 + (j * 20),
        duration_ms: 500 + (j * 200)
      }));
      await client.query(
        'INSERT INTO task_sequences (name, steps, program_id, priority, status) VALUES ($1, $2, $3, $4, $5)',
        [
          ['Main Assembly Sequence', 'Welding Path A', 'Part Pickup Routine', 'Inspection Cycle', 'Palletize Row', 'Tool Change Sequence', 'Home Position Return', 'Emergency Retract', 'Pre-weld Alignment', 'Surface Scan Path', 'Multi-grip Pickup', 'Tray Loading Pattern', 'Deburr Edge Path', 'Adhesive Bead Pattern', 'Quality Check Loop'][i-1],
          JSON.stringify(steps),
          ((i - 1) % 15) + 1,
          i % 5 + 1,
          ['active', 'draft', 'testing', 'active', 'archived'][i % 5]
        ]
      );
    }

    // 3. Safety Boundaries (15 items)
    const zoneTypes = ['restricted', 'warning', 'collaborative', 'exclusion', 'reduced_speed'];
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO safety_boundaries (name, zone_type, coordinates, max_speed, max_force, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          ['Operator Workspace Zone', 'Conveyor Approach Area', 'Tool Change Safe Zone', 'Emergency Stop Boundary', 'Collaborative Handoff Zone', 'Material Feed Perimeter', 'Vision Camera Keep-Out', 'Electrical Panel Buffer', 'Weld Spatter Shield Zone', 'Paint Booth Boundary', 'Loading Dock Perimeter', 'Maintenance Access Area', 'AGV Crossing Zone', 'High-Speed Work Envelope', 'Quality Station Buffer'][i-1],
          zoneTypes[(i-1) % zoneTypes.length],
          JSON.stringify({
            min: { x: -500 + (i * 100), y: -300 + (i * 50), z: 0 },
            max: { x: 500 + (i * 100), y: 300 + (i * 50), z: 800 + (i * 30) }
          }),
          150 + (i * 30),
          50 + (i * 10),
          i % 4 !== 0
        ]
      );
    }

    // 4. Quality Checkpoints (15 items)
    const inspectionTypes = ['visual', 'dimensional', 'force', 'torque', 'surface'];
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO quality_checkpoints (name, inspection_type, tolerance, measurement_unit, pass_criteria, program_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          ['Weld Bead Width Check', 'Component Placement Accuracy', 'Screw Torque Verification', 'Paint Thickness Measurement', 'Surface Roughness Test', 'Gap Measurement - Panel Fit', 'Rivet Head Height Check', 'Adhesive Bead Continuity', 'Pin Insertion Force Test', 'Label Position Verification', 'Solder Joint Inspection', 'Hole Diameter Check', 'Flatness Measurement', 'Edge Chamfer Angle', 'Assembly Alignment Check'][i-1],
          inspectionTypes[(i-1) % inspectionTypes.length],
          0.01 * (i + 1),
          ['mm', 'Nm', 'um', 'N', 'degrees'][(i-1) % 5],
          ['Within ±0.05mm', 'Torque 2.5-3.0 Nm', 'Ra < 1.6um', 'Force 10-15N', 'Angle 44-46°'][(i-1) % 5],
          ((i - 1) % 15) + 1
        ]
      );
    }

    // 5. Demonstrations (15 items)
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO demonstrations (name, program_id, duration_seconds, waypoint_count, recording_data, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          ['Pick Place Demo - Resistors', 'Weld Seam Trace - Left Rail', 'Screw Drive Demo - Board v2', 'Paint Stroke Demo - Hood', 'Inspection Path Demo - Row A', 'Pallet Stack Demo - Layer 1', 'Polish Circle Demo - Cover', 'Glue Bead Demo - Frame', 'Bin Pick Demo - Bolts', 'CNC Load Demo - Shaft', 'Deburr Demo - Casting Edge', 'Rivet Demo - Panel Joint', 'Laser Cut Demo - Bracket', 'Cable Route Demo - Harness A', 'Sort Demo - Pass/Fail'][i-1],
          ((i - 1) % 15) + 1,
          10 + (i * 3.5),
          5 + (i * 2),
          JSON.stringify({
            frames: 30 * (10 + i * 3),
            format: 'joint_angles',
            joints: 6,
            sample_rate_hz: 30
          }),
          ['recorded', 'validated', 'processing', 'ready', 'archived'][(i-1) % 5]
        ]
      );
    }

    // 6. Waypoints (15 items)
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO waypoints (name, x, y, z, rx, ry, rz, speed, program_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [
          ['Home Position', 'Conveyor Pickup Point', 'PCB Place Position A1', 'Weld Start Point', 'Weld End Point', 'Tool Change Station', 'Camera Inspection Pose', 'Pallet Corner Origin', 'Paint Start Position', 'Safe Retract Height', 'Bin Approach Point', 'CNC Door Position', 'Deburr Start Edge', 'Adhesive Start Point', 'Quality Check Pose'][i-1],
          -200 + (i * 50.5),
          -150 + (i * 35.2),
          100 + (i * 25.8),
          (i * 15.0) % 360,
          (i * 10.0) % 180,
          (i * 22.5) % 360,
          50 + (i * 20),
          ((i - 1) % 15) + 1
        ]
      );
    }

    // 7. Tool Configurations (15 items)
    const toolTypes = ['gripper', 'vacuum', 'welding_torch', 'spray_gun', 'screwdriver', 'camera', 'force_sensor', 'deburring'];
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO tool_configs (name, tool_type, payload_kg, tcp_offset, grip_force, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          ['Parallel Gripper 40mm', 'Vacuum Cup Array 4x', 'MIG Welding Torch', 'HVLP Spray Gun', 'Electric Screwdriver M3', '2D Vision Camera', 'Force/Torque Sensor FT300', 'Pneumatic Deburring Tool', 'Magnetic Gripper', 'Suction Cup Single 80mm', 'TIG Welding Torch', 'Dispensing Needle 18G', 'Laser Pointer Tool', 'Soft Gripper - Flexible', 'Rivet Gun Pneumatic'][i-1],
          toolTypes[(i-1) % toolTypes.length],
          0.5 + (i * 0.3),
          JSON.stringify({ x: 0, y: 0, z: 50 + (i * 10), rx: 0, ry: 0, rz: i * 5 }),
          10 + (i * 5),
          i % 5 !== 0
        ]
      );
    }

    // 8. Work Cells (15 items)
    const robotModels = ['UR5e', 'UR10e', 'UR16e', 'FANUC CRX-10iA', 'KUKA LBR iiwa', 'ABB YuMi', 'Doosan M1013'];
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO work_cells (name, description, dimensions, robot_model, max_reach_mm, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          ['Electronics Assembly Cell A', 'Welding Station 1', 'PCB Screw Cell B', 'Paint Booth East', 'Vision QC Station', 'Palletizing Cell 1', 'Polish & Finish Bay', 'Adhesive Application Cell', 'Random Bin Pick Cell', 'CNC Tending Cell North', 'Deburring Station 3', 'Riveting Cell Aero', 'Laser Processing Cell', 'Wire Harness Assembly', 'Sort & Classify Station'][i-1],
          'Automated ' + ['SMT component assembly', 'arc welding', 'fastening operations', 'spray coating', 'quality inspection', 'end-of-line palletizing', 'surface finishing', 'adhesive dispensing', 'bin picking with AI vision', 'CNC machine tending', 'edge finishing', 'riveting operations', 'laser material processing', 'cable harness assembly', 'AI-powered part sorting'][i-1] + ' workstation',
          JSON.stringify({ length_mm: 2000 + (i * 200), width_mm: 1500 + (i * 100), height_mm: 2500 }),
          robotModels[(i-1) % robotModels.length],
          850 + (i * 30),
          ['active', 'active', 'maintenance', 'active', 'commissioning'][(i-1) % 5]
        ]
      );
    }

    // 9. AI Motion Planning (15 items)
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO ai_motion_planning (name, start_point, end_point, constraints, ai_generated_path, optimization_score) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          ['Pick to Place Linear Path', 'Weld Seam Arc Motion', 'Conveyor Tracking Path', 'Obstacle Avoidance Route', 'Multi-Point Scan Path', 'Spiral Polish Motion', 'S-Curve Dispensing Path', 'Vertical Stack Approach', 'Tray Grid Pattern', 'Circle Weld Path', 'Zigzag Paint Coverage', 'Clearance Retract Path', 'Approach and Insert Path', 'Dual-Arm Handoff Path', 'High-Speed Sort Path'][i-1],
          JSON.stringify({ x: -100 + (i * 20), y: 200, z: 150 + (i * 10), rx: 0, ry: 90, rz: 0 }),
          JSON.stringify({ x: 300 + (i * 15), y: -100 + (i * 10), z: 50 + (i * 5), rx: 0, ry: 90, rz: 45 }),
          JSON.stringify({ max_velocity: 500 + (i * 50), max_acceleration: 200 + (i * 30), avoid_singularity: true }),
          JSON.stringify({ path_points: Array.from({length: 5}, (_, j) => ({ x: i * 20 + j * 50, y: 100 + j * 30, z: 150 - j * 10 })), total_distance_mm: 500 + (i * 40), collision_risk: 'low' }),
          70 + (i * 1.5)
        ]
      );
    }

    // 10. AI Quality Analysis (15 items)
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO ai_quality_analysis (name, checkpoint_id, measurement_data, ai_analysis, confidence_score, recommendation) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          ['Weld Bead Analysis Batch 42', 'Component XY Offset Study', 'Torque Distribution Report', 'Coating Thickness Map', 'Surface Finish Profile', 'Gap Variation Analysis', 'Rivet Strength Assessment', 'Adhesive Coverage Report', 'Insertion Force Curve', 'Label Accuracy Report', 'Solder Void Analysis', 'Bore Diameter Statistics', 'Flatness Heat Map', 'Chamfer Consistency Check', 'Assembly Fit Analysis'][i-1],
          ((i - 1) % 15) + 1,
          JSON.stringify({ measurements: Array.from({length: 10}, (_, j) => ({ value: 2.5 + Math.sin(j + i) * 0.1, position: j })), unit: 'mm', batch_size: 50, temperature_c: 22 + i * 0.5 }),
          JSON.stringify({ overall_quality: ['excellent', 'good', 'acceptable', 'good', 'excellent'][(i-1) % 5], defect_probability: 0.02 * i, process_capability: 1.2 + i * 0.05 }),
          0.80 + (i * 0.01),
          ['Maintain current parameters', 'Adjust tool offset by -0.02mm', 'Replace worn insert', 'Increase dwell time 50ms', 'Calibrate force sensor', 'Clean vacuum cups', 'Check torch tip wear', 'Verify adhesive viscosity', 'Re-teach pickup point', 'Update vision template', 'Increase solder paste', 'Hone bore to spec', 'Level fixture base', 'Sharpen chamfer tool', 'Tighten alignment pins'][i-1]
        ]
      );
    }

    // 11. AI Safety Assessment (15 items)
    const riskLevels = ['low', 'medium', 'high', 'critical', 'negligible'];
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO ai_safety_assessment (name, boundary_id, scenario_description, ai_assessment, risk_level, mitigation_steps) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          ['Operator Proximity Risk', 'Conveyor Collision Scenario', 'Tool Change Pinch Hazard', 'E-Stop Response Analysis', 'Collaborative Handover Risk', 'Material Feed Jam Risk', 'Camera Obstruction Hazard', 'Electrical Arc Flash Risk', 'Weld Fume Exposure', 'Paint VOC Exposure', 'Loading Ergonomic Risk', 'Maintenance Lockout Review', 'AGV Path Crossing Risk', 'High-Speed Envelope Breach', 'Dropped Part Hazard'][i-1],
          ((i - 1) % 15) + 1,
          ['Operator enters collaborative zone during pick-and-place', 'Robot arm moves toward conveyor without object detection', 'Gripper opens during tool change near operator hand', 'E-stop pressed while robot at max velocity', 'Human-robot part handover with insufficient force limiting', 'Material feeder jams causing unexpected robot stop', 'Camera mount blocks robot return-to-home path', 'Welding near exposed electrical connections', 'Extended welding in poorly ventilated area', 'Spray painting without proper extraction running', 'Manual loading into cell during auto cycle', 'Maintenance entry without lockout verification', 'Robot path crosses AGV transit route', 'Robot operates at full speed near cell perimeter', 'Gripper loses part at maximum height'][i-1],
          JSON.stringify({ risk_score: 20 + (i * 5), hazard_category: 'mechanical', iso_compliance: true }),
          riskLevels[(i-1) % riskLevels.length],
          JSON.stringify(['Install light curtain', 'Add presence detection sensor', 'Implement speed reduction zone', 'Regular safety system audit'].slice(0, (i % 4) + 1))
        ]
      );
    }

    // 12. AI Task Optimization (15 items)
    const optTypes = ['time', 'energy', 'quality', 'throughput', 'wear'];
    for (let i = 1; i <= 15; i++) {
      const origSeq = Array.from({length: 4 + (i % 3)}, (_, j) => ({
        step: j + 1,
        task: ['approach', 'grip', 'lift', 'move', 'place', 'retract', 'wait'][j % 7],
        duration_s: 1.5 + j * 0.8
      }));
      await client.query(
        'INSERT INTO ai_task_optimization (name, original_sequence, ai_optimized_sequence, improvement_percentage, optimization_type) VALUES ($1, $2, $3, $4, $5)',
        [
          ['Assembly Cycle Time Reduction', 'Welding Path Shortening', 'Pick Rate Improvement', 'Painting Overlap Minimization', 'Inspection Throughput Boost', 'Pallet Pattern Optimization', 'Polish Dwell Balancing', 'Adhesive Volume Optimization', 'Bin Pick Success Rate', 'CNC Load/Unload Overlap', 'Deburr Pass Reduction', 'Rivet Sequence Reorder', 'Laser Power Optimization', 'Cable Route Simplification', 'Sort Speed Enhancement'][i-1],
          JSON.stringify(origSeq),
          JSON.stringify({ optimized: true, steps: origSeq.map(s => ({...s, duration_s: s.duration_s * 0.85})) }),
          5 + (i * 2.1),
          optTypes[(i-1) % optTypes.length]
        ]
      );
    }

    // 13. AI Anomaly Detection (15 items)
    const severities = ['low', 'medium', 'high', 'critical', 'low'];
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO ai_anomaly_detection (name, sensor_data, ai_detected_anomalies, severity) VALUES ($1, $2, $3, $4)',
        [
          ['Joint 1 Vibration Spike', 'Motor 3 Current Anomaly', 'Gripper Force Irregularity', 'Weld Current Fluctuation', 'Paint Pressure Drop', 'Conveyor Speed Variance', 'Temperature Drift Joint 4', 'Vacuum Loss Event', 'Encoder Position Error', 'Torque Overload Alert', 'Vision Calibration Drift', 'Pneumatic Leak Detection', 'Servo Following Error', 'Coolant Flow Reduction', 'Power Supply Ripple'][i-1],
          JSON.stringify({
            temperature_c: Array.from({length: 20}, (_, j) => 35 + Math.sin(j * 0.5 + i) * 5 + (j === 15 ? i * 2 : 0)),
            vibration_mm_s: Array.from({length: 20}, (_, j) => 0.5 + Math.random() * 0.3 + (j === 12 ? i * 0.5 : 0)),
            current_a: Array.from({length: 20}, (_, j) => 2.0 + Math.sin(j * 0.3) * 0.2)
          }),
          JSON.stringify({ anomalies_found: (i % 3) + 1, overall_health: 100 - i * 3 }),
          severities[(i-1) % severities.length]
        ]
      );
    }

    // 14. AI NL Programming (15 items)
    for (let i = 1; i <= 15; i++) {
      await client.query(
        'INSERT INTO ai_nl_programming (name, natural_language_input, ai_generated_code, ai_explanation, program_id) VALUES ($1, $2, $3, $4, $5)',
        [
          ['Pick Red Part from Bin', 'Weld Along Left Seam', 'Stack Three Boxes', 'Inspect Top Surface', 'Apply Glue in Circle', 'Sort Parts by Color', 'Tighten All Four Screws', 'Move to Home Position', 'Scan Barcode on Box', 'Load Part into Lathe', 'Polish in Spiral Pattern', 'Place Parts in Tray Grid', 'Follow Edge for Deburring', 'Dispense Adhesive Line', 'Pick and Weigh Component'][i-1],
          ['Pick up the red part from the bin and place it on the conveyor', 'Weld a continuous bead along the left seam of the chassis', 'Stack three boxes on top of each other on the pallet', 'Move camera over the top surface and check for defects', 'Apply a circular bead of glue around the window frame', 'Use the camera to identify part color and sort into correct bin', 'Drive all four M4 screws in the corner pattern to 2.5 Nm', 'Return the robot to its safe home position', 'Position scanner over barcode and read the label', 'Pick the shaft from conveyor and load into CNC chuck', 'Polish the surface using a spiral motion from center outward', 'Place 12 parts in a 3x4 grid pattern in the output tray', 'Trace along the casting edge to remove burrs', 'Dispense a 200mm straight line of adhesive', 'Pick the component, move to scale, record weight, place in bin'][i-1],
          `# Auto-generated robot program\ndef task_${i}():\n    robot.move_to(home_position)\n    robot.set_speed(${50 + i * 10})\n    robot.grip()\n    robot.move_linear(target_${i})\n    robot.release()\n    return True`,
          `This program ${['picks a part using vision guidance', 'traces a weld path with torch control', 'performs stacking with height tracking', 'runs a surface inspection scan', 'follows a circular dispensing path', 'uses AI vision for color classification', 'drives screws in a pattern', 'returns to calibrated home pose', 'reads barcodes for traceability', 'loads parts with force control', 'executes spiral tool path', 'places parts in grid pattern', 'follows edge contour adaptively', 'dispenses controlled adhesive bead', 'integrates scale measurement'][i-1]}.`,
          ((i - 1) % 15) + 1
        ]
      );
    }

    // 15. AI Predictive Maintenance (15 items)
    for (let i = 1; i <= 15; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (i * 10 + 5));
      await client.query(
        'INSERT INTO ai_predictive_maintenance (name, component, operational_hours, sensor_readings, ai_prediction, next_maintenance_date) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          ['Joint 1 Servo Health', 'Joint 2 Gearbox Wear', 'Joint 3 Brake Check', 'Joint 4 Encoder Status', 'Joint 5 Belt Tension', 'Joint 6 Bearing Wear', 'Gripper Cylinder Life', 'Welding Tip Wear', 'Vacuum Pump Hours', 'Controller Fan RPM', 'Cable Flex Cycles', 'Teach Pendant Battery', 'Coolant Filter Status', 'Pneumatic Valve Cycles', 'Safety Relay Contact Wear'][i-1],
          ['Servo Motor J1', 'Harmonic Drive J2', 'Electromagnetic Brake J3', 'Absolute Encoder J4', 'Timing Belt J5', 'Bearing Assembly J6', 'Pneumatic Cylinder', 'Welding Contact Tip', 'Vacuum Pump', 'Controller Cooling Fan', 'Robot Dress Pack Cable', 'Teach Pendant Li-Ion Battery', 'Coolant Filter Element', 'Solenoid Valve', 'Safety Relay Module'][i-1],
          500 + (i * 350),
          JSON.stringify({
            temperature_c: Array.from({length: 10}, (_, j) => 40 + i * 1.5 + j * 0.3),
            vibration_mm_s: Array.from({length: 10}, (_, j) => 0.3 + i * 0.05 + j * 0.02),
            current_a: Array.from({length: 10}, (_, j) => 1.5 + i * 0.1)
          }),
          JSON.stringify({
            remaining_life_percent: Math.max(5, 95 - i * 6),
            wear_level: ['new', 'good', 'good', 'moderate', 'moderate', 'worn', 'worn', 'worn', 'critical', 'good', 'moderate', 'good', 'worn', 'moderate', 'good'][i-1],
            failure_risk: (i * 0.04).toFixed(2)
          }),
          futureDate.toISOString().split('T')[0]
        ]
      );
    }

    console.log('Database seeded successfully! 15 items per table, 15 tables = 225 total records.');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => { console.log('Done!'); process.exit(0); })
  .catch((err) => { console.error('Failed:', err); process.exit(1); });
