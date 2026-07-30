import { QrScreen } from '@/components/QrScreen'

type Props = { params: Promise<{ code: string }> }

export default async function QrPage({ params }: Props) {
  const { code } = await params
  return <QrScreen code={code.toUpperCase()} />
}
