# QueueLess – User Stories

Two roles: **owner** (shop owner with a login) and **customer** (no login).

## 1. Owner account

As an owner, I want to register and log in, so that only I can manage my shop's queues.

- **Given** a new email and a password of at least 8 characters, **when** I register, **then** my account is created and I can log in.
- **Given** an email that is already registered, **when** I register with it, **then** I see an error and no account is created.
- **Given** a registered account, **when** I log in with the correct password, **then** I reach my dashboard and stay logged in after a refresh.
- **Given** a wrong email or password, **when** I log in, **then** I see "invalid email or password".
- **Given** I am not logged in, **when** I open the dashboard, **then** I am redirected to the login page.

## 2. Create and share a queue

As an owner, I want to create a queue with a QR code and a share link, so that customers can join at the shop or from home.

- **Given** I am logged in, **when** I create a queue with a name, **then** it appears in my queue list without a page refresh.
- **Given** I have a queue, **when** I open its page, **then** I see its QR code and a button to copy its share link.
- **Given** a printed or displayed QR code, **when** a customer scans it with a phone, **then** the join page for that queue opens.
- **Given** a queue that belongs to another owner, **when** I try to manage it, **then** it is reported as not found.

## 3. Join a queue

As a customer, I want to join a queue with only my name, so that I can get a ticket without creating an account.

- **Given** an open queue, **when** I enter a name of 1–40 characters and tap Join, **then** I get the next ticket number and see my ticket page.
- **Given** two customers join at the same moment, **when** their tickets are created, **then** they get different ticket numbers.
- **Given** the queue is paused or closed, **when** I try to join, **then** I see a message and no ticket is created.
- **Given** I have an active ticket, **when** I refresh or scan the QR code again, **then** I see the same ticket instead of getting a new one.

## 4. Follow my place in the queue

As a customer, I want to see my live position and estimated wait, so that I can wait anywhere without losing my turn.

- **Given** I am waiting, **when** I open my ticket page, **then** I see my ticket number, the number of people ahead of me and my estimated wait.
- **Given** I am waiting, **when** the queue changes, **then** my position and estimate update without a refresh.
- **Given** the owner calls my ticket, **when** my status changes, **then** I see "Your turn!" and my phone vibrates.
- **Given** my connection drops, **when** the network returns, **then** I see "Reconnecting…" until the page recovers by itself with current data.
- **Given** I no longer want to wait, **when** I cancel my ticket, **then** I leave the queue and everyone behind me moves up.
- **Given** someone has my ticket link but not my secret token, **when** they open the ticket, **then** it is reported as not found.

## 5. Serve customers

As an owner, I want to call, skip and complete tickets, so that I can move customers through the queue in order.

- **Given** customers are waiting and nobody is being served, **when** I click **Call next**, **then** the lowest-numbered waiting ticket becomes called.
- **Given** a customer is being served, **when** I look at **Call next**, **then** it is disabled until I click **Done** or **Skip**.
- **Given** a customer does not respond or is absent, **when** I click **Skip** on their ticket, **then** the ticket is marked skipped and leaves the queue.
- **Given** a ticket is called, **when** I click **Done**, **then** the ticket is marked done.
- **Given** I change a ticket, **when** the change is saved, **then** my dashboard and every customer screen update instantly.

## 6. Pause or close a queue

As an owner, I want to pause or close my queue, so that I can stop new customers during a break or at the end of the day.

- **Given** an open queue, **when** I click Pause, **then** its status becomes paused and new customers cannot join.
- **Given** an open or paused queue, **when** I click Close, **then** its status becomes closed and new customers cannot join.
- **Given** a paused or closed queue, **when** I click Open, **then** new customers can join again.
- **Given** the status changes, **when** customers have the queue open, **then** they see the new status without a refresh.

## 7. Control who can join

As an owner, I want to block remote joins and limit the queue size, so that the queue stays manageable and is not filled by people who never arrive.

- **Given** remote joins are off, **when** a customer uses the share link, **then** they see "Please scan the QR code at the shop" and no ticket is created.
- **Given** remote joins are off, **when** a customer scans the shop QR code, **then** they can join.
- **Given** I regenerate the QR code, **when** a customer uses the old code while remote joins are off, **then** they cannot join.
- **Given** a maximum size of 2 with 2 customers waiting, **when** a third customer tries to join, **then** they are told the queue is full.
- **Given** I set the maximum size, **when** I save it, **then** it must be between 1 and 500, or empty for no limit.

## 8. Arrival check-in

As a remote customer, I want to tell the shop I have arrived, so that the owner knows I am present when my turn comes.

- **Given** I joined with the share link and I am waiting, **when** I tap **I'm here**, **then** the button is replaced with "Checked in", which stays after a refresh.
- **Given** I joined with the shop QR code, **when** my ticket is created, **then** I am already checked in.
- **Given** I am already checked in, **when** the check-in is sent again, **then** my original check-in time does not change.
- **Given** the owner has the queue open, **when** a customer checks in, **then** that ticket shows a **Here** badge instantly, while tickets not checked in show **Remote**.

## 9. Turn alert

As a customer, I want an alert when my turn is near, so that I can return to the shop in time.

- **Given** I am on my ticket page, **when** I tap "Get an alert near your turn", **then** the browser asks for notification permission.
- **Given** I allowed notifications, **when** two or fewer people are ahead of me, **then** I get a notification and my phone vibrates.
- **Given** my browser denied or does not support notifications, **when** my turn is near, **then** I see an in-page banner instead.
- **Given** an alert was already sent, **when** I refresh the page, **then** the alert is not repeated.

## 10. Daily stats

As an owner, I want to see daily stats, so that I can understand how busy my shop is.

- **Given** I have a queue, **when** I open its stats page, **then** I see today's served count, skipped count, average wait and average service time.
- **Given** the stats page is open, **when** I pick another date, **then** the numbers update for that date.
- **Given** a ticket was created at 00:30 Sri Lanka time, **when** I view stats, **then** it counts for that Sri Lanka date.

## MVP coverage

| MVP feature | Story |
| --- | --- |
| 1. Register, log in, create a queue | 1, 2 |
| 2. QR code plus share link | 2 |
| 3. Join with a name, get a ticket | 3 |
| 4. Live position with estimated wait | 4 |
| 5. Call next, skip, mark done | 5 |
| 6. Pause or close the queue | 6 |
| 7. Queue settings | 7 |
| 8. Arrival check-in | 8 |
| 9. Turn alert | 9 |
| 10. Stats page | 10 |
