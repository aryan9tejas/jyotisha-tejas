(function(){
  var T=[
    {id:'indigo',name:'Indigo',sub:'Default',c:['#2b2150','#d99a1e','#0b1030'],m:'#2b2150'},
    {id:'marigold',name:'Off-white & Marigold',sub:'Light',c:['#a86400','#f5b82e','#fbf9f3'],m:'#a86400'},
    {id:'brown',name:'Brown & Cream',sub:'Classic',c:['#7a3e1d','#e4c496','#f6f4ef'],m:'#7a3e1d'},
    {id:'teal',name:'Teal / Ocean',sub:'Cool',c:['#0f5c63','#2a8fa0','#03121b'],m:'#0f5c63'}
  ];
  function cur(){try{var t=localStorage.getItem('jt_theme');if(T.some(function(x){return x.id===t}))return t}catch(e){}return 'indigo'}
  function apply(id){
    var t=T.filter(function(x){return x.id===id})[0]||T[0];
    document.documentElement.setAttribute('data-theme',t.id);
    var m=document.querySelector('meta[name=theme-color]'); if(m)m.setAttribute('content',t.m);
    try{localStorage.setItem('jt_theme',t.id)}catch(e){}
  }
  function open(){
    var c=cur(), o=document.createElement('div');
    o.id='thModal';
    o.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';
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
      if(b){apply(b.dataset.id);}
      if(b||e.target===o)o.remove();
    });
    document.body.appendChild(o);
  }
  apply(cur());
  document.addEventListener('click',function(e){
    if(e.target.closest('#hmTheme,#btnTheme'))open();
  });
})();
