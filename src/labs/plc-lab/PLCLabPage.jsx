import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PLCLadderSim from './plc/PLCLadderSim.jsx';

// ─── Lab Exercises ─────────────────────────────────────────────────────────

const EXERCISES = [
  {
    id: 'start-stop',
    title: 'Motor Start/Stop',
    level: 'Beginner',
    color: '#10b981',
    objective: 'Classic 3-wire motor start circuit: momentary Start latches the motor run coil; momentary Stop breaks the seal. The motor keeps running after Start is released.',
    concepts: ['XIC', 'XIO', 'OTE', 'Seal-in circuit', 'Parallel branch'],
    challenge: 'Press START_PB to start the motor. Release — motor stays running (seal-in). Press STOP_PB to stop. Notice the parallel MOTOR_RUN branch keeps the rung energized.',
    program: [
      [
        { type: 'BRANCH', branches: [
          [{ type: 'XIC', tag: 'START_PB', label: 'Start PB' }],
          [{ type: 'XIC', tag: 'MOTOR_RUN', label: 'Seal-in' }],
        ]},
        { type: 'XIC', tag: 'STOP_PB', label: 'Stop PB (NC)' },
        { type: 'OTE', tag: 'MOTOR_RUN', label: 'Motor Run' },
      ],
      [
        { type: 'XIC', tag: 'MOTOR_RUN', label: 'Motor Run' },
        { type: 'OTE', tag: 'GREEN_LIGHT', label: 'Green Light' },
      ],
      [
        { type: 'XIO', tag: 'MOTOR_RUN', label: 'Motor Run' },
        { type: 'OTE', tag: 'RED_LIGHT', label: 'Red Light' },
      ],
    ],
    tags: {
      START_PB: { type: 'BOOL', value: false },
      STOP_PB: { type: 'BOOL', value: true },
      MOTOR_RUN: { type: 'BOOL', value: false },
      GREEN_LIGHT: { type: 'BOOL', value: false },
      RED_LIGHT: { type: 'BOOL', value: false },
    },
    inputs: [
      { tag: 'START_PB', label: 'START PB (NO)' },
      { tag: 'STOP_PB', label: 'STOP PB (NC — ON = safe)' },
    ],
    outputs: [
      { tag: 'MOTOR_RUN', label: 'Motor Run' },
      { tag: 'GREEN_LIGHT', label: 'Green Light' },
      { tag: 'RED_LIGHT', label: 'Red Light' },
    ],
  },
  {
    id: 'alarm-latch',
    title: 'Alarm with Acknowledge',
    level: 'Beginner',
    color: '#ef4444',
    objective: 'An alarm latches when a fault occurs and stays active until the operator presses Acknowledge — even if the fault clears on its own. OTL/OTU retentive outputs.',
    concepts: ['OTL', 'OTU', 'Latched alarm', 'SR latch', 'Retentive memory'],
    challenge: 'Trigger FAULT briefly then release it. The alarm stays on (OTL is retentive). Press ACK to clear. Compare ALARM_ACTIVE (latched) vs FAULT_LIVE (OTE — no memory).',
    program: [
      [
        { type: 'XIC', tag: 'FAULT_INPUT', label: 'Fault Input' },
        { type: 'OTL', tag: 'ALARM_ACTIVE', label: 'Alarm Active' },
      ],
      [
        { type: 'XIC', tag: 'ACK_BUTTON', label: 'Acknowledge' },
        { type: 'OTU', tag: 'ALARM_ACTIVE', label: 'Alarm Active' },
      ],
      [
        { type: 'XIC', tag: 'ALARM_ACTIVE', label: 'Alarm Active' },
        { type: 'OTE', tag: 'ALARM_HORN', label: 'Alarm Horn' },
      ],
      [
        { type: 'XIC', tag: 'ALARM_ACTIVE', label: 'Alarm Active' },
        { type: 'OTE', tag: 'ALARM_LIGHT', label: 'Alarm Light' },
      ],
      [
        { type: 'XIC', tag: 'FAULT_INPUT', label: 'Fault Input' },
        { type: 'OTE', tag: 'FAULT_LIVE', label: 'Fault Live (no memory)' },
      ],
    ],
    tags: {
      FAULT_INPUT: { type: 'BOOL', value: false },
      ACK_BUTTON: { type: 'BOOL', value: false },
      ALARM_ACTIVE: { type: 'BOOL', value: false },
      ALARM_HORN: { type: 'BOOL', value: false },
      ALARM_LIGHT: { type: 'BOOL', value: false },
      FAULT_LIVE: { type: 'BOOL', value: false },
    },
    inputs: [
      { tag: 'FAULT_INPUT', label: 'Fault Input' },
      { tag: 'ACK_BUTTON', label: 'Acknowledge' },
    ],
    outputs: [
      { tag: 'ALARM_ACTIVE', label: 'Alarm (latched)' },
      { tag: 'ALARM_HORN', label: 'Alarm Horn' },
      { tag: 'FAULT_LIVE', label: 'Fault Live (OTE)' },
    ],
  },
  {
    id: 'timer-sequence',
    title: 'Timed Sequence',
    level: 'Intermediate',
    color: '#f59e0b',
    objective: 'Three-step timed sequence: Step 1 for 3s → Step 2 for 2s → Step 3 for 1.5s → back to idle. Classic machine sequence using cascaded TON timers.',
    concepts: ['TON', 'Timer.DN', 'Timer.TT', 'Step sequencing', 'Cascaded timers'],
    challenge: 'Press CYCLE_START and watch Steps 1, 2, 3 activate in sequence. Each timer\'s .DN bit drives the next step. Check the Tags tab to see timer .ACC and .DN updating in real time.',
    program: [
      [
        { type: 'XIC', tag: 'CYCLE_START', label: 'Cycle Start' },
        { type: 'XIO', tag: 'CYCLE_ACTIVE', label: 'Not Active' },
        { type: 'OTL', tag: 'CYCLE_ACTIVE', label: 'Cycle Active' },
      ],
      [
        { type: 'XIC', tag: 'CYCLE_ACTIVE', label: 'Cycle Active' },
        { type: 'TON', tag: 'TMR1', label: 'Step 1 Timer', preset: 3000 },
      ],
      [
        { type: 'XIC', tag: 'CYCLE_ACTIVE', label: 'Cycle Active' },
        { type: 'XIO', tag: 'TMR1.DN', label: 'T1 Not Done' },
        { type: 'OTE', tag: 'STEP1_OUT', label: 'Step 1 Output' },
      ],
      [
        { type: 'XIC', tag: 'TMR1.DN', label: 'T1 Done' },
        { type: 'TON', tag: 'TMR2', label: 'Step 2 Timer', preset: 2000 },
      ],
      [
        { type: 'XIC', tag: 'TMR1.DN', label: 'T1 Done' },
        { type: 'XIO', tag: 'TMR2.DN', label: 'T2 Not Done' },
        { type: 'OTE', tag: 'STEP2_OUT', label: 'Step 2 Output' },
      ],
      [
        { type: 'XIC', tag: 'TMR2.DN', label: 'T2 Done' },
        { type: 'TON', tag: 'TMR3', label: 'Step 3 Timer', preset: 1500 },
      ],
      [
        { type: 'XIC', tag: 'TMR2.DN', label: 'T2 Done' },
        { type: 'XIO', tag: 'TMR3.DN', label: 'T3 Not Done' },
        { type: 'OTE', tag: 'STEP3_OUT', label: 'Step 3 Output' },
      ],
      [
        { type: 'XIC', tag: 'TMR3.DN', label: 'Sequence Done' },
        { type: 'OTU', tag: 'CYCLE_ACTIVE', label: 'Cycle Active' },
      ],
      [
        { type: 'XIC', tag: 'RESET_BTN', label: 'Reset' },
        { type: 'OTU', tag: 'CYCLE_ACTIVE', label: 'Cycle Active' },
      ],
    ],
    tags: {
      CYCLE_START: { type: 'BOOL', value: false },
      RESET_BTN: { type: 'BOOL', value: false },
      CYCLE_ACTIVE: { type: 'BOOL', value: false },
      STEP1_OUT: { type: 'BOOL', value: false },
      STEP2_OUT: { type: 'BOOL', value: false },
      STEP3_OUT: { type: 'BOOL', value: false },
      TMR1: { type: 'TIMER', PRE: 3000 },
      TMR2: { type: 'TIMER', PRE: 2000 },
      TMR3: { type: 'TIMER', PRE: 1500 },
    },
    inputs: [
      { tag: 'CYCLE_START', label: 'Cycle Start' },
      { tag: 'RESET_BTN', label: 'Reset' },
    ],
    outputs: [
      { tag: 'CYCLE_ACTIVE', label: 'Cycle Active' },
      { tag: 'STEP1_OUT', label: 'Step 1 (3s)' },
      { tag: 'STEP2_OUT', label: 'Step 2 (2s)' },
      { tag: 'STEP3_OUT', label: 'Step 3 (1.5s)' },
    ],
  },
  {
    id: 'batch-counter',
    title: 'Batch Counter',
    level: 'Intermediate',
    color: '#8b5cf6',
    objective: 'Count 10 parts into a batch, then stop the conveyor and set BATCH_DONE. NEXT_BATCH resets for the next batch. Separate shift total never resets mid-shift.',
    concepts: ['CTU', 'Counter.DN', 'Counter.ACC', 'RES', 'Production counting'],
    challenge: 'Toggle PART_SENSOR on and off 10 times. PART_CTR counts to 10 and sets BATCH_COMPLETE. CONVEYOR stops. Toggle NEXT_BATCH to reset the batch counter. SHIFT_CTR keeps the running total.',
    program: [
      [
        { type: 'XIC', tag: 'PART_SENSOR', label: 'Part Sensor' },
        { type: 'XIO', tag: 'BATCH_COMPLETE', label: 'Not Done' },
        { type: 'CTU', tag: 'PART_CTR', label: 'Batch Counter', preset: 10 },
      ],
      [
        { type: 'XIC', tag: 'PART_SENSOR', label: 'Part Sensor' },
        { type: 'CTU', tag: 'SHIFT_CTR', label: 'Shift Total', preset: 9999 },
      ],
      [
        { type: 'XIC', tag: 'PART_CTR.DN', label: 'Batch Done' },
        { type: 'OTL', tag: 'BATCH_COMPLETE', label: 'Batch Complete' },
      ],
      [
        { type: 'XIO', tag: 'BATCH_COMPLETE', label: 'Not Complete' },
        { type: 'OTE', tag: 'CONVEYOR_RUN', label: 'Conveyor Run' },
      ],
      [
        { type: 'XIC', tag: 'NEXT_BATCH', label: 'Next Batch' },
        { type: 'OTU', tag: 'BATCH_COMPLETE', label: 'Batch Complete' },
      ],
    ],
    tags: {
      PART_SENSOR: { type: 'BOOL', value: false },
      NEXT_BATCH: { type: 'BOOL', value: false },
      BATCH_COMPLETE: { type: 'BOOL', value: false },
      CONVEYOR_RUN: { type: 'BOOL', value: false },
      PART_CTR: { type: 'COUNTER', PRE: 10 },
      SHIFT_CTR: { type: 'COUNTER', PRE: 9999 },
    },
    inputs: [
      { tag: 'PART_SENSOR', label: 'Part Sensor' },
      { tag: 'NEXT_BATCH', label: 'Next Batch' },
    ],
    outputs: [
      { tag: 'CONVEYOR_RUN', label: 'Conveyor Running' },
      { tag: 'BATCH_COMPLETE', label: 'Batch Complete' },
    ],
  },
  {
    id: 'analog-threshold',
    title: 'Analog Level Control',
    level: 'Intermediate',
    color: '#06b6d4',
    objective: 'Tank level control with hysteresis. Fill valve opens below 40%, closes above 80%. Alarm at 90%+. Go to the Tags tab and click LEVEL to type values 0–100.',
    concepts: ['GEQ', 'LEQ', 'LES', 'OTL/OTU hysteresis', 'Analog thresholds', 'INT editing'],
    challenge: 'Open the Tags tab. Click the LEVEL value to edit it. Set to 25 — fill valve opens. Set to 85 — fill valve closes. Set to 95 — high alarm triggers. Set to 84 — alarm clears (5% hysteresis).',
    program: [
      [
        { type: 'LEQ', tagA: 'LEVEL', tagB: 40 },
        { type: 'OTL', tag: 'FILL_VALVE', label: 'Fill Valve' },
      ],
      [
        { type: 'GEQ', tagA: 'LEVEL', tagB: 80 },
        { type: 'OTU', tag: 'FILL_VALVE', label: 'Fill Valve' },
      ],
      [
        { type: 'XIC', tag: 'FILL_VALVE', label: 'Fill Valve' },
        { type: 'OTE', tag: 'FILL_INDICATOR', label: 'Fill Active' },
      ],
      [
        { type: 'GEQ', tagA: 'LEVEL', tagB: 90 },
        { type: 'OTL', tag: 'HIGH_ALARM', label: 'High Level Alarm' },
      ],
      [
        { type: 'LES', tagA: 'LEVEL', tagB: 85 },
        { type: 'OTU', tag: 'HIGH_ALARM', label: 'High Level Alarm' },
      ],
      [
        { type: 'GEQ', tagA: 'LEVEL', tagB: 40 },
        { type: 'LEQ', tagA: 'LEVEL', tagB: 80 },
        { type: 'OTE', tag: 'NORMAL_RANGE', label: 'Normal Range (40–80%)' },
      ],
    ],
    tags: {
      LEVEL: { type: 'INT', value: 25 },
      FILL_VALVE: { type: 'BOOL', value: false },
      FILL_INDICATOR: { type: 'BOOL', value: false },
      HIGH_ALARM: { type: 'BOOL', value: false },
      NORMAL_RANGE: { type: 'BOOL', value: false },
    },
    inputs: [],
    outputs: [
      { tag: 'FILL_VALVE', label: 'Fill Valve (latched)' },
      { tag: 'FILL_INDICATOR', label: 'Fill Active' },
      { tag: 'HIGH_ALARM', label: 'High Level Alarm' },
      { tag: 'NORMAL_RANGE', label: 'Normal Range' },
    ],
  },
  {
    id: 'analog-scaling',
    title: 'Sensor Scaling & Math',
    level: 'Advanced',
    color: '#f97316',
    objective: '4–20mA pressure transmitter (0–200 PSI) on a 0–32767 count analog input. MUL/DIV scales raw counts to PSI. Three alarm thresholds with hysteresis. Edit RAW_COUNT in Tags tab.',
    concepts: ['MUL', 'DIV', 'Analog scaling', 'Engineering units', 'Fixed-point math'],
    challenge: 'Open Tags tab, click RAW_COUNT to edit. Set to 16384 → ~100 PSI (normal). Set to 26214 → ~160 PSI (warning). Set to 29491 → ~180 PSI (alarm). Set to 32113 → ~196 PSI (shutdown).',
    program: [
      [
        { type: 'MUL', tagA: 'RAW_COUNT', tagB: 200, dst: 'PRESS_SCALED' },
      ],
      [
        { type: 'DIV', tagA: 'PRESS_SCALED', tagB: 32767, dst: 'PRESS_PSI' },
      ],
      [
        { type: 'GEQ', tagA: 'PRESS_PSI', tagB: 160 },
        { type: 'OTL', tag: 'PRESS_WARN', label: 'Press Warning' },
      ],
      [
        { type: 'LES', tagA: 'PRESS_PSI', tagB: 150 },
        { type: 'OTU', tag: 'PRESS_WARN', label: 'Press Warning' },
      ],
      [
        { type: 'GEQ', tagA: 'PRESS_PSI', tagB: 180 },
        { type: 'OTL', tag: 'PRESS_ALARM', label: 'Press Alarm' },
      ],
      [
        { type: 'LES', tagA: 'PRESS_PSI', tagB: 170 },
        { type: 'OTU', tag: 'PRESS_ALARM', label: 'Press Alarm' },
      ],
      [
        { type: 'XIC', tag: 'ACK_BTN', label: 'Acknowledge' },
        { type: 'OTU', tag: 'PRESS_ALARM', label: 'Press Alarm' },
      ],
      [
        { type: 'GEQ', tagA: 'PRESS_PSI', tagB: 195 },
        { type: 'OTE', tag: 'SHUTDOWN', label: 'Safety Shutdown' },
      ],
    ],
    tags: {
      RAW_COUNT: { type: 'INT', value: 8192 },
      PRESS_SCALED: { type: 'INT', value: 0 },
      PRESS_PSI: { type: 'INT', value: 0 },
      ACK_BTN: { type: 'BOOL', value: false },
      PRESS_WARN: { type: 'BOOL', value: false },
      PRESS_ALARM: { type: 'BOOL', value: false },
      SHUTDOWN: { type: 'BOOL', value: false },
    },
    inputs: [{ tag: 'ACK_BTN', label: 'Acknowledge' }],
    outputs: [
      { tag: 'PRESS_WARN', label: 'Warning (>160 PSI)' },
      { tag: 'PRESS_ALARM', label: 'Alarm (>180 PSI)' },
      { tag: 'SHUTDOWN', label: 'Shutdown (>195 PSI)' },
    ],
  },
  {
    id: 'conveyor-interlock',
    title: 'Zone Interlock System',
    level: 'Advanced',
    color: '#ec4899',
    objective: 'Three conveyor zones with downstream interlocks: Zone 3 only runs if Zone 2 is running; Zone 2 only runs if Zone 1 is running. E-stop drops all zones simultaneously.',
    concepts: ['Permissive logic', 'Series interlocks', 'E-stop', 'Multi-zone', 'Safety design'],
    challenge: 'Try starting Zone 3 without Zone 1 running — blocked. Start them in order: Z1 → Z2 → Z3. Press E-STOP (turn it off) to kill all zones. Note Zone 3 cannot "back-feed" to keep Zone 2 alive.',
    program: [
      [
        { type: 'BRANCH', branches: [
          [{ type: 'XIC', tag: 'Z1_START', label: 'Z1 Start' }],
          [{ type: 'XIC', tag: 'Z1_RUN', label: 'Z1 Seal' }],
        ]},
        { type: 'XIC', tag: 'Z1_STOP', label: 'Z1 Stop' },
        { type: 'XIC', tag: 'ESTOP_OK', label: 'E-Stop OK' },
        { type: 'OTE', tag: 'Z1_RUN', label: 'Zone 1 Run' },
      ],
      [
        { type: 'BRANCH', branches: [
          [{ type: 'XIC', tag: 'Z2_START', label: 'Z2 Start' }],
          [{ type: 'XIC', tag: 'Z2_RUN', label: 'Z2 Seal' }],
        ]},
        { type: 'XIC', tag: 'Z2_STOP', label: 'Z2 Stop' },
        { type: 'XIC', tag: 'Z1_RUN', label: 'Z1 Running' },
        { type: 'XIC', tag: 'ESTOP_OK', label: 'E-Stop OK' },
        { type: 'OTE', tag: 'Z2_RUN', label: 'Zone 2 Run' },
      ],
      [
        { type: 'BRANCH', branches: [
          [{ type: 'XIC', tag: 'Z3_START', label: 'Z3 Start' }],
          [{ type: 'XIC', tag: 'Z3_RUN', label: 'Z3 Seal' }],
        ]},
        { type: 'XIC', tag: 'Z3_STOP', label: 'Z3 Stop' },
        { type: 'XIC', tag: 'Z2_RUN', label: 'Z2 Running' },
        { type: 'XIC', tag: 'ESTOP_OK', label: 'E-Stop OK' },
        { type: 'OTE', tag: 'Z3_RUN', label: 'Zone 3 Run' },
      ],
    ],
    tags: {
      Z1_START: { type: 'BOOL', value: false }, Z1_STOP: { type: 'BOOL', value: true }, Z1_RUN: { type: 'BOOL', value: false },
      Z2_START: { type: 'BOOL', value: false }, Z2_STOP: { type: 'BOOL', value: true }, Z2_RUN: { type: 'BOOL', value: false },
      Z3_START: { type: 'BOOL', value: false }, Z3_STOP: { type: 'BOOL', value: true }, Z3_RUN: { type: 'BOOL', value: false },
      ESTOP_OK: { type: 'BOOL', value: true },
    },
    inputs: [
      { tag: 'Z1_START', label: 'Zone 1 Start' }, { tag: 'Z1_STOP', label: 'Zone 1 Stop (NC)' },
      { tag: 'Z2_START', label: 'Zone 2 Start' }, { tag: 'Z2_STOP', label: 'Zone 2 Stop (NC)' },
      { tag: 'Z3_START', label: 'Zone 3 Start' }, { tag: 'Z3_STOP', label: 'Zone 3 Stop (NC)' },
      { tag: 'ESTOP_OK', label: 'E-Stop OK (NC — ON = safe)' },
    ],
    outputs: [
      { tag: 'Z1_RUN', label: 'Zone 1 Running' },
      { tag: 'Z2_RUN', label: 'Zone 2 Running' },
      { tag: 'Z3_RUN', label: 'Zone 3 Running' },
    ],
  },
  {
    id: 'pick-place',
    title: 'Pick & Place FSM',
    level: 'Advanced',
    color: '#a78bfa',
    objective: 'A pick-and-place robot arm implemented as an FSM using an INT step counter. IDLE → EXTEND → CLAMP → RETRACT → PLACE → UNCLAMP → HOME → IDLE. EQU comparisons drive each state\'s outputs.',
    concepts: ['EQU', 'MOV', 'INT step counter', 'FSM in ladder', 'State machine', 'Sequence control'],
    challenge: 'Press CYCLE_START. The step counter advances each time the ADVANCE button is pressed (simulating sensor feedback). Watch the Tags tab — STEP changes value and outputs update based on which step is active.',
    program: [
      [
        { type: 'XIC', tag: 'CYCLE_START', label: 'Cycle Start' },
        { type: 'EQU', tagA: 'STEP', tagB: 0 },
        { type: 'MOV', src: 1, dst: 'STEP' },
      ],
      [
        { type: 'XIC', tag: 'ADVANCE', label: 'Advance' },
        { type: 'GRT', tagA: 'STEP', tagB: 0 },
        { type: 'LES', tagA: 'STEP', tagB: 7 },
        { type: 'ADD', tagA: 'STEP', tagB: 1, dst: 'STEP' },
      ],
      [
        { type: 'XIC', tag: 'ADVANCE', label: 'Advance' },
        { type: 'EQU', tagA: 'STEP', tagB: 7 },
        { type: 'MOV', src: 0, dst: 'STEP' },
      ],
      [
        { type: 'EQU', tagA: 'STEP', tagB: 1 },
        { type: 'OTE', tag: 'EXTEND_ACT', label: 'Extend Actuator' },
      ],
      [
        { type: 'EQU', tagA: 'STEP', tagB: 2 },
        { type: 'OTE', tag: 'CLAMP_SOL', label: 'Clamp Solenoid' },
      ],
      [
        { type: 'BRANCH', branches: [
          [{ type: 'EQU', tagA: 'STEP', tagB: 2 }],
          [{ type: 'EQU', tagA: 'STEP', tagB: 3 }],
          [{ type: 'EQU', tagA: 'STEP', tagB: 4 }],
        ]},
        { type: 'OTE', tag: 'CLAMP_HELD', label: 'Clamp Held' },
      ],
      [
        { type: 'EQU', tagA: 'STEP', tagB: 3 },
        { type: 'OTE', tag: 'RETRACT_ACT', label: 'Retract Actuator' },
      ],
      [
        { type: 'EQU', tagA: 'STEP', tagB: 4 },
        { type: 'OTE', tag: 'PLACE_EXTEND', label: 'Place Extend' },
      ],
      [
        { type: 'EQU', tagA: 'STEP', tagB: 6 },
        { type: 'OTE', tag: 'HOME_ACT', label: 'Home Actuator' },
      ],
    ],
    tags: {
      STEP: { type: 'INT', value: 0 },
      CYCLE_START: { type: 'BOOL', value: false },
      ADVANCE: { type: 'BOOL', value: false },
      EXTEND_ACT: { type: 'BOOL', value: false },
      CLAMP_SOL: { type: 'BOOL', value: false },
      CLAMP_HELD: { type: 'BOOL', value: false },
      RETRACT_ACT: { type: 'BOOL', value: false },
      PLACE_EXTEND: { type: 'BOOL', value: false },
      HOME_ACT: { type: 'BOOL', value: false },
    },
    inputs: [
      { tag: 'CYCLE_START', label: 'Cycle Start (Step 0→1)' },
      { tag: 'ADVANCE', label: 'Advance Step' },
    ],
    outputs: [
      { tag: 'EXTEND_ACT', label: 'Step 1: Extend' },
      { tag: 'CLAMP_SOL', label: 'Step 2: Clamp' },
      { tag: 'CLAMP_HELD', label: 'Steps 2-4: Clamp Held' },
      { tag: 'RETRACT_ACT', label: 'Step 3: Retract' },
      { tag: 'PLACE_EXTEND', label: 'Step 4: Place Extend' },
      { tag: 'HOME_ACT', label: 'Step 6: Home' },
    ],
  },
];

const LEVEL_COLORS = { Beginner: '#10b981', Intermediate: '#f59e0b', Advanced: '#ef4444' };

// ─── Page ───────────────────────────────────────────────────────────────────

export default function PLCLabPage() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState('start-stop');
  const active = EXERCISES.find(e => e.id === activeId);

  useEffect(() => {
    document.title = 'PLC Lab — UpSkillOS';
    return () => { document.title = 'UpSkillOS'; };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1700,
      display: 'flex', flexDirection: 'column',
      background: '#0a0f1e', color: '#e2e8f0',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Top bar */}
      <div style={{ height: 48, background: '#111827', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, flexShrink: 0 }}>
        <button onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🏭</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>PLC Ladder Logic Lab</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#475569' }}>
          {EXERCISES.length} exercises · Allen-Bradley naming
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Sidebar */}
        <div style={{ width: 230, flexShrink: 0, background: '#111827', borderRight: '1px solid #1e293b', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px 6px', fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Exercises
          </div>
          {EXERCISES.map(ex => (
            <button key={ex.id} onClick={() => setActiveId(ex.id)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 14px', cursor: 'pointer', border: 'none', textAlign: 'left',
                background: activeId === ex.id ? '#1e293b' : 'transparent',
                borderLeft: `3px solid ${activeId === ex.id ? ex.color : 'transparent'}`,
                transition: 'all 0.12s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: `${LEVEL_COLORS[ex.level]}20`, color: LEVEL_COLORS[ex.level] }}>{ex.level}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: activeId === ex.id ? '#e2e8f0' : '#94a3b8', lineHeight: 1.3 }}>{ex.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {ex.concepts.slice(0, 3).map(c => (
                  <span key={c} style={{ fontSize: 8, color: '#475569', background: '#0f172a', padding: '1px 5px', borderRadius: 4 }}>{c}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {active && (
            <>
              {/* Exercise header */}
              <div style={{ padding: '10px 20px', background: '#111827', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: active.color }}>{active.title}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: `${LEVEL_COLORS[active.level]}20`, color: LEVEL_COLORS[active.level] }}>{active.level}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, maxWidth: 620, marginBottom: 6 }}>{active.objective}</p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {active.concepts.map(c => (
                        <span key={c} style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#1e293b', color: '#64748b', border: '1px solid #334155' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, background: `${active.color}0d`, border: `1px solid ${active.color}30`, borderRadius: 8, padding: '8px 12px', maxWidth: 280 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: active.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Challenge</div>
                    <p style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>{active.challenge}</p>
                  </div>
                </div>
              </div>

              {/* Simulator */}
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                <PLCLadderSim
                  key={activeId}
                  params={{
                    program: active.program,
                    tags: active.tags,
                    inputs: active.inputs,
                    outputs: active.outputs,
                    title: active.title,
                    description: active.objective,
                    scanInterval: 50,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
