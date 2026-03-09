'use client'

import dynamic from 'next/dynamic'

const TextureLab = dynamic(() => import('@/components/recess/TextureLab'), { ssr: false })

export default function TexturesPage() {
  return <TextureLab />
}
