/** Stable face pool for party stacks — cycles as headcount grows. */
export const PEOPLE_FACES = [
  '🧑🏻',
  '👩🏾',
  '👨🏻',
  '👩🏼',
  '🧑🏽',
  '👨🏽',
  '👩🏻',
  '👨🏾',
  '👩🏼‍🦱',
  '🧑🏻‍🦳',
  '👩🏽',
  '👨🏻‍🦰',
] as const

export function faceForIndex(i: number): string {
  return PEOPLE_FACES[i % PEOPLE_FACES.length]
}

/** Social-style overflow: show a few faces, rest as +N. */
export const FACE_STACK_VISIBLE = 4
