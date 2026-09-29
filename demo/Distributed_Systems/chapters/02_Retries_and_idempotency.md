# Try again. Safely.

## Transient failures

A network request can fail because a service is briefly unavailable or because a response arrives after a deadline. A timeout does not prove that the operation failed: the service may have completed the operation before the response was lost.

Retry transient failures with a bounded number of attempts. Do not retry invalid input or failed authorization without correcting the cause. Set a deadline so a user is not left waiting indefinitely.

## Backoff and jitter

Exponential backoff increases the waiting interval between retries, for example one second, then two seconds, then four seconds. A maximum delay and a maximum number of attempts keep the process bounded. Jitter adds a small random variation so many clients do not retry simultaneously.

Backoff reduces pressure on a recovering service. It does not guarantee eventual success. After the retry budget is exhausted, show a useful failure state and let the user decide whether to try again.

## Idempotency

An operation is idempotent when repeating it has the same intended effect as performing it once. Setting a profile name to a given value is idempotent. Incrementing a counter is not ordinarily idempotent.

For a payment or an order, attach a stable idempotency key to the logical operation. The server records the key and result together. A repeated request with the same key returns the existing result rather than creating another operation. Generating a new key for each retry defeats this protection.

## Queues and duplicate work

With at-least-once message delivery, duplicate processing is expected. A consumer can use a unique message identifier and a database constraint to prevent duplicate business effects. The deduplication record and the business change should be committed in the same transaction.

For example, a receipt worker can record that it handled order 42. A redelivered message for order 42 must not produce a second business action simply because it is received again.
