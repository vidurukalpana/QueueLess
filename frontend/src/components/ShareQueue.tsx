import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

const QR_SIZE = 170

interface ShareQueueProps {
  queueId: string
}

export function ShareQueue({ queueId }: ShareQueueProps) {
  const [message, setMessage] = useState('')
  const link = `${window.location.origin}/q/${queueId}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setMessage('Link copied')
    } catch {
      setMessage('Could not copy. Please copy the link above.')
    }
  }

  return (
    <section className="rounded-md border-2 border-gray-900 p-4 text-center">
      <h2 className="mb-3 font-bold">Share this queue</h2>
      <QRCodeSVG
        value={link}
        size={QR_SIZE}
        marginSize={2}
        title="Queue QR code"
        className="mx-auto mb-3"
      />
      <p className="mb-3 text-sm break-all text-gray-600">{link}</p>
      <button
        type="button"
        onClick={copyLink}
        className="w-full rounded-md border-2 border-gray-900 px-4 py-2 font-bold"
      >
        Copy share link
      </button>
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </section>
  )
}
