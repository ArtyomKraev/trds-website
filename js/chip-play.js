(() => {
  'use strict';
  const form = document.querySelector('[data-action-component="chip"]');
  if (!form) return;
  const preview = form.querySelector('.playground__preview');
  const chips = [...form.querySelectorAll('[data-chip]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const beats = {rock:'scissors', paper:'rock', scissors:'paper'};
  let scene = null;

  function clear() {
    if (!scene) return;
    const previous = scene;
    scene = null;
    previous.animations.forEach(animation => animation.cancel());
    previous.hidden.forEach(node => node.classList.remove('chip-play-hidden'));
    previous.layer.remove();
    delete form.dataset.chipScene;
  }
  function play(source) {
    clear();
    if (reduced.matches || source.disabled) return;
    const target = chips.find(chip => chip.dataset.chip === beats[source.dataset.chip]);
    if (!target || target.disabled) return;
    const layer = document.createElement('div');
    layer.className = 'chip-scene';
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    preview.append(layer);
    const current = {layer, animations:[], hidden:[]};
    scene = current;
    form.dataset.chipScene = source.dataset.chip;
    const bounds = preview.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const x = rect.left - bounds.left, y = rect.top - bounds.top;
    function animate(node, frames, options) {
      const animation = node.animate(frames, {duration:1600,fill:'both',...options});
      current.animations.push(animation);
      return animation;
    }
    function hide(node) { current.hidden.push(node); node.classList.add('chip-play-hidden'); }
    function ghost(clip) {
      const piece = document.createElement('div');
      piece.className = 'action-chip chip-ghost';
      piece.setAttribute('aria-pressed', target.getAttribute('aria-pressed'));
      piece.dataset.previewState = target.dataset.previewState;
      piece.innerHTML = target.innerHTML;
      Object.assign(piece.style, {left:`${x}px`,top:`${y}px`,width:`${rect.width}px`,height:`${rect.height}px`,clipPath:clip || 'none'});
      layer.append(piece);
      return piece;
    }
    animate(source.querySelector('.chip-icon'), [
      {transform:'scale(1)'},{transform:'scale(.82)',offset:.25},{transform:'scale(1.12)',offset:.65},{transform:'scale(1)'}
    ], {duration:300,easing:'cubic-bezier(.22,.7,.25,1)'});

    if (source.dataset.chip === 'rock') {
      // Only the scissors icon snaps; the label and chip stay in place.
      const icon = target.querySelector('.chip-icon');
      const iconRect = icon.getBoundingClientRect();
      for (const direction of [-1,1]) {
        const piece = document.createElement('div');
        piece.className = 'chip-icon-piece';
        piece.style.color = getComputedStyle(target).color;
        Object.assign(piece.style, {left:`${iconRect.left-bounds.left}px`,top:`${iconRect.top-bounds.top}px`,width:`${iconRect.width}px`,height:`${iconRect.height}px`,clipPath:direction<0 ? 'polygon(0 0,56% 0,44% 35%,59% 52%,43% 70%,53% 100%,0 100%)' : 'polygon(56% 0,100% 0,100% 100%,53% 100%,43% 70%,59% 52%,44% 35%)'});
        piece.append(icon.cloneNode(true));
        layer.append(piece);
        animate(piece, [
          {transform:'none',offset:0},
          {transform:`translateX(${direction*-2}px) rotate(${direction*-9}deg)`,offset:.09,easing:'cubic-bezier(.4,0,1,1)'},
          {transform:`translate(${direction*8}px,-5px) rotate(${direction*24}deg)`,offset:.23},
          {transform:`translate(${direction*12}px,18px) rotate(${direction*65}deg)`,opacity:.55,offset:.48},
          {transform:`translate(${direction*12}px,18px) rotate(${direction*65}deg)`,opacity:.55,offset:.6,easing:'cubic-bezier(.22,1,.36,1)'},
          {transform:`translate(${direction*-1}px,-1px) rotate(${direction*-5}deg)`,opacity:1,offset:.88},
          {transform:'none',opacity:1}
        ]);
      }
      hide(icon);
      for (let i=0;i<3;i++) {
        const spark = document.createElement('i');
        spark.className = 'chip-spark';
        spark.style.left = `${iconRect.left-bounds.left+iconRect.width/2}px`;
        spark.style.top = `${iconRect.top-bounds.top+iconRect.height/2}px`;
        layer.append(spark);
        const angle = -70+i*70;
        animate(spark,[{transform:`rotate(${angle}deg) translateY(-2px)`,opacity:0},{opacity:.8,offset:.2},{transform:`rotate(${angle}deg) translateY(-19px) scaleY(.3)`,opacity:0}],{duration:340,delay:140});
      }
    } else if (source.dataset.chip === 'paper') {
      const stone = ghost();
      hide(target);
      const drop = Math.min(76, bounds.height-y-rect.height-12);
      const drift = -Math.min(18, Math.max(0,x-8));
      animate(stone,[
        {transform:'none',offset:0,easing:'ease-out'},
        {transform:'translateY(-5px) rotate(-4deg)',offset:.1,easing:'cubic-bezier(.55,0,1,1)'},
        {transform:`translate(${drift}px,${drop}px) rotate(16deg) scale(.86)`,offset:.39,easing:'ease-out'},
        {transform:`translate(${drift}px,${drop-22}px) rotate(10deg) scale(.9)`,offset:.49,easing:'ease-in'},
        {transform:`translate(${drift}px,${drop}px) rotate(14deg) scale(.86)`,offset:.6},
        {transform:`translate(${drift}px,${drop}px) rotate(14deg) scale(.86)`,offset:.68,easing:'cubic-bezier(.22,1,.36,1)'},
        {transform:'translateY(-4px) rotate(-2deg)',offset:.91,easing:'ease-out'},
        {transform:'none'}
      ],{duration:1700});
    } else {
      // A diagonal cut, then two paper halves curl apart and join again.
      const left = ghost('polygon(0 0,60% 0,40% 100%,0 100%)');
      const right = ghost('polygon(60% 0,100% 0,100% 100%,40% 100%)');
      hide(target);
      for (const [piece,direction] of [[left,-1],[right,1]]) {
        piece.style.transformOrigin = direction<0 ? '20% 50%' : '80% 50%';
        animate(piece,[
          {transform:'none',offset:0},{transform:'none',offset:.14,easing:'cubic-bezier(.22,1,.36,1)'},
          {transform:`translate(${direction*4}px,${direction*12}px) rotate(${direction*5}deg)`,offset:.36},
          {transform:`translate(${direction*6}px,${direction*18+3}px) rotate(${direction*8}deg)`,offset:.57,easing:'cubic-bezier(.22,1,.36,1)'},
          {transform:`translate(${direction*-1}px,0) rotate(${direction*-1}deg)`,offset:.88},
          {transform:'none'}
        ]);
      }
      const cut = document.createElement('i');
      cut.className = 'chip-cut';
      Object.assign(cut.style,{left:`${x+rect.width/2}px`,top:`${y-4}px`,height:`${rect.height+8}px`});
      layer.append(cut);
      animate(cut,[{transform:'rotate(25deg) scaleY(0)',opacity:0},{transform:'rotate(25deg) scaleY(1)',opacity:.9,offset:.45},{transform:'rotate(25deg) scaleY(1.15)',opacity:0}],{duration:320,delay:80});
    }
    Promise.all(current.animations.map(animation=>animation.finished)).then(()=>{if(scene===current)clear();},()=>{});
  }
  chips.forEach(chip=>{
    chip.addEventListener('pointerdown',clear);
    chip.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter')clear();});
    chip.addEventListener('click',()=>play(chip));
  });
  form.addEventListener('change',clear);
  form.addEventListener('reset',clear);
  window.addEventListener('resize',clear);
  window.addEventListener('pagehide',clear);
  window.addEventListener('blur',clear);
  reduced.addEventListener('change',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})();
