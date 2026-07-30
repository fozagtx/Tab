import { Board } from '@/components/Board'

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ host_token?: string }> }

export default async function BoardPage({ params, searchParams }: Props) {
  const { code } = await params
  const { host_token } = await searchParams
  return <Board code={code.toUpperCase()} initialHostToken={host_token ?? null} />
}
