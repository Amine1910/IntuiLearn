insert into public.courses(course_code,course_name,description,instructor)
values('CS 204','Distributed_Systems','A practical introduction to reliable systems: queues, retries, and the trade-offs behind everyday software.','IntuiLearn Studio')
on conflict(course_code) do nothing;
insert into public.suggested_questions(course_id,question)
select course_id,q from public.courses cross join (values ('Why do message queues help services stay independent?'),('What makes an operation idempotent?'),('When should a client retry a failed request?')) as questions(q)
where course_name='Distributed_Systems' on conflict do nothing;
