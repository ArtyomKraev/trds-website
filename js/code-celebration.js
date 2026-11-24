(() => {
  'use strict';
  const form = document.querySelector('[data-component="fields"]');
  if (!form) return;
  const preview = form.querySelector('.playground__preview');
  const panel = form.querySelector('[data-field="code"]');
  const inputs = [...panel.querySelectorAll('.ds-code__digit')];
  const clips = [...panel.querySelectorAll('.ds-code__clip')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const secret = '060204';
  let matched = false, generation = 0, timer = 0, frame = 0, canvas;
  let jumps = [];
  const value = () => inputs.map(input => input.value).join('');

  function clear() {
    generation++;
    clearTimeout(timer); cancelAnimationFrame(frame);
    timer = frame = 0;
    jumps.forEach(animation => animation.cancel()); jumps = [];
    canvas?.remove(); canvas = null;
    delete form.dataset.codeCelebration;
  }
  function confetti() {
    const bounds = preview.getBoundingClientRect();
    const code = panel.getBoundingClientRect();
    canvas = document.createElement('canvas');
    canvas.className = 'code-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    preview.append(canvas);
    const context = canvas.getContext('2d');
    if (!context) { canvas.remove(); canvas = null; return; }
    context.scale(ratio, ratio);
    const origin = {x:code.left-bounds.left+code.width/2, y:code.top-bounds.top+24};
    const colors = ['#bbd7ff','#56a0ff','#a9a9ff','#eca1ff','#ffdfa5','#9ae2b3','#ffffff'];
    const spread = Math.min(500, Math.max(200, bounds.width * .65));
    const particles = Array.from({length:110}, (_,index) => ({
      vx:(Math.random()-.5)*spread*2,
      vy:-220-Math.random()*260,
      width:3+Math.random()*4, height:3+Math.random()*5,
      spin:(Math.random()-.5)*16, angle:Math.random()*Math.PI,
      phase:Math.random()*Math.PI*2, color:colors[index%colors.length],
      round:index%6===0
    }));
    const started = performance.now();
    function draw(now) {
      const time = (now-started)/1000;
      context.clearRect(0,0,bounds.width,bounds.height);
      const fade = Math.max(0, Math.min(1,(2.2-time)/.55));
      for (const particle of particles) {
        const x = origin.x + particle.vx * (1-Math.exp(-1.3*time))/1.3;
        const y = origin.y + particle.vy*time + 340*time*time;
        if (y > bounds.height+12) continue;
        context.save(); context.translate(x,y); context.rotate(particle.angle+particle.spin*time);
        context.scale(1, .3+.7*Math.abs(Math.cos(time*8+particle.phase)));
        context.globalAlpha = fade; context.fillStyle = particle.color;
        if (particle.round) { context.beginPath(); context.arc(0,0,particle.width/2,0,Math.PI*2); context.fill(); }
        else context.fillRect(-particle.width/2,-particle.height/2,particle.width,particle.height);
        context.restore();
      }
      if (time < 2.2) frame = requestAnimationFrame(draw);
      else clear();
    }
    frame = requestAnimationFrame(draw);
  }
  function celebrate() {
    if (panel.hidden || reduced.matches || value() !== secret || inputs.some(input => input.disabled)) return;
    form.dataset.codeCelebration = 'jump';
    const frames = [
      {transform:'none',offset:0,easing:'ease-out'},
      {transform:'translateY(2px) scale(1.03,.96)',offset:.12,easing:'cubic-bezier(.16,.8,.3,1)'},
      {transform:'translateY(-12px) scale(.99,1.02)',offset:.38,easing:'cubic-bezier(.5,0,.85,.5)'},
      {transform:'translateY(2px) scale(1.03,.95)',offset:.66,easing:'ease-out'},
      {transform:'translateY(-3px)',offset:.82,easing:'ease-in-out'},
      {transform:'none',offset:1}
    ];
    inputs.forEach((input,index) => {
      // Move the native cell and its decorative number together, leaving entry/exit untouched.
      for (const node of [input,clips[index]]) jumps.push(node.animate(frames,{duration:520,delay:index*55,fill:'backwards'}));
    });
    const ownGeneration = generation;
    Promise.all(jumps.map(animation => animation.finished)).then(() => {
      if (generation !== ownGeneration) return;
      jumps.forEach(animation => animation.cancel()); jumps = [];
      if (!canvas) clear();
    },()=>{});
    timer = setTimeout(() => { if (generation === ownGeneration) { form.dataset.codeCelebration = 'confetti'; confetti(); } },120);
  }
  function check() {
    const isMatch = value() === secret;
    if (!isMatch) { matched = false; clear(); return; }
    if (matched) return;
    matched = true;
    clear();
    if (panel.hidden || reduced.matches || inputs.some(input => input.disabled)) return;
    const ownGeneration = generation;
    // Wait for all arriving digits, including a full-code paste/autofill.
    const arrivals = [...panel.querySelectorAll('.ds-code__glyph')].flatMap(glyph => glyph.getAnimations()).filter(animation => animation.playState === 'running');
    Promise.allSettled(arrivals.map(animation => animation.finished)).then(() => {
      if (generation !== ownGeneration) return;
      timer = setTimeout(celebrate,60);
    });
  }
  form.addEventListener('input',event=>{if(event.target.matches('.ds-code__digit'))check();});
  form.addEventListener('paste',event=>{if(event.target.matches('.ds-code__digit'))check();});
  form.addEventListener('keydown',event=>{
    if (event.target.matches('.ds-code__digit') && ['Backspace','Delete'].includes(event.key)) {
      clear(); queueMicrotask(check);
    }
    if (event.target.closest('[role="tab"]')) clear();
  });
  form.addEventListener('click',event=>{if(event.target.closest('[role="tab"]'))clear();});
  form.addEventListener('change',event=>{if(event.target.closest('.play-setting')){clear();matched=value()===secret;}});
  form.addEventListener('reset',()=>{clear();matched=false;});
  reduced.addEventListener('change',clear);
  window.addEventListener('resize',clear);
  window.addEventListener('pagehide',clear);
  window.addEventListener('hashchange',clear);
  window.addEventListener('blur',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
})();
