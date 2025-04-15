"use client";

import { Box } from "@chakra-ui/react";
import { useEffect, useRef, useCallback } from "react";
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying float vWave;
  uniform float time;

  // Simple rotational matrix
  mat2 rotate(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Multiple wave layers
    float wave1 = sin(uv.x * 8.0 + time * 0.6) * 0.04;
    float wave2 = sin(uv.y * 6.0 + time * 0.4) * 0.03;
    float wave3 = sin(dot(uv, vec2(5.0, 3.0)) + time * 0.7) * 0.05;
    
    pos.z += wave1 + wave2 + wave3;
    vWave = pos.z; // Pass wave height to fragment shader

    // Optional: Gentle rotation of UVs over time
    // vec2 rotatedUv = rotate(time * 0.05) * (uv - 0.5) + 0.5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying float vWave; // Receive wave height
  uniform float time;

  // Noise function (from previous correction)
  float noise(vec2 p, float t) {
      float noise_component = dot(p, vec2(12.9898, 78.233)) + t * 0.5;
      return (fract(sin(noise_component) * 43758.5453) - 0.5) * 2.0; // Scaled to -1 to 1
  }

  void main() {
    // Colors (Added saturation while maintaining neutral base)
    vec3 color1 = vec3(0.88, 0.65, 0.55); // Warmer rose-beige
    vec3 color2 = vec3(0.94, 0.89, 0.84); // Warm off-white
    vec3 highlightColor = vec3(0.98, 0.9, 0.8); // Warmer cream highlight

    // Mix based on vertical position, but shifted by wave height and time
    float baseMix = vUv.y * 1.2 - 0.1; // Base gradient
    float waveInfluence = vWave * 3.0 + sin(time * 0.5 + vUv.x * 5.0) * 0.1; // How much wave affects color
    float mixFactor = smoothstep(0.3, 0.7, baseMix + waveInfluence); 

    vec3 blendedColor = mix(color1, color2, mixFactor);

    // Add highlight based on wave crests (positive vWave)
    float highlightFactor = smoothstep(0.03, 0.08, vWave); // Only highlight strong positive waves
    blendedColor = mix(blendedColor, highlightColor, highlightFactor * 0.7);

    // Add subtle grain (adjust strength)
    float grain = noise(vUv * 2.0, time) * 0.02;
    
    gl_FragColor = vec4(blendedColor + grain, 1.0);
  }
`;

const ThreeWaveBackground = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const handleResize = useCallback(() => {
    if (mountRef.current && rendererRef.current && cameraRef.current) {
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  const animate = useCallback((time: number) => {
    if (materialRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
      materialRef.current.uniforms.time.value = time * 0.001; // Convert ms to seconds
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      // Stop animation if refs are null (e.g., during cleanup)
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // --- Camera Setup ---
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 2;
    cameraRef.current = camera;

    // --- Renderer Setup ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: true for transparency
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio); // Adjust for screen density
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Geometry & Material ---
    const geometry = new THREE.PlaneGeometry(4, 2.5, 100, 100); // Increased width from 2.5 to 4
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 }
      },
      wireframe: false,
      // side: THREE.DoubleSide // Render both sides if needed
    });
    materialRef.current = material;

    // --- Mesh ---
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // --- Resize Observer ---
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(currentMount);

    // --- Start Animation ---
    animationFrameId.current = requestAnimationFrame(animate);

    // --- Cleanup Function ---
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      resizeObserver.unobserve(currentMount);
      if (rendererRef.current) {
        currentMount.removeChild(rendererRef.current.domElement);
      }
      // Dispose Three.js objects
      geometry.dispose();
      material.dispose();
      sceneRef.current = null;
      cameraRef.current = null;
      materialRef.current = null;
      if (rendererRef.current) {
          rendererRef.current.dispose(); // Dispose renderer resources
          rendererRef.current = null;
      }
    };
  }, [animate, handleResize]);

  return (
    <Box
      ref={mountRef}
      position="absolute"
      inset="0"
      zIndex={1} // Place behind content
      overflow="hidden"
      left={0}
      right={0}
      top={0}
      bottom={0}
      // Optional: Add a fallback background color while loading or if WebGL fails
      // bg="gray.100"
    />
  );
};

export default ThreeWaveBackground; 