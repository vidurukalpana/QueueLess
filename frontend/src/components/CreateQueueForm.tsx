import { useMutation, useQueryClient } from '@tanstack/react-query'
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
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-md border-2 border-gray-900 p-4"
    >
      <label htmlFor="queue-name" className="mb-2 block font-bold">
        New queue
      </label>
      {mutation.isError && (
        <p
          role="alert"
          className="mb-3 rounded-md border-2 border-dashed border-gray-500 bg-gray-100 px-3 py-2"
        >
          {getErrorMessage(mutation.error)}
        </p>
      )}
      <div className="flex gap-3">
        <input
          id="queue-name"
          required
          placeholder="Queue name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-w-0 flex-1 rounded-md border-2 border-gray-400 px-3 py-2"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-gray-900 px-4 py-2 font-bold text-white disabled:opacity-60"
        >
          Create queue
        </button>
      </div>
    </form>
  )
}
