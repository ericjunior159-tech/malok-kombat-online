const CACHE='malok-kombat-v3.0.0';
const ASSETS=["/","/index.html","/app.js","/combat.js","/input.js","/roster.js","/scene.js","/settings.js","/powers.js","/power-visuals.js","/new-fighters.js","/style.css","/assets/three.module.js","/assets/likeness-faces.png","/assets/roster-five.png","/assets/eric-gigica.png","/assets/fight-music.mp3","/assets/menu-theme.mp3","/icons/malok-192.png","/icons/malok-512.png","/manifest.webmanifest"];
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const results=await Promise.allSettled(ASSETS.map(async url=>{
      const response=await fetch(url,{cache:'reload'});
      if(!response.ok)throw new Error('HTTP '+response.status+' '+url);
      await cache.put(url,response);
    }));
    if(results.some(r=>r.status==='rejected'))console.warn('Malok: alguns arquivos não puderam ser salvos offline.');
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('malok-kombat-')&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin||['/health','/diagnostico','/ws'].includes(url.pathname))return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(async()=> (await caches.match('/index.html')) || Response.error()));
    return;
  }
  e.respondWith((async()=>{
    const cached=await caches.match(e.request,{ignoreSearch:true});
    if(cached)return cached;
    const response=await fetch(e.request);
    if(response.ok&&ASSETS.includes(url.pathname)){
      const cache=await caches.open(CACHE);
      cache.put(e.request,response.clone()).catch(()=>{});
    }
    return response;
  })());
});
