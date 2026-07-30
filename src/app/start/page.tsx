'use client'

import { CreateForm } from '@/components/CreateForm'
import { Onboarding, useNeedsOnboarding } from '@/components/OnboardingFlow'

export default function StartPage() {
  const { needs, clear } = useNeedsOnboarding()

  if (needs) {
    return <Onboarding onDone={clear} />
  }

  return <CreateForm />
}
