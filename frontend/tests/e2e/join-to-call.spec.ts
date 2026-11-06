import { expect, test } from '@playwright/test'

test('customer joins, owner calls next, customer sees their turn', async ({
  browser,
  baseURL,
}) => {
  const ownerContext = await browser.newContext({ baseURL })
  const customerContext = await browser.newContext({ baseURL })
  const owner = await ownerContext.newPage()
  const customer = await customerContext.newPage()
  const email = `e2e-${Date.now()}@example.com`
  const password = 'password123'

  await owner.goto('/register')
  await expect(owner.getByRole('heading', { name: 'Register' })).toBeVisible()
  await owner.getByLabel('Email').fill(email)
  await owner.getByLabel('Password').fill(password)
  await owner.getByRole('button', { name: 'Create account' }).click()
  await expect(owner.getByText('Account created')).toBeVisible()

  await owner.getByLabel('Email').fill(email)
  await owner.getByLabel('Password').fill(password)
  await owner.getByRole('button', { name: 'Log in' }).click()
  await expect(
    owner.getByRole('heading', { name: 'Your queues' }),
  ).toBeVisible()

  await owner.getByLabel('New queue').fill('E2E Barber')
  await owner.getByRole('button', { name: 'Create queue' }).click()
  await owner.getByRole('link', { name: 'Manage' }).click()
  await expect(owner.getByText('No customers in the queue.')).toBeVisible()
  const queueId = new URL(owner.url()).pathname.split('/').pop()

  await customer.goto(`/q/${queueId}`)
  await customer.getByLabel('Your name').fill('Nimal')
  await customer.getByRole('button', { name: 'Join queue' }).click()
  await expect(customer.getByText('#1')).toBeVisible()

  await expect(owner.getByRole('cell', { name: 'Nimal' })).toBeVisible()
  await owner.getByRole('button', { name: 'Call next' }).click()

  await expect(customer.getByText('Your turn!')).toBeVisible()

  await ownerContext.close()
  await customerContext.close()
})
