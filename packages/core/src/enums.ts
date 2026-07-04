/**
 * Fuzzy time-horizon buckets. Beacon deliberately avoids calendar dates in the
 * core loop — tasks live in horizons the user cycles by tapping the due pill.
 */
export const DUE_BUCKETS = ['today', 'tomorrow', 'week', 'someday'] as const
export type Due = (typeof DUE_BUCKETS)[number]

/** Priority, cycled high → med → low by tapping the priority square. */
export const PRIORITIES = ['high', 'med', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

/** Routine templates run at two times of day; check-state resets daily. */
export const ROUTINE_PERIODS = ['morning', 'evening'] as const
export type RoutinePeriod = (typeof ROUTINE_PERIODS)[number]

/** The "Energy right now" selector biases the right-now suggestion. */
export const ENERGY_LEVELS = ['low', 'medium', 'high'] as const
export type EnergyLevel = (typeof ENERGY_LEVELS)[number]

/** Canvas cards can be promoted into a task or a note. */
export const PROMOTE_TARGETS = ['task', 'note'] as const
export type PromoteTarget = (typeof PROMOTE_TARGETS)[number]
