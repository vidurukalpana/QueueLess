import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { apiPost, getErrorMessage } from '../api/client'
import type { CreateQueueRequest, Queue } from '../api/types'
import { useAuth } from '../hooks/useAuth'

export function CreateQueueForm() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const mutation = useMutation({
    mutationFn: (input: CreateQueueRequest) =>
      apiPost<Queue>('/api/queues', input, token ?? undefined),
    onSuccess: () => {
      setName('')
      return queryClient.invalidateQueries({ queryKey: ['queues'] })
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate({ name })
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6 p-5">
      <label htmlFor="queue-name" className="field-label">
        New queue
      </label>
      {mutation.isError && (
        <p role="alert" className="notice-error mb-3">
          {getErrorMessage(mutation.error)}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="queue-name"
          required
          placeholder="Queue name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary"
        >
          <Plus className="size-4" strokeWidth={3} />
          Create queue
        </button>
      </div>
    </form>
  )
}
