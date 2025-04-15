"use client";

import { Box } from "@chakra-ui/react";
import { useEffect, useRef, useCallback } from "react";

const WaveCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const tRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the container Box

  // --- NEW Drawing Logic (Radial Gradient) ---
  const draw = useCallback(() => {
    if (!ctxRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const t = tRef.current;
    const { width, height } = canvas; // Use dimensions directly

    // No clearRect needed if filling the whole canvas each frame
    // ctx.clearRect(0, 0, width, height);

    // Optional: Set a base background if gradients don't cover everything
    // ctx.fillStyle = '#fefaf6'; // A very light orange/off-white
    // ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.sqrt(cx * cx + cy * cy); // Max radius to cover corners
    const step = 8; // Spacing between gradient rings
    const speedFactor = 0.002;
    const radiusFactor = 0.008;
    const offsetAmplitude = 15;
    const gradientInnerColor = "rgba(255, 136, 0, 0.02)"; // Subtle orange
    const gradientOuterColor = "rgba(255, 255, 255, 0.03)"; // Subtle white/transparent
    const gradientSpread = 40; // How far each gradient ring spreads

    for (let r = 0; r < maxRadius; r += step) {
      const angle = t * speedFactor + r * radiusFactor;
      const offset = Math.sin(angle) * offsetAmplitude;

      // Center the gradient slightly offset based on angle
      const gradX = cx + offset; 
      const gradY = cy + offset;

      // Create radial gradient
      const grad = ctx.createRadialGradient(gradX, gradY, r, gradX, gradY, r + gradientSpread);
      grad.addColorStop(0, gradientInnerColor);
      grad.addColorStop(1, gradientOuterColor);

      // Apply the gradient fill
      ctx.fillStyle = grad;
      // Fill the entire canvas with this gradient layer
      // This creates overlapping layers for the effect
      ctx.fillRect(0, 0, width, height); 
    }

    tRef.current += 1; // Increment time for animation
    animationFrameId.current = requestAnimationFrame(draw);
  }, []);

  // --- NEW Resize Logic ---
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current; 
    if (canvas && container) {
      // Match canvas resolution to container's client size
      // This ensures the drawing buffer matches the display size
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      // No need to redraw immediately here, effect hook handles initial draw
    }
  }, []); // No dependencies needed

  // --- Effect for Setup, Resize Handling, and Cleanup ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Initialize context only once
      ctxRef.current = canvas.getContext("2d");
    }

    // Initial resize
    resizeCanvas();

    // Use ResizeObserver for more robust container resizing
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(containerRef.current);
    } else {
      // Fallback to window resize if container ref not ready (less accurate)
      window.addEventListener("resize", resizeCanvas);
    }

    // Start animation loop
    tRef.current = 0; // Reset time on mount/setup change
    animationFrameId.current = requestAnimationFrame(draw);

    // --- Cleanup function ---
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // Clean up observer or listener
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      } else {
        window.removeEventListener("resize", resizeCanvas);
      }
    };
  }, [resizeCanvas, draw]); // Rerun effect if resize/draw logic changes

  return (
    // Container Box to define the size for the canvas
    <Box
      ref={containerRef} // Attach ref to the Box
      w="full"         // Take full width of parent
      h="full"         // Take full height of parent (requires parent to have height)
      position="relative" // Needed if canvas is positioned absolutely (it's not here)
      overflow="hidden"   // Clip canvas if it somehow exceeds Box bounds
      borderRadius="lg"   // Apply border radius to the container
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }} // Make canvas display size fill container
      />
    </Box>
  );
};

export default WaveCanvas; 