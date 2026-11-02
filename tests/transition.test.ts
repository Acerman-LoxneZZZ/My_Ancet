import {describe,it,expect,vi} from 'vitest';
import {createTransitionController} from '../src/navigation/TransitionController';

// request() never changes history itself: kind reaches swap unchanged.
// state: idle | covering | swapping | uncovering | disposed.
// All async paths must release the input lock; dispose invalidates pending work.
const deferred=()=>{let resolve!:()=>void;let reject!:(e:Error)=>void;const promise=new Promise<void>((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve()};
const request=(path:string,kind:'push'|'replace'|'pop'='push')=>({key:path,path,kind,scroll:'top' as const});

describe('route transition transactions',()=>{
 it('latest request wins while the screen is covering',async()=>{
  const gate=deferred();const swap=vi.fn(async()=>{});const uncover=vi.fn(async()=>{});
  const c=createTransitionController({cover:()=>gate.promise,swap,uncover,onError:vi.fn()});
  c.request(request('/work/timepiece'));c.request(request('/work/faro'));c.request(request('/work/egypt'));
  expect(swap).not.toHaveBeenCalled();expect(c.state).toBe('covering');
  gate.resolve();await flush();
  expect(swap).toHaveBeenCalledTimes(1);expect(swap.mock.calls[0]?.[0]).toMatchObject({path:'/work/egypt'});
  expect(uncover).toHaveBeenCalledTimes(1);expect(c.state).toBe('idle');
 });
 it('coalesces repeated clicks and preserves POP without manufacturing PUSH',async()=>{
  const gate=deferred();const swap=vi.fn(async()=>{});const cover=vi.fn(()=>gate.promise);
  const c=createTransitionController({cover,swap,uncover:async()=>{},onError:vi.fn()});
  c.request(request('/work/faro','pop'));c.request(request('/work/faro','pop'));gate.resolve();await flush();
  expect(cover).toHaveBeenCalledTimes(1);expect(swap).toHaveBeenCalledTimes(1);
  expect(swap.mock.calls[0]?.[0]).toMatchObject({kind:'pop'});expect(c.state).toBe('idle');
 });
 it.each(['cover','swap','uncover'] as const)('recovers after a rejected %s and accepts the next navigation',async(stage)=>{
  let fail=true;const onError=vi.fn();const maybe=async()=>{if(fail){fail=false;throw new Error(stage)}};
  const functions={cover:async()=>{},swap:async()=>{},uncover:async()=>{},onError};functions[stage]=maybe;
  const c=createTransitionController(functions);c.request(request('/work/timepiece'));await flush();
  expect(c.state).toBe('idle');expect(onError).toHaveBeenCalledTimes(1);
  c.request(request('/work/wordflow'));await flush();expect(c.state).toBe('idle');expect(onError).toHaveBeenCalledTimes(1);
 });
 it('runs a newer request arriving during swap before exposing the page',async()=>{
  const gate=deferred();const paths:string[]=[];
  const swap=vi.fn(async(r:{path:string})=>{paths.push(r.path);if(paths.length===1)await gate.promise});
  const c=createTransitionController({cover:async()=>{},swap,uncover:async()=>{},onError:vi.fn()});
  c.request(request('/work/timepiece'));await flush();c.request(request('/work/faro'));gate.resolve();await flush();
  expect(paths.at(-1)).toBe('/work/faro');expect(c.state).toBe('idle');
 });
 it('does not swap a late page after disposal',async()=>{
  const gate=deferred();const swap=vi.fn(async()=>{});
  const c=createTransitionController({cover:()=>gate.promise,swap,uncover:async()=>{},onError:vi.fn()});
  c.request(request('/work/timepiece'));c.dispose();c.dispose();gate.resolve();await flush();
  expect(swap).not.toHaveBeenCalled();expect(c.state).toBe('disposed');
 });
});
