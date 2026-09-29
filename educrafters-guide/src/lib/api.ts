import { supabase } from '../supabaseClient';
const chatURL = (import.meta.env.VITE_CHAT_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const quizURL = (import.meta.env.VITE_QUIZ_API_URL || 'http://localhost:5050').replace(/\/$/, '');
export async function api(path: string, body?: unknown, blob = false): Promise<unknown> {
 const {data:{session}} = await supabase.auth.getSession();
 if (!session) throw new Error('Your session has expired. Please sign in again.');
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 65000);
 try {
  const response = await fetch(`${path.includes('generate-quiz') ? quizURL : chatURL}${path}`, {
   method: body ? 'POST' : 'GET', signal:controller.signal,
   headers:{Authorization:`Bearer ${session.access_token}`, ...(body ? {'Content-Type':'application/json'} : {})},
   ...(body ? {body:JSON.stringify(body)} : {})
  });
  if (!response.ok) {
   const error = await response.json().catch(() => ({}));
   throw new Error(error.error || 'The service could not complete your request. Please retry.');
  }
  return blob ? response.blob() : response.json();
 } catch(error) {
  if (error instanceof DOMException && error.name === 'AbortError') throw new Error('This took longer than expected. Please retry.');
  if (error instanceof TypeError) throw new Error('Could not reach the study service. Check your connection and try again.');
  throw error;
 } finally {clearTimeout(timer);}
}
