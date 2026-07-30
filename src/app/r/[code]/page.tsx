import type { Metadata } from 'next'
import { ReceiptView } from '@/components/ReceiptView'

type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  return {
    title: `Receipt · ${code.toUpperCase()}`,
    description: 'Signed. Verifiable.',
    openGraph: {
      title: `Receipt · ${code.toUpperCase()}`,
      description: 'Signed. Verifiable.',
    },
  }
}

export default async function ReceiptPage({ params }: Props) {
  const { code } = await params
  return <ReceiptView code={code.toUpperCase()} />
}
