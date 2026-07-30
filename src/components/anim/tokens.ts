/** Shared motion tokens — spring-like / smooth / snappy (web-animation-guidelines). */

export const ease = {
  spring: [0.34, 1.56, 0.64, 1] as const,
  smooth: [0.16, 1, 0.3, 1] as const,
  snappy: [0.4, 0, 0.2, 1] as const,
}

export const duration = {
  press: 0.09,
  hover: 0.2,
  micro: 0.18,
  enter: 0.28,
  success: 0.55,
}

export const stagger = {
  children: 0.05,
  fast: 0.035,
}

export const enterTransition = {
  duration: duration.enter,
  ease: ease.smooth,
}

export const pressTransition = {
  duration: duration.press,
  ease: ease.snappy,
}

export const springTransition = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 28,
  mass: 0.8,
}
