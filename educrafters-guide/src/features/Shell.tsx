import {useState} from 'react';
import {NavLink,Link,useLocation} from 'react-router-dom';
import {BookOpen,LayoutDashboard,LogOut,Menu,ArrowUpRight} from 'lucide-react';
import {Sheet,SheetContent,SheetTitle,SheetTrigger,SheetDescription} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/context/AuthContext';
import {Brand} from './shared';
import {toast} from 'sonner';
import {messageOf} from '@/lib/study';
export default function Shell({children}:{children:React.ReactNode}){
 const {user,logout}=useAuth(),location=useLocation();const [open,setOpen]=useState(false);
const navigation=<><div className="sidebar-top"><Brand/></div><div className="nav-caption">YOUR WORKSPACE</div><nav className="side-nav" aria-label="Main navigation"><NavLink to="/dashboard" onClick={()=>setOpen(false)}><LayoutDashboard size={18}/>Overview</NavLink><NavLink to="/courses" onClick={()=>setOpen(false)}><BookOpen size={18}/>My courses</NavLink></nav><div className="sidebar-note"><span className="tiny-label">A LITTLE EVERY DAY</span><p>Make room for<br/>your next idea.</p><span>One question is a good start.</span></div><div className="sidebar-bottom"><Link className="about-link" to="/" onClick={()=>setOpen(false)}>About IntuiLearn<ArrowUpRight size={14}/></Link><div className="account"><div className="avatar">{user?.fname?.[0]||'S'}{user?.lname?.[0]||''}</div><div><strong>{user?.fname} {user?.lname}</strong><span>Student workspace</span></div><Button variant="ghost" size="icon" aria-label="Sign out" onClick={async()=>{try{await logout();window.location.replace('/');}catch(e){toast.error(messageOf(e));}}}><LogOut size={16}/></Button></div></div></>;
 return <div className="app-shell"><a className="skip-link" href="#main">Skip to content</a><aside className="sidebar">{navigation}</aside><div className="app-body"><header className="app-topbar"><div className="mobile-menu"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation"><Menu size={21}/></Button></SheetTrigger><SheetContent side="left" className="mobile-sidebar" onEscapeKeyDown={()=>setOpen(false)} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);}}><SheetTitle className="sr-only">Navigation</SheetTitle><SheetDescription className="sr-only">Your study workspace and account</SheetDescription>{navigation}</SheetContent></Sheet></div><span className="breadcrumb">Workspace <span>/</span> <strong>{location.pathname.startsWith('/course/')?'Study room':location.pathname==='/courses'?'My courses':'Overview'}</strong></span><span className="topbar-end"><span className="status-dot"/>Your space to understand</span></header><main id="main" className="app-main">{children}</main></div></div>
}
