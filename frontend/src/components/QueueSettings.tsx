import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Settings2 } from 'lucide-react'
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
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-bold">
        <Settings2 className="size-4 text-brand" />
        Settings
      </h2>

      {error && (
        <p role="alert" className="notice-error mb-3">
          {getErrorMessage(error)}
        </p>
      )}

      <label className="mb-4 flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-stone-700">
        <span>Allow remote joins</span>
        <input
          type="checkbox"
          checked={allowRemoteJoin}
          disabled={update.isPending}
          onChange={(event) =>
            update.mutate({ allowRemoteJoin: event.target.checked })
          }
          className="peer sr-only"
        />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-stone-300 transition peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
      </label>

      <form onSubmit={handleSubmit} className="mb-4">
        <label htmlFor="max-size" className="field-label">
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
            className="field min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={update.isPending}
            className="btn-secondary"
          >
            Save
          </button>
        </div>
        {saved && (
          <p
            role="status"
            className="mt-1.5 text-sm font-medium text-emerald-700"
          >
            Saved
          </p>
        )}
      </form>

      <button
        type="button"
        disabled={regenerate.isPending}
        onClick={() => regenerate.mutate()}
        className="btn-secondary w-full"
      >
        <RefreshCw className="size-4" />
        Regenerate QR code
      </button>
      <p className="mt-2 text-center text-xs text-stone-500">
        Older printed QR codes stop working.
      </p>
    </section>
  )
}
