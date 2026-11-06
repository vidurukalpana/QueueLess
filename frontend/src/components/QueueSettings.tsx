import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { apiPatch, apiPost, getErrorMessage } from '../api/client'
import type { JoinCodeResponse, Queue, UpdateQueueRequest } from '../api/types'
import { useAuth } from '../hooks/useAuth'

const MIN_QUEUE_SIZE = 1
const MAX_QUEUE_SIZE = 500

interface QueueSettingsProps {
  queue: Queue
}

export function QueueSettings({ queue }: QueueSettingsProps) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [maxSize, setMaxSize] = useState(queue.maxWaiting?.toString() ?? '')
  const [saved, setSaved] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['queues'] })
  const update = useMutation({
    mutationFn: (input: UpdateQueueRequest) =>
      apiPatch<Queue>(`/api/queues/${queue.id}`, input, token ?? undefined),
    onSuccess: refresh,
  })
  const regenerate = useMutation({
    mutationFn: () =>
      apiPost<JoinCodeResponse>(
        `/api/queues/${queue.id}/join-code`,
        undefined,
        token ?? undefined,
      ),
    onSuccess: refresh,
  })
  const error = update.error ?? regenerate.error
  const allowRemoteJoin = update.isPending
    ? (update.variables.allowRemoteJoin ?? queue.allowRemoteJoin)
    : queue.allowRemoteJoin

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(false)
    update.mutate(
      { maxWaiting: maxSize === '' ? null : Number(maxSize) },
      { onSuccess: () => setSaved(true) },
    )
  }

  return (
    <section className="rounded-md border-2 border-gray-900 p-4">
      <h2 className="mb-3 font-bold">Settings</h2>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-md border-2 border-dashed border-gray-500 bg-gray-100 px-3 py-2 text-sm"
        >
          {getErrorMessage(error)}
        </p>
      )}

      <label className="mb-3 flex items-center justify-between gap-3">
        <span>Allow remote joins</span>
        <input
          type="checkbox"
          checked={allowRemoteJoin}
          disabled={update.isPending}
          onChange={(event) =>
            update.mutate({ allowRemoteJoin: event.target.checked })
          }
          className="size-5 accent-gray-900"
        />
      </label>

      <form onSubmit={handleSubmit} className="mb-3">
        <label htmlFor="max-size" className="mb-1 block text-sm font-bold">
          Maximum queue size
        </label>
        <div className="flex gap-2">
          <input
            id="max-size"
            type="number"
            min={MIN_QUEUE_SIZE}
            max={MAX_QUEUE_SIZE}
            placeholder="No limit"
            value={maxSize}
            onChange={(event) => {
              setMaxSize(event.target.value)
              setSaved(false)
            }}
            className="min-w-0 flex-1 rounded-md border-2 border-gray-400 px-3 py-2"
          />
          <button
            type="submit"
            disabled={update.isPending}
            className="rounded-md border-2 border-gray-900 px-3 py-2 font-bold disabled:opacity-60"
          >
            Save
          </button>
        </div>
        {saved && (
          <p role="status" className="mt-1 text-sm">
            Saved
          </p>
        )}
      </form>

      <button
        type="button"
        disabled={regenerate.isPending}
        onClick={() => regenerate.mutate()}
        className="w-full rounded-md border-2 border-gray-900 px-4 py-2 font-bold disabled:opacity-60"
      >
        Regenerate QR code
      </button>
      <p className="mt-1 text-sm text-gray-600">
        Older printed QR codes stop working.
      </p>
    </section>
  )
}
