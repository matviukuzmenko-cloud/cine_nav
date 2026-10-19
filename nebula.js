(() => {
  const canvas = document.getElementById("nebulaCanvas");
  if (!canvas) return;

  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: "low-power"
  });
  if (!gl) {
    canvas.hidden = true;
    return;
  }

  const vertexSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform vec2 u_pointer;
    uniform float u_time;
    uniform float u_audio_pulse;
    uniform vec3 u_theme;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 3; i++) {
        value += amplitude * noise(p);
        p = mat2(1.6, 1.2, -1.2, 1.6) * p;
        amplitude *= 0.5;
      }
      return value;
    }
    void main() {
      float aspect = u_resolution.x / max(u_resolution.y, 1.0);
      vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
      vec2 pointer = (u_pointer - 0.5) * vec2(aspect, 1.0);
      float time = u_time * 0.035;
      p += pointer * 0.22;

      vec2 flow = vec2(
        fbm(p * 1.35 + vec2(time, -time * 0.7)),
        fbm(p * 1.35 + vec2(-time * 0.6, time + 3.7))
      );
      float cloud = fbm(p * 3.0 + flow * 2.4 + vec2(-time * 0.5, time * 0.3));
      float wisps = fbm(p * 6.0 - flow * 1.6 + vec2(time * 0.45, -time * 0.25));
      float mask = smoothstep(0.37, 0.78, cloud * 0.76 + wisps * 0.24);

      vec2 coreA = vec2(-0.34, 0.12) + pointer * 0.3 + vec2(sin(time) * 0.035, cos(time * 0.8) * 0.04);
      vec2 coreB = vec2(0.31, -0.19) + pointer * 0.22 + vec2(cos(time * 0.7) * 0.04, sin(time * 0.9) * 0.03);
      float glow = exp(-length(p - coreA) * 3.2) * 0.58 + exp(-length(p - coreB) * 3.8) * 0.38;
      float intensity = clamp(mask * 0.48 + glow * (0.25 + wisps * 0.45 + u_audio_pulse * 0.12), 0.0, 0.62);
      vec3 tint = mix(u_theme, vec3(0.45, 0.18, 0.92), clamp(wisps * 0.9, 0.0, 0.42));
      tint = mix(tint, vec3(0.12, 0.72, 0.95), clamp(glow * 0.22, 0.0, 0.2));
      gl_FragColor = vec4(tint * (0.72 + glow * 0.28), intensity);
    }
  `;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    canvas.hidden = true;
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    canvas.hidden = true;
    return;
  }
  gl.useProgram(program);

  const vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const pointerLocation = gl.getUniformLocation(program, "u_pointer");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const audioPulseLocation = gl.getUniformLocation(program, "u_audio_pulse");
  const themeLocation = gl.getUniformLocation(program, "u_theme");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  const isMacOS = /mac/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);
  const frameInterval = isMacOS ? 50 : 33;
  const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  // Cap the drawing resolution to CSS pixels to avoid expensive Retina-sized frames.
  const pixelRatio = isMacOS || isMobile ? 0.5 : Math.min(window.devicePixelRatio || 1, 1);
  let frame = 0;
  let lastDraw = 0;
  let startTime = performance.now();
  let audioActive = false;

  const resize = () => {
    canvas.width = window.innerWidth * pixelRatio;
    canvas.height = window.innerHeight * pixelRatio;
    if (typeof gl !== "undefined" && gl.viewport) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    draw(performance.now(), true);
  };

  const updateThemeColor = () => {
    const values = getComputedStyle(document.body).getPropertyValue("--neon-rgb").split(",").map(Number);
    const rgb = values.length === 3 && values.every(Number.isFinite) ? values : [0, 180, 216];
    gl.uniform3f(themeLocation, rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
  };

  const shouldAnimate = () => !reducedMotion.matches && !document.hidden && !["light", "minimal"].includes(document.body.dataset.siteStyle);
  const draw = (now, staticFrame = false) => {
    if (!staticFrame && now - lastDraw < frameInterval) {
      frame = requestAnimationFrame(draw);
      return;
    }
    lastDraw = now;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;
    gl.uniform2f(pointerLocation, pointer.x, pointer.y);
    gl.uniform1f(timeLocation, reducedMotion.matches ? 0 : (now - startTime) / 1000);
    const audioPulse = audioActive && !reducedMotion.matches
      ? 0.5 + Math.sin((now - startTime) / 1000 * Math.PI * 2 * 1.15) * 0.5
      : 0;
    gl.uniform1f(audioPulseLocation, audioPulse);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!staticFrame && shouldAnimate()) frame = requestAnimationFrame(draw);
  };

  document.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse" || !finePointer.matches || reducedMotion.matches) return;
    pointer.targetX = event.clientX / Math.max(window.innerWidth, 1);
    pointer.targetY = 1 - event.clientY / Math.max(window.innerHeight, 1);
  }, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  const syncAnimation = () => {
    cancelAnimationFrame(frame);
    if (shouldAnimate()) frame = requestAnimationFrame(draw);
    else draw(performance.now(), true);
  };
  document.addEventListener("cine:radio-state", event => {
    audioActive = Boolean(event.detail?.playing);
    document.body.classList.toggle("radio-audio-active", audioActive);
    syncAnimation();
  });
  document.addEventListener("visibilitychange", syncAnimation);
  reducedMotion.addEventListener?.("change", syncAnimation);
  new MutationObserver(() => {
    updateThemeColor();
    syncAnimation();
  }).observe(document.body, { attributes: true, attributeFilter: ["data-theme", "data-flight-theme", "data-site-style"] });

  updateThemeColor();
  resize();
  if (shouldAnimate()) frame = requestAnimationFrame(draw);
})();