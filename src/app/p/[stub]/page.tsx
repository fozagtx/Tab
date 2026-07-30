import type { Metadata } from 'next'
import { PayPanel } from '@/components/PayPanel'

type Props = { params: Promise<{ stub: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stub } = await params
  return {
    title: `Pay · ${stub.toUpperCase()}`,
    description: 'Your share.',
    openGraph: {
      title: `Pay · ${stub.toUpperCase()}`,
      description: 'Your share.',
    },
  }
}

export default async function PayPage({ params }: Props) {
  const { stub } = await params
  return <PayPanel stub={stub.toUpperCase()} />
}
