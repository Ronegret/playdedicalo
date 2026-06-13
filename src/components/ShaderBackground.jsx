import { useEffect, useRef } from 'react';

export default function ShaderBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `
        attribute vec2 position;
        varying vec2 v_texCoord;
        void main() {
            v_texCoord = position * 0.5 + 0.5;
            v_texCoord.y = 1.0 - v_texCoord.y;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    const fsSource = `
        precision highp float;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        varying vec2 v_texCoord;

        void main() {
            vec2 uv = v_texCoord;
            vec2 p = (uv * 2.0 - 1.0);
            p.x *= u_resolution.x / u_resolution.y;

            // Base colors from theme
            vec3 color_purple = vec3(0.74, 0.0, 1.0); // #bd00ff
            vec3 color_purple_light = vec3(0.9, 0.4, 1.0); // Lilac/Pink
            vec3 color_bg = vec3(0.07, 0.07, 0.1);

            float t = u_time * 1.5;
            
            // Disco lights effect (radial pulses)
            float disco = 0.0;
            for(float i = 0.0; i < 5.0; i++) {
                vec2 pos = vec2(sin(t * (0.5 + i * 0.2)) * 0.6, cos(t * (0.3 + i * 0.3)) * 0.6);
                float dist = length(p - pos);
                disco += 0.05 / (dist * dist + 0.1);
            }

            // Combine
            vec3 finalColor = color_bg;
            finalColor = mix(finalColor, color_purple, disco * 0.4);
            
            // Pulse effect
            finalColor *= (0.9 + 0.1 * sin(t * 8.0));

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, "u_time");
    const resLoc = gl.getUniformLocation(program, "u_resolution");
    const mouseLoc = gl.getUniformLocation(program, "u_mouse");

    let mousePos = { x: 0, y: 0 };
    const handleMouseMove = (e) => {
        mousePos.x = e.clientX;
        mousePos.y = canvas.height - e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationId;
    function render(time) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform1f(timeLoc, time * 0.001);
        gl.uniform2f(resLoc, canvas.width, canvas.height);
        gl.uniform2f(mouseLoc, mousePos.x, mousePos.y);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animationId = requestAnimationFrame(render);
    }
    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
    />
  );
}
