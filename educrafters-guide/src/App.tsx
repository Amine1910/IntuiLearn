import {lazy,Suspense,type ReactNode,useEffect} from 'react';
import {BrowserRouter,Routes,Route,Navigate,useLocation,Link} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Toaster} from 'sonner';
import {AuthProvider,useAuth} from './context/AuthContext';
import {isConfigured} from './supabaseClient';
import {TooltipProvider} from './components/ui/tooltip';
import {Setup,Loading,ErrorState,Brand} from './features/shared';
const Landing=lazy(()=>import('./features/Landing'));
const AuthPage=lazy(()=>import('./features/Auth').then(module=>({default:module.AuthPage})));
const Onboarding=lazy(()=>import('./features/Auth').then(module=>({default:module.Onboarding})));
const Dashboard=lazy(()=>import('./features/Dashboard'));
const Workspace=lazy(()=>import('./features/Workspace'));
const Shell=lazy(()=>import('./features/Shell'));
const cache=new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false,staleTime:30000}}});
interface GuardState {configured:boolean;loading:boolean;hasSession:boolean;error:string;onboarded:boolean;onboarding:boolean}
export function guardView(state:GuardState){if(!state.configured)return 'setup';if(state.loading)return 'loading';if(state.error)return 'error';if(!state.hasSession)return 'login';if(!state.onboarding&&!state.onboarded)return 'onboarding';return 'content';}
function Guard({children,onboarding=false}:{children:ReactNode;onboarding?:boolean}){const auth=useAuth();const view=guardView({configured:isConfigured,loading:auth.loading,hasSession:Boolean(auth.session),error:auth.error,onboarded:auth.onboarded,onboarding});if(view==='setup')return <Setup/>;if(view==='loading')return <Loading/>;if(view==='error')return <div className="setup-page"><Brand/><ErrorState message={auth.error} retry={()=>void auth.refresh()}/></div>;if(view==='login')return <Navigate to="/login" replace/>;if(view==='onboarding')return <Navigate to="/onboarding" replace/>;return <>{children}</>;}
function PageEffects(){const {pathname}=useLocation();const {session}=useAuth();useEffect(()=>{window.scrollTo(0,0);document.title=`${pathname.startsWith('/course/')?'Study room':pathname==='/dashboard'?'Your workspace':pathname==='/login'?'Sign in':pathname==='/signup'?'Join':'Learn with clarity'} · IntuiLearn`;},[pathname]);useEffect(()=>{cache.clear();},[session?.user.id]);return null;}
export default function App(){return <QueryClientProvider client={cache}><AuthProvider><TooltipProvider><BrowserRouter><PageEffects/><Suspense fallback={<Loading/>}><Routes><Route path="/" element={<Landing/>}/><Route path="/login" element={isConfigured?<AuthPage/>:<Setup/>}/><Route path="/signup" element={isConfigured?<AuthPage signup/>:<Setup/>}/><Route path="/onboarding" element={<Guard onboarding><Onboarding/></Guard>}/><Route path="/welcome" element={<Navigate to="/onboarding" replace/>}/><Route path="/dashboard" element={<Guard><Shell><Dashboard/></Shell></Guard>}/><Route path="/courses" element={<Guard><Shell><Dashboard/></Shell></Guard>}/><Route path="/course/:courseId" element={<Guard><Shell><Workspace/></Shell></Guard>}/><Route path="*" element={<div className="setup-page"><Brand/><h1>This page took a different path.</h1><Link className="text-link" to="/">Return home →</Link></div>}/></Routes></Suspense><Toaster richColors position="bottom-right"/></BrowserRouter></TooltipProvider></AuthProvider></QueryClientProvider>}
