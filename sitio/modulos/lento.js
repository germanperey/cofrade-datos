(function(){if(window.__cnLento)return;window.__cnLento=1;
var E,realInit,realGet,porDom=new Map(),io=null,imprimiendo=false,
COLA={setOption:1,on:1,off:1,dispatchAction:1,showLoading:1,hideLoading:1,clear:1};
function vivo(st){if(st.m||st.real)return st.real;st.real=realInit.apply(E,st.a);for(var i=0;i<st.q.length;i++){try{st.real[st.q[i][0]].apply(st.real,st.q[i][1])}catch(e){}}st.q.length=0;var z=null;for(var j=0;j<st.zq.length;j++){try{z=z||st.real.getZr();z[st.zq[j][0]].apply(z,st.zq[j][1])}catch(e){}}st.zq.length=0;if(io)io.unobserve(st.el);return st.real}
function todos(){porDom.forEach(function(st){vivo(st)})}
function lazyInit(dom){if(!dom||imprimiendo||!window.IntersectionObserver||!window.Proxy)return realInit.apply(E,arguments);
var prev=porDom.get(dom);if(prev&&!prev.m&&!(prev.real&&prev.real.isDisposed&&prev.real.isDisposed()))return prev.p;
if(!io)io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){var st=porDom.get(x.target);if(st)vivo(st)}})},{rootMargin:'900px 0px'});
var st={el:dom,a:[].slice.call(arguments),q:[],zq:[],over:{},real:null,m:false};
st.p=new Proxy(st,{set:function(t,k,v){t.over[k]=v;return true},get:function(t,k){
 if(Object.prototype.hasOwnProperty.call(t.over,k))return t.over[k];
 if(k==='dispose')return function(){if(t.real){try{t.real.dispose()}catch(e){}}t.m=true;t.q.length=0;if(io)io.unobserve(t.el);if(porDom.get(t.el)===t)porDom.delete(t.el)};
 if(COLA[k])return function(){if(t.real)return t.real[k].apply(t.real,arguments);if(!t.m)t.q.push([k,[].slice.call(arguments)])};
 if(t.real){var v=t.real[k];return typeof v==='function'?v.bind(t.real):v}
 if(k==='getDom')return function(){return t.el};
 if(k==='getZr')return function(){return new Proxy({},{get:function(_,kk){if(t.real){var z=t.real.getZr();var v=z[kk];return typeof v==='function'?v.bind(z):v}if(kk==='on'||kk==='off')return function(){if(!t.m)t.zq.push([kk,[].slice.call(arguments)])};if(kk==='then'||typeof kk==='symbol')return undefined;var r=vivo(t);if(!r)return undefined;var z2=r.getZr();var v2=z2[kk];return typeof v2==='function'?v2.bind(z2):v2}})};
 if(k==='isDisposed')return function(){return t.m};
 if(k==='resize')return function(){};
 if(k==='getOption')return function(){for(var i=t.q.length-1;i>=0;i--)if(t.q[i][0]==='setOption')return t.q[i][1][0];return null};
 if(k==='then'||typeof k==='symbol')return undefined;
 if(COLA[k])return function(){if(t.real)return t.real[k].apply(t.real,arguments);if(!t.m)t.q.push([k,[].slice.call(arguments)])};
 var r=vivo(t);if(!r)return undefined;var v2=r[k];return typeof v2==='function'?v2.bind(r):v2}});
porDom.set(dom,st);io.observe(dom);return st.p}
function lazyGet(dom){var st=porDom.get(dom);if(st&&!st.m)return st.p;return realGet?realGet.apply(E,arguments):undefined}
function parchar(o){if(!o||o.__cnLento||typeof o.init!=='function')return;realInit=o.init;realGet=o.getInstanceByDom;
 try{o.init=lazyInit;o.getInstanceByDom=lazyGet}catch(e){}if(o.init!==lazyInit){try{Object.defineProperty(o,'init',{value:lazyInit,writable:true,configurable:true});Object.defineProperty(o,'getInstanceByDom',{value:lazyGet,writable:true,configurable:true})}catch(e){}}
 try{o.__cnLento=1}catch(e){}}
try{Object.defineProperty(window,'echarts',{configurable:true,enumerable:true,get:function(){parchar(E);return E},set:function(v){E=v}})}catch(e){}
addEventListener('beforeprint',function(){imprimiendo=true;todos()});addEventListener('afterprint',function(){imprimiendo=false});
var pr=window.print;window.print=function(){imprimiendo=true;todos();try{return pr.apply(window,arguments)}finally{setTimeout(function(){imprimiendo=false},1500)}};
window.__cnTodos=todos;})();
