import {test,expect,type Page} from '@playwright/test';
const course={course_id:1,course_code:'CS 204',course_name:'Distributed_Systems',description:'Understand queues, retries, and the trade-offs behind reliable software.',instructor:'IntuiLearn Studio'};
const material={id:'material-1',name:'01_Message_queues.md',chapter:'01 Message queues',type:'chapter',format:'md'};
const chapter={chapter_id:1,course_id:1,chapter_name:material.chapter,chapter_number:1};
async function fixture(page:Page,{auth=true,onboarded=true,failChat=false,failQuizSave=false}={}){
 let completed=false;let chatAttempts=0;let quizSaveAttempts=0;
 const session={access_token:'test-access-token',refresh_token:'test-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'test-user',aud:'authenticated',role:'authenticated',email:'student@example.test',user_metadata:{firstName:'Alex',lastName:'Morgan'}}};
 if(auth)await page.addInitScript(session=>{localStorage.setItem('sb-intuilearn-test-auth-token',JSON.stringify(session));},session);
 await page.route('https://intuilearn-test.supabase.co/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  let data:unknown=[];
  if(path.includes('/auth/v1/token'))data=session;
  else if(path.includes('/auth/v1/signup'))data={user:session.user,session:null};
  else if(path.includes('/auth/v1/user'))data=session.user;
  else if(path.endsWith('/users'))data={stud_id:1,auth_user_id:'test-user',fname:'Alex',lname:'Morgan'};
  else if(path.endsWith('/profiles'))data=onboarded?{user_id:1}:null;
  else if(path.includes('/rpc/complete_onboarding')){onboarded=true;data=null;}
  else if(path.endsWith('/courses'))data=url.searchParams.has('course_id')?course:[course];
  else if(path.endsWith('/enrollment'))data=url.searchParams.has('course_id')?{enrollment_id:1}:[{enrollment_id:1,courses:course}];
  else if(path.endsWith('/chapters'))data=[chapter];
  else if(path.endsWith('/chapter_progress')){if(route.request().method()==='POST')completed=route.request().postDataJSON().completed;data=completed?[{user_id:1,chapter_id:1,completed:true}]:[];}
  else if(path.endsWith('/suggested_questions'))data=[{question:'Why use a queue between services?'}];
  else if(path.endsWith('/quiz_results')&&route.request().method()==='POST'&&failQuizSave&&quizSaveAttempts++===0){await route.fulfill({status:503,json:{message:'Unavailable'}});return;}
  await route.fulfill({json:data});
 });
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/api/ask')){chatAttempts++;if(failChat&&chatAttempts===1){await route.fulfill({status:503,json:{error:'The AI service is temporarily unavailable.'}});return;}await route.fulfill({json:{answer:'A queue separates sending work from processing it. The producer and consumer can work independently.',sources:[{material_id:material.id,name:material.name,chapter:material.chapter,type:'chapter'}]}});}
  else if(path.endsWith('/generate-quiz')){const body=route.request().postDataJSON();await route.fulfill({json:{questions:Array.from({length:body.numQuestions},(_,i)=>({id:String(i+1),question:'What does a queue separate?',options:['Producing and consuming','Names and dates','Files and folders','Colors and shapes'],correctAnswer:0,explanation:'The producer sends work; the consumer processes it.',type:'Multiple Choice'}))}});}
  else if(path.endsWith('/materials'))await route.fulfill({json:{materials:[material]}});
  else await route.fulfill({contentType:'text/plain',body:'# Small pieces. Reliable systems.\n\n## Message queues\n\nA message queue sits between a producer and a consumer. The producer can keep working while the consumer processes messages at its own pace.\n\n## An everyday example\n\nA café takes orders at the counter and places them on a rail. Taking an order and making a coffee happen independently.\n\n## The trade-off\n\nQueues add operational complexity. Monitor queue depth, processing latency, and failed messages.'});
 });
}
for(const width of [375,768,1440])test(`workspace works at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await fixture(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/dashboard');await expect(page.getByRole('heading',{name:'Hello, Alex.'})).toBeVisible();
 if(width===1440)await page.screenshot({path:'../docs/screenshots/dashboard-desktop.png',fullPage:true});
 await page.getByRole('link',{name:/CS 204/}).click();await expect(page.getByRole('heading',{name:'Distributed Systems'})).toBeVisible();
 await page.getByLabel('Ask your course assistant').fill('Why do queues help?');await page.getByRole('button',{name:'Send question',exact:true}).click();await expect(page.getByText('A queue separates sending work',{exact:false})).toBeVisible();
 await page.getByText('1 course source').click();await page.getByRole('button',{name:material.name,exact:true}).click();await expect(page.getByRole('heading',{name:'Small pieces. Reliable systems.'})).toBeVisible();
 if(width===1440)await page.screenshot({path:'../docs/screenshots/sourced-answer.png',fullPage:true});
 await page.getByRole('button',{name:'Mark complete'}).click();await expect(page.getByRole('button',{name:'Completed',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Practice',exact:true}).click();await page.getByLabel('Number of questions').fill('1');await page.getByRole('button',{name:'Create practice quiz'}).click();await page.getByText('Producing and consuming',{exact:true}).click();
 await page.getByRole('button',{name:'Assistant',exact:true}).click();await page.getByLabel('Ask your course assistant').fill('Keep this draft');await page.getByRole('button',{name:'Practice',exact:true}).click();await expect(page.getByRole('radio',{name:'A Producing and consuming'})).toBeChecked();
 await page.getByRole('button',{name:'Finish & review'}).click();await expect(page.getByRole('heading',{name:'100% correct'})).toBeVisible();await expect(page.getByText('Result saved to your workspace.')).toBeVisible();
 if(width===1440)await page.screenshot({path:'../docs/screenshots/quiz-review.png',fullPage:true});
 await page.getByRole('button',{name:'Assistant',exact:true}).click();await expect(page.getByLabel('Ask your course assistant')).toHaveValue('Keep this draft');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:`../docs/screenshots/workspace-${width}.png`,fullPage:true});
});
test('failed question can be retried without duplicate user message',async({page})=>{await fixture(page,{failChat:true});await page.goto('/course/1');await page.getByLabel('Ask your course assistant').fill('Explain queues');await page.getByRole('button',{name:'Send question',exact:true}).click();await expect(page.getByRole('alert')).toContainText('temporarily unavailable');await expect(page.getByLabel('Ask your course assistant')).toHaveValue('Explain queues');await page.getByRole('button',{name:'Retry this question'}).click();await expect(page.locator('.chat-message.user')).toHaveCount(1);await expect(page.locator('.chat-message.assistant')).toHaveCount(1);});
test('completed quiz remains reviewable when saving fails',async({page})=>{await fixture(page,{failQuizSave:true});await page.goto('/course/1?view=practice');await page.getByLabel('Number of questions').fill('1');await page.getByRole('button',{name:'Create practice quiz'}).click();await page.getByText('Producing and consuming',{exact:true}).click();await page.getByRole('button',{name:'Finish & review'}).click();await expect(page.getByRole('heading',{name:'100% correct'})).toBeVisible();await expect(page.getByRole('alert')).toContainText('couldn’t save');await page.getByRole('button',{name:'Retry saving result'}).click();await expect(page.getByText('Result saved to your workspace.')).toBeVisible();});
test('login restores session and logout returns home',async({page})=>{await fixture(page,{auth:false});await page.goto('/login');await page.getByLabel('Email address').fill('student@example.test');await page.getByLabel('Password',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/dashboard/);await page.reload();await expect(page.getByRole('heading',{name:'Hello, Alex.'})).toBeVisible();await page.getByRole('button',{name:'Sign out'}).click();await expect(page).toHaveURL('/');});
test('onboarding completes after a confirmed account',async({page})=>{await fixture(page,{onboarded:false});await page.goto('/dashboard');await expect(page).toHaveURL(/onboarding/);await page.getByLabel('Field of study').fill('Computer Science');await page.getByLabel('Academic year').selectOption('Second year');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Enter your workspace'}).click();await expect(page).toHaveURL(/dashboard/);});
test('signup handles required email confirmation',async({page})=>{await fixture(page,{auth:false});await page.goto('/signup');await page.getByLabel('First name').fill('Alex');await page.getByLabel('Last name').fill('Morgan');await page.getByLabel('Email address').fill('student@example.test');await page.getByLabel('Password',{exact:true}).fill('test-password');await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page.getByRole('heading',{name:'Check your inbox.'})).toBeVisible();});
test('landing is responsive and navigation works',async({page})=>{await page.setViewportSize({width:375,height:850});await fixture(page,{auth:false});await page.goto('/');await expect(page.getByRole('heading',{name:'Less searching. More understanding.'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'../docs/screenshots/landing-mobile.png',fullPage:true});await page.getByRole('link',{name:'Start learning'}).click();await expect(page).toHaveURL(/signup/);});
test('landing portfolio view is clear on desktop',async({page})=>{await page.setViewportSize({width:1440,height:1000});await fixture(page,{auth:false});await page.goto('/');await expect(page.getByRole('heading',{name:'Less searching. More understanding.'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'../docs/screenshots/landing-desktop.png',fullPage:true});});
test('keyboard navigation and reduced motion remain usable',async({page})=>{await page.setViewportSize({width:375,height:850});await page.emulateMedia({reducedMotion:'reduce'});await fixture(page);await page.goto('/dashboard');await expect(page.getByRole('heading',{name:'Hello, Alex.'})).toBeVisible();await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();const menu=page.getByRole('button',{name:'Open navigation'});await menu.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await dialog.press('Escape');await expect(dialog).toBeHidden();const duration=await menu.evaluate(element=>parseFloat(getComputedStyle(element).transitionDuration));expect(duration).toBeLessThan(.001);});
test('visual system uses readable type and a strong blue workspace hierarchy',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await fixture(page);await page.goto('/dashboard');
 const bodySize=await page.locator('body').evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
 const headingSize=await page.getByRole('heading',{name:'Hello, Alex.'}).evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
 const sidebarColor=await page.locator('.sidebar').evaluate(element=>getComputedStyle(element).backgroundColor);
 const primaryHeight=await page.getByRole('link',{name:'My courses'}).evaluate(element=>element.getBoundingClientRect().height);
 expect(bodySize).toBeGreaterThanOrEqual(16);expect(headingSize).toBeGreaterThanOrEqual(40);expect(sidebarColor).toBe('rgb(15, 23, 42)');expect(primaryHeight).toBeGreaterThanOrEqual(44);
});
