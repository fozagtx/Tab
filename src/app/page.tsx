'use client'

import { CreateForm } from '@/components/CreateForm'
import { Onboarding, useNeedsOnboarding } from '@/components/OnboardingFlow'

export default function HomePage() {
  const { needs, clear } = useNeedsOnboarding()

  if (needs) {
    return <Onboarding onDone={clear} />
  }

  return <CreateForm />
}
