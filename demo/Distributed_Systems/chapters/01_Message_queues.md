# Small pieces. Reliable systems.

## Message queues

A message queue sits between a producer and a consumer. The producer writes a message describing work to be done. The consumer reads messages and performs that work at its own pace.

This separates sending a task from processing it. A producer does not need to wait for every consumer to finish. A queue can absorb a short burst of work when consumers are temporarily busy. It cannot fix an indefinitely overloaded system: if messages arrive faster than they are processed for a long time, the backlog grows.

## An everyday example

A café takes orders at the counter and places them on a rail. The cashier is the producer, the rail is the queue, and the barista is the consumer. Taking an order and making a coffee happen independently. The rail makes waiting work visible.

In software, an online shop can place a send-receipt message on a queue after accepting an order. An email service consumes it. A temporary email outage does not have to block the order response.

## Delivery and acknowledgments

With at-least-once delivery, a message can arrive more than once. A consumer acknowledges a message after completing its work. If the acknowledgment is lost, the broker may deliver the message again. Consumers should therefore handle duplicates safely.

A queue does not automatically guarantee exactly-once business effects. Queue delivery guarantees and application side effects are separate concerns. Multiple consumers also do not automatically preserve completion order.

## The trade-off

Queues add operational complexity and eventual rather than immediate completion. Monitor queue depth, processing latency, and failed messages. Use a dead-letter queue for repeatedly failing messages so they can be investigated without blocking other work.
