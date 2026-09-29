-- IntuiLearn: run only in a fresh Supabase project. Never apply to the old prototype.
begin;
create extension if not exists vector with schema extensions;

create table public.users (
 stud_id bigint generated always as identity primary key,
 auth_user_id uuid not null unique references auth.users(id) on delete cascade,
 fname text not null default '', lname text not null default '',
 created_at timestamptz not null default now()
);
create table public.profiles (
 user_id bigint primary key references public.users on delete cascade,
 major text not null, academic_year text not null,
 study_hours_per_week integer not null default 10 check(study_hours_per_week between 1 and 60),
 goals text not null default '', updated_at timestamptz not null default now()
);
create table public.courses (
 course_id bigint generated always as identity primary key,
 course_code text not null unique, course_name text not null unique,
 description text not null default '', instructor text not null default '',
 created_at timestamptz not null default now()
);
create table public.enrollment (
 enrollment_id bigint generated always as identity primary key,
 user_id bigint not null references public.users on delete cascade,
 course_id bigint not null references public.courses on delete cascade,
 enrolled_at timestamptz not null default now(), unique(user_id,course_id)
);
create table public.chapters (
 chapter_id bigint generated always as identity primary key,
 course_id bigint not null references public.courses on delete cascade,
 chapter_name text not null, chapter_number integer not null,
 unique(course_id,chapter_name)
);
create table public.chapter_progress (
 user_id bigint not null references public.users on delete cascade,
 chapter_id bigint not null references public.chapters on delete cascade,
 completed boolean not null default false, updated_at timestamptz not null default now(),
 primary key(user_id,chapter_id)
);
create table public.suggested_questions (
 id bigint generated always as identity primary key,
 course_id bigint not null references public.courses on delete cascade,
 question text not null, unique(course_id,question)
);
create table public.chat_memory (
 id bigint generated always as identity primary key,
 user_id bigint not null references public.users on delete cascade,
 course_name text not null references public.courses(course_name) on delete cascade,
 role text not null check(role in ('user','assistant')), content text not null,
 sources jsonb not null default '[]', created_at timestamptz not null default now()
);
create index chat_history_idx on public.chat_memory(user_id,course_name,created_at);
create table public.quiz_results (
 result_id uuid primary key default gen_random_uuid(),
 student bigint not null references public.users on delete cascade,
 enrollment_id bigint not null references public.enrollment on delete cascade,
 correct integer not null check(correct>=0), total integer not null check(total>0),
 score numeric not null check(score between 0 and 100),
 created_at timestamptz not null default now(), check(correct<=total)
);
create table public.learning_progress (
 user_id bigint not null references public.users on delete cascade,
 course_id bigint not null references public.courses on delete cascade,
 updated_at timestamptz not null default now(), primary key(user_id,course_id)
);
create table public.documents (
 id text primary key, course_name text not null references public.courses(course_name) on delete cascade,
 material_id text not null, source text not null, chapter text not null, doc_type text not null,
 chunk_text text not null, embedding extensions.vector(384) not null,
 section text not null default ''
);

create function public.current_student_id() returns bigint language sql stable security definer
set search_path = '' as $$ select stud_id from public.users where auth_user_id = (select auth.uid()) $$;
create function public.is_enrolled(cid bigint) returns boolean language sql stable security definer
set search_path = '' as $$ select exists(select 1 from public.enrollment where user_id=public.current_student_id() and course_id=cid) $$;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.users(auth_user_id,fname,lname) values(new.id,coalesce(new.raw_user_meta_data->>'firstName',''),coalesce(new.raw_user_meta_data->>'lastName',''));
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.complete_onboarding(major text, academic_year text, study_hours integer, goals text, course_ids bigint[])
returns void language plpgsql security definer set search_path = '' as $$
declare uid bigint := public.current_student_id();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if length(trim(major))=0 or length(trim(academic_year))=0 or coalesce(cardinality(course_ids),0)=0 then raise exception 'Profile and at least one course required'; end if;
 if exists(select 1 from unnest(course_ids) c where not exists(select 1 from public.courses where course_id=c)) then raise exception 'Unknown course'; end if;
 insert into public.profiles(user_id,major,academic_year,study_hours_per_week,goals) values(uid,major,academic_year,study_hours,coalesce(goals,''))
 on conflict(user_id) do update set major=excluded.major,academic_year=excluded.academic_year,study_hours_per_week=excluded.study_hours_per_week,goals=excluded.goals,updated_at=now();
 insert into public.enrollment(user_id,course_id) select uid,unnest(course_ids) on conflict(user_id,course_id) do nothing;
end $$;

create function public.match_documents(query extensions.vector(384), course text, chapter_filter text default '', min_similarity float default 0.3, k int default 5)
returns table(id text, material_id text, source text, chapter text, doc_type text, chunk_text text, similarity float)
language sql stable security invoker set search_path = public,extensions as $$
 select d.id,d.material_id,d.source,d.chapter,d.doc_type,d.chunk_text,1-(d.embedding <=> query)
 from public.documents d where d.course_name=course and (chapter_filter='' or d.chapter=chapter_filter)
 and 1-(d.embedding <=> query)>=min_similarity order by d.embedding <=> query limit least(greatest(k,1),10)
$$;
-- Replacing a course's chunks is a single transaction. Only the ingestion service may call it.
create function public.replace_course_documents(course text, chunks jsonb) returns void
language plpgsql security definer set search_path = public,extensions as $$
begin
 if jsonb_array_length(chunks)=0 then raise exception 'Cannot replace index with empty chunks'; end if;
 delete from public.documents where course_name=course;
 insert into public.documents(id,course_name,material_id,source,chapter,doc_type,chunk_text,embedding,section)
 select x->>'id',course,x->>'material_id',x->>'source',x->>'chapter',x->>'doc_type',x->>'chunk_text',(x->>'embedding')::vector(384),coalesce(x->>'section','') from jsonb_array_elements(chunks) x;
end $$;

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollment enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_progress enable row level security;
alter table public.suggested_questions enable row level security;
alter table public.chat_memory enable row level security;
alter table public.quiz_results enable row level security;
alter table public.learning_progress enable row level security;
alter table public.documents enable row level security;
create policy own_user on public.users for select to authenticated using(auth_user_id=(select auth.uid()));
create policy own_profile on public.profiles for select to authenticated using(user_id=public.current_student_id());
create policy catalog on public.courses for select to anon,authenticated using(true);
create policy own_enrollment on public.enrollment for select to authenticated using(user_id=public.current_student_id());
create policy enrolled_chapters on public.chapters for select to authenticated using(public.is_enrolled(course_id));
create policy own_completion on public.chapter_progress for all to authenticated
 using(user_id=public.current_student_id()) with check(user_id=public.current_student_id() and exists(select 1 from public.chapters c where c.chapter_id=chapter_progress.chapter_id and public.is_enrolled(c.course_id)));
create policy enrolled_suggestions on public.suggested_questions for select to authenticated using(public.is_enrolled(course_id));
create policy own_chat on public.chat_memory for all to authenticated using(user_id=public.current_student_id())
 with check(user_id=public.current_student_id() and exists(select 1 from public.courses c where c.course_name=chat_memory.course_name and public.is_enrolled(c.course_id)));
create policy own_quiz on public.quiz_results for all to authenticated using(student=public.current_student_id())
 with check(student=public.current_student_id() and exists(select 1 from public.enrollment e where e.enrollment_id=quiz_results.enrollment_id and e.user_id=public.current_student_id()));
create policy own_activity on public.learning_progress for all to authenticated using(user_id=public.current_student_id()) with check(user_id=public.current_student_id() and public.is_enrolled(course_id));
create policy enrolled_documents on public.documents for select to authenticated using(exists(select 1 from public.courses c where c.course_name=documents.course_name and public.is_enrolled(c.course_id)));

revoke all on all tables in schema public from anon,authenticated;
grant select on public.courses to anon,authenticated;
grant select on public.users,public.profiles,public.enrollment,public.chapters,public.suggested_questions,public.documents to authenticated;
grant select,insert,update on public.chapter_progress,public.quiz_results,public.learning_progress to authenticated;
grant select,insert on public.chat_memory to authenticated;
grant usage,select on all sequences in schema public to authenticated;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.current_student_id(),public.is_enrolled(bigint),public.complete_onboarding(text,text,integer,text,bigint[]),public.match_documents(extensions.vector,text,text,float,integer) from public;
grant execute on function public.current_student_id(),public.is_enrolled(bigint),public.complete_onboarding(text,text,integer,text,bigint[]),public.match_documents(extensions.vector,text,text,float,integer) to authenticated;
revoke execute on function public.replace_course_documents(text,jsonb) from public,anon,authenticated;
grant execute on function public.replace_course_documents(text,jsonb) to service_role;
commit;
