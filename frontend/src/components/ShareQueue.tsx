import { Copy, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

const QR_SIZE = 170

interface ShareQueueProps {
  queueId: string
  joinCode: string
}

export function ShareQueue({ queueId, joinCode }: ShareQueueProps) {
  const [message, setMessage] = useState('')
  const link = `${window.location.origin}/q/${queueId}`
  const shopLink = `${link}?code=${joinCode}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setMessage('Link copied')
    } catch {
      setMessage('Could not copy. Please copy the link above.')
    }
  }

  return (
    <section className="card p-5 text-center">
      <h2 className="mb-4 flex items-center justify-center gap-2 font-bold">
        <QrCode className="size-4 text-brand" />
        Share this queue
      </h2>
      <div className="mx-auto mb-3 w-fit rounded-2xl bg-white p-2 ring-2 ring-orange-200">
        <QRCodeSVG
          value={shopLink}
          size={QR_SIZE}
          marginSize={2}
          title="Queue QR code"
        />
      </div>
      <p className="mb-3 text-xs break-all text-stone-500">{link}</p>
      <button type="button" onClick={copyLink} className="btn-secondary w-full">
        <Copy className="size-4" />
        Copy share link
      </button>
      {message && (
        <p role="status" className="mt-2 text-sm font-medium text-emerald-700">
          {message}
        </p>
      )}
    </section>
  )
}
