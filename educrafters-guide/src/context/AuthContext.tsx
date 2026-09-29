import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase,isConfigured} from '../supabaseClient';
import {messageOf} from '../lib/study';
export interface DBUser {stud_id:number;fname:string;lname:string;auth_user_id:string}
interface AuthState {session:Session|null;user:DBUser|null;onboarded:boolean;loading:boolean;error:string;refresh:()=>Promise<void>;logout:()=>Promise<void>}
const Context=createContext<AuthState|null>(null);
export function AuthProvider({children}:{children:ReactNode}) {
 const [session,setSession]=useState<Session|null>(null),[user,setUser]=useState<DBUser|null>(null),[onboarded,setOnboarded]=useState(false),[loading,setLoading]=useState(isConfigured),[error,setError]=useState('');
 const refresh=useCallback(async()=>{
  if (!isConfigured) return;
  setError('');
  try {
   const {data:{session:current},error:sessionError}=await supabase.auth.getSession();
   if(sessionError) throw sessionError;
   setSession(current);
   if(!current){setUser(null);setOnboarded(false);return;}
   const {data,error:fetchError}=await supabase.from('users').select('*').eq('auth_user_id',current.user.id).single();
   if(fetchError) throw new Error('We couldn’t load your account. Please retry.');
   const {data:profile,error:profileError}=await supabase.from('profiles').select('user_id').eq('user_id',data.stud_id).maybeSingle();
   if(profileError) throw new Error('We couldn’t load your study profile. Please retry.');
   setUser(data);setOnboarded(Boolean(profile));
  }catch(e){setError(messageOf(e));}finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  void refresh();
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{
   setSession(next);
   if(!next){setUser(null);setOnboarded(false);setLoading(false);}else queueMicrotask(()=>void refresh());
  });
  return ()=>subscription.unsubscribe();
 },[refresh]);
 const logout=async()=>{const {error}=await supabase.auth.signOut();if(error)throw error;setUser(null);setSession(null);setOnboarded(false);};
 return <Context.Provider value={{session,user,onboarded,loading,error,refresh,logout}}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider missing');return value;}
