import {useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {ArrowLeft,BookOpen,Check,CheckCircle2,ChevronDown,PanelLeftClose,PanelLeftOpen,MessageSquare,FileText,ExternalLink} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {supabase} from '@/supabaseClient';
import {useAuth} from '@/context/AuthContext';
import {api} from '@/lib/api';
import {type Course,type Chapter,type Material,courseTitle,progressPercent,messageOf} from '@/lib/study';
import {Loading,ErrorState,Empty,Tag} from './shared';
import Chat from './Chat';
import Practice from './Practice';
import {toast} from 'sonner';
function MaterialReader({course,material}:{course:Course;material:Material}){
 const [url,setUrl]=useState('');
 const content=useQuery({queryKey:['material-content',course.course_id,material.id],queryFn:async()=>{
  const blob=await api(`/api/courses/${encodeURIComponent(course.course_name)}/materials/${material.id}`,undefined,true) as Blob;
  return material.format==='pdf'?blob:await blob.text();
 }});
 useEffect(()=>{if(content.data instanceof Blob){const value=URL.createObjectURL(content.data);setUrl(value);return()=>URL.revokeObjectURL(value);}setUrl('');},[content.data]);
 if(content.isLoading)return <Loading text="Opening material…"/>;
 if(content.error)return <ErrorState message={messageOf(content.error)} retry={()=>void content.refetch()}/>;
 if(material.format==='pdf')return url?<div className="pdf-reader"><a href={url} target="_blank" rel="noreferrer" className="text-link">Open PDF in a new tab<ExternalLink size={13}/></a><iframe title={material.name} src={url}/></div>:<Loading/>;
 const lines=String(content.data||'').split('\n');
 return <article className="document-text">{lines.map((line,i)=>line.startsWith('# ')?<h1 key={i}>{line.slice(2)}</h1>:line.startsWith('## ')?<h2 key={i}>{line.slice(3)}</h2>:line.startsWith('### ')?<h3 key={i}>{line.slice(4)}</h3>:line.trim()?<p key={i}>{line}</p>:null)}</article>;
}
export default function Workspace(){const {courseId}=useParams();return <CourseWorkspace key={courseId} courseId={Number(courseId)}/>;}
function CourseWorkspace({courseId}:{courseId:number}){
 const {user}=useAuth(),cache=useQueryClient();const [params,setParams]=useSearchParams(),[collapsed,setCollapsed]=useState(false),[saving,setSaving]=useState(false);
 const view=['materials','assistant','practice'].includes(params.get('view')||'')?params.get('view')!:'assistant';
 const query=useQuery({queryKey:['course',courseId,user?.stud_id],queryFn:async()=>{
  if(!Number.isSafeInteger(courseId)||courseId<=0)throw new Error('This course could not be found.');
  const result=await Promise.all([supabase.from('courses').select('*').eq('course_id',courseId).single(),supabase.from('chapters').select('*').eq('course_id',courseId).order('chapter_number'),supabase.from('chapter_progress').select('*'),supabase.from('enrollment').select('enrollment_id').eq('course_id',courseId).maybeSingle()]);
  result.forEach(r=>{if(r.error)throw r.error;});if(!result[3].data)throw new Error('You are not enrolled in this course.');
  return {course:result[0].data as Course,chapters:result[1].data as Chapter[],progress:result[2].data as {chapter_id:number;completed:boolean}[]};
 }});
 const materials=useQuery({queryKey:['materials',courseId],enabled:Boolean(query.data),queryFn:async()=>await api(`/api/courses/${encodeURIComponent(query.data!.course.course_name)}/materials`) as {materials:Material[]}});
 const activeCourseId=query.data?.course.course_id;
 const studentId=user?.stud_id;
 useEffect(()=>{if(!activeCourseId||!studentId)return;void supabase.from('learning_progress').upsert({user_id:studentId,course_id:activeCourseId,updated_at:new Date().toISOString()},{onConflict:'user_id,course_id'}).then(({error})=>{if(!error)void cache.invalidateQueries({queryKey:['dashboard']});});},[activeCourseId,studentId,cache]);
 if(query.isLoading)return <Loading/>;
 if(query.error)return <div className="page-pad"><Link className="text-link" to="/dashboard"><ArrowLeft size={15}/>Back to courses</Link><ErrorState message={messageOf(query.error)} retry={()=>void query.refetch()}/></div>;
 const {course,chapters,progress}=query.data!;
 const selected=materials.data?.materials.find(m=>m.id===params.get('material'))||materials.data?.materials[0];
 const chapter=chapters.find(c=>c.chapter_name===selected?.chapter),completed=Boolean(chapter&&progress.some(p=>p.chapter_id===chapter.chapter_id&&p.completed));
 const percent=progressPercent(chapters.filter(c=>progress.some(p=>p.chapter_id===c.chapter_id&&p.completed)).length,chapters.length);
 function changeView(next:string){setParams(prev=>{prev.set('view',next);return prev;},{replace:true});}
 function select(id:string){setCollapsed(false);setParams(prev=>{prev.set('material',id);prev.set('view','materials');return prev;},{replace:true});}
 async function toggleComplete(){if(!chapter||saving)return;setSaving(true);try{const {error}=await supabase.from('chapter_progress').upsert({user_id:user!.stud_id,chapter_id:chapter.chapter_id,completed:!completed,updated_at:new Date().toISOString()},{onConflict:'user_id,chapter_id'});if(error)throw error;await cache.invalidateQueries({queryKey:['course',courseId]});void cache.invalidateQueries({queryKey:['dashboard']});}catch{toast.error('We couldn’t save your chapter progress. Please retry.');}finally{setSaving(false);}}
 return <div className="workspace"><header className="workspace-heading"><div><Link className="text-link muted" to="/dashboard"><ArrowLeft size={13}/>My courses</Link><h1>{courseTitle(course.course_name)}</h1><div className="course-meta"><Tag>{course.course_code}</Tag><span>{chapters.length} chapters</span><span className="meta-divider"/><span>{percent}% complete</span></div></div><div className="workspace-mode" aria-label="Study view">{[{id:'materials',icon:BookOpen,label:'Materials'},{id:'assistant',icon:MessageSquare,label:'Assistant'},{id:'practice',icon:CheckCircle2,label:'Practice'}].map(item=><button key={item.id} aria-pressed={view===item.id} onClick={()=>changeView(item.id)}><item.icon size={16}/>{item.label}</button>)}</div></header><div className={`study-grid ${collapsed?'materials-collapsed':''} ${view==='practice'?'hidden-view':''}`}><section className={`material-panel ${view!=='materials'?'mobile-hidden':''} ${collapsed?'desktop-hidden':''}`} aria-label="Course material"><header className="panel-header"><div><BookOpen size={17}/><strong>Course material</strong></div><Button variant="ghost" size="icon" className="desktop-only" aria-label="Collapse material panel" onClick={()=>setCollapsed(true)}><PanelLeftClose size={17}/></Button></header>{materials.isLoading?<Loading text="Finding your material…"/>:materials.error?<div className="panel-padding"><ErrorState message={messageOf(materials.error)} retry={()=>void materials.refetch()}/></div>:!selected?<Empty title="Material is being prepared">This course has no processed material yet. Ask the administrator to run ingestion.</Empty>:<><div className="material-selector"><FileText size={16}/><select aria-label="Select course material" value={selected.id} onChange={e=>select(e.target.value)}>{materials.data!.materials.map(m=><option key={m.id} value={m.id}>{m.chapter}</option>)}</select><ChevronDown size={14}/></div><div className="material-scroll"><MaterialReader key={selected.id} course={course} material={selected}/></div><footer className="material-footer"><span className="small muted">{selected.name}</span>{chapter&&<Button variant={completed?'secondary':'outline'} size="sm" disabled={saving} onClick={()=>void toggleComplete()}>{completed?<Check size={14}/>:<CheckCircle2 size={14}/>} {completed?'Completed':'Mark complete'}</Button>}</footer></>}</section><div className={`chat-column ${view!=='assistant'?'mobile-hidden':''}`}>{collapsed&&<button className="restore-materials desktop-only text-link" onClick={()=>setCollapsed(false)}><PanelLeftOpen size={15}/>Show course material</button>}<Chat course={course} chapter="" onSource={select}/></div></div><div className={view==='practice'?'practice-container':'hidden-view'}><Practice course={course} chapters={chapters}/></div></div>;
}
