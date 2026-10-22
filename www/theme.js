(function(){
  var T=[
    {id:'indigo',name:'Indigo',sub:'Default',c:['#2b2150','#d99a1e','#0b1030'],m:'#2b2150'},
    {id:'lemon',name:'Lemon',sub:'Light yellow',c:['#f7e68c','#8a6a00','#fefae7'],m:'#f7e68c'},
    {id:'brown',name:'Brown & Cream',sub:'Classic',c:['#7a3e1d','#e4c496','#f6f4ef'],m:'#7a3e1d'},
    {id:'teal',name:'Teal / Ocean',sub:'Cool',c:['#0f5c63','#2a8fa0','#03121b'],m:'#0f5c63'},
    {id:'silver',name:'Slate & Silver',sub:'Monochrome',c:['#5a6573','#c4c8cd','#f5f6f8'],m:'#5a6573'},
    {id:'sky',name:'Sky Blue',sub:'Light blue',c:['#0a5c9e','#7ec3ec','#eef7fd'],m:'#0a5c9e'},
    {id:'lavender',name:'Lavender',sub:'Soft purple',c:['#6e5aa8','#cbbdf0','#f1ecf9'],m:'#6e5aa8'}
  ];
  function cur(){try{var t=localStorage.getItem('jt_theme');if(t==='marigold')t='lemon';if(T.some(function(x){return x.id===t}))return t}catch(e){}return 'indigo'}
  function apply(id){
    var t=T.filter(function(x){return x.id===id})[0]||T[0];
    document.documentElement.setAttribute('data-theme',t.id);
    try{localStorage.setItem('jt_theme',t.id)}catch(e){}
    syncBar();
  }
  /* status bar / notch colour: the app header colour in the app, the page colour on the home view.
     The meta tag is replaced (not edited) because iOS ignores in-place changes. */
  function hex(c){var m=c.match(/\d+/g);return m?'#'+m.slice(0,3).map(function(x){return ('0'+(+x).toString(16)).slice(-2)}).join(''):'';}
  function syncBar(){
    var id=cur(), t=T.filter(function(x){return x.id===id})[0]||T[0];
    if(document.body)document.body.style.backgroundColor=''; document.documentElement.style.backgroundColor='';
    var home=document.body&&document.body.classList.contains('home-on'), col=t.m;
    if(home){var b=hex(getComputedStyle(document.body).backgroundColor);if(b)col=b;}
    var old=document.querySelector('meta[name=theme-color]'), n=document.createElement('meta');
    n.name='theme-color'; n.content=col;
    if(old)old.remove(); document.head.appendChild(n);
    document.documentElement.style.backgroundColor=home?col:'';
    if(document.body){document.body.style.backgroundColor=home?col:'';void document.body.offsetHeight;}
  }
  window.addEventListener('jt-view',function(){setTimeout(syncBar,60)});
  window.addEventListener('pageshow',syncBar);document.addEventListener('visibilitychange',function(){if(!document.hidden)syncBar()});
  function open(){
    var c=cur(), o=document.createElement('div');
    o.id='thModal';
    o.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))';
    var h='<div style="background:#fff;color:#222;border-radius:16px;padding:16px;width:100%;max-width:340px;box-shadow:0 10px 40px rgba(0,0,0,.4);font:15px system-ui,sans-serif"><div style="font-weight:700;margin-bottom:10px">Colour theme</div>';
    T.forEach(function(t){
      h+='<button data-id="'+t.id+'" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px;margin:6px 0;border-radius:12px;border:2px solid '+(t.id===c?'#2b2150':'#ddd')+';background:#fff;color:#222;font:inherit;cursor:pointer">'
       +'<span style="display:flex;border-radius:8px;overflow:hidden;border:1px solid #0002;flex:none">'+t.c.map(function(x){return '<i style="display:block;width:22px;height:34px;background:'+x+'"></i>'}).join('')+'</span>'
       +'<span><b>'+t.name+'</b><br><small style="color:#777">'+t.sub+(t.id===c?' ✓':'')+'</small></span></button>';
    });
    h+='</div>';
    o.innerHTML=h;
    o.addEventListener('click',function(e){
      var b=e.target.closest('button[data-id]');
      if(b){apply(b.dataset.id);setTimeout(syncBar,80);setTimeout(syncBar,400);}
      if(b||e.target===o)o.remove();
    });
    document.body.appendChild(o);
  }
  apply(cur());
  document.addEventListener('click',function(e){
    if(e.target.closest('#hmTheme,#btnTheme'))open();
  });
})();
