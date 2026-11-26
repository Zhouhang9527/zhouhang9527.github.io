// Deliberately small browser-safe blog projection. It contains only progression
// labels and thresholds; original source paths, native names, atlases, geometry,
// frame IDs, and source-derived timing live in the server-only vn-scenes module.
export const runtimeScenes = {
  title: {
    states: [
      // Observed first-launch title uses the complete data-003 CG (eyes open).
      { id: 'arrival', minCompleted: 0, present: true, expression: 'eyes-open' },
      { id: 'first-encounter', minCompleted: 1, present: true, expression: 'eyes-open' },
      { id: 'familiar', minCompleted: 3, present: true, expression: 'eyes-closed' },
    ],
  },
  map: {
    states: [
      { id: 'arrival', minCompleted: 0 },
      { id: 'first-encounter', minCompleted: 1 },
      { id: 'familiar', minCompleted: 3 },
    ],
  },
  // These are blog presentation timings, not original game timing records.
  motion: {
    title: { backgroundMs: 320, logoMs: 420, holdMs: 480, menuMs: 180, restoreMs: 420, leaveMs: 900 },
  },
} as const;

export type TitleState = typeof runtimeScenes.title.states[number];

export function resolveTitleState(completed: number): TitleState {
  return [...runtimeScenes.title.states].reverse().find(state => completed >= state.minCompleted) ?? runtimeScenes.title.states[0];
}

export function resolveMapState(completed: number) {
  return [...runtimeScenes.map.states].reverse().find(state => completed >= state.minCompleted) ?? runtimeScenes.map.states[0];
}
