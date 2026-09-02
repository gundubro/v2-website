"use client";

import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const STORY_STEPS = [
  "Environment",
  "Noise",
  "Attack",
  "Discovery",
  "Context",
  "Defend",
  "Investigation",
  "Clarity",
  "Unified",
] as const;

const STORY_POSITIONS = [0, 0.115, 0.23, 0.35, 0.47, 0.53, 0.645, 0.76, 0.87];

const COVERAGE = [
  {
    title: "100% coverage. Zero exceptions.",
    body: "Your team has time for 40% of alerts. Skydda covers all of them—closing the 60% gap without growing headcount.",
  },
  {
    title: "Intelligence that attacks its own thinking.",
    body: "Every decision survives Skydda’s own Prove → Disprove → Verify cycle before it reaches your team.",
  },
  {
    title: "Learns your business. Speaks your language.",
    body: "Skydda adapts to your assets, identities, relationships, and operating context—not the other way around.",
  },
  {
    title: "Audit-ready. Always.",
    body: "Every investigation is documented, attributable, and explainable. The evidence is already attached.",
  },
  {
    title: "Deploys in days. Not months.",
    body: "No rip-and-replace required. Skydda works alongside the tools and workflows you already trust.",
  },
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value: number) => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};
const between = (progress: number, start: number, end: number, feather = 0.025) =>
  smooth((progress - start) / feather) * (1 - smooth((progress - (end - feather)) / feather));

function SecurityWorld({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 720px)").matches;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !mobile,
        powerPreference: "high-performance",
      });
    } catch {
      canvas.dataset.unavailable = "true";
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
    camera.position.set(0, 0, 11);

    const ink = new THREE.Color("#12231f");
    const structure = new THREE.Color("#9ba9a4");
    const pale = new THREE.Color("#c8d0cc");
    const orange = new THREE.Color("#ff5a1f");
    const teal = new THREE.Color("#008f89");
    const red = new THREE.Color("#c9382a");

    const world = new THREE.Group();
    const topology = new THREE.Group();
    const attack = new THREE.Group();
    const defend = new THREE.Group();
    const unified = new THREE.Group();
    world.add(topology, attack, defend, unified);
    scene.add(world);

    let seed = 41729;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const nodeCount = mobile ? 46 : 78;
    const nodes: THREE.Vector3[] = Array.from({ length: nodeCount }, (_, index) => {
      const angle = random() * Math.PI * 2;
      const radius = 0.85 + Math.pow(random(), 0.62) * 3.15;
      return new THREE.Vector3(
        Math.cos(angle) * radius * 1.28,
        Math.sin(angle) * radius * 0.72,
        (random() - 0.5) * 1.65 + Math.sin(index) * 0.08,
      );
    });

    const pathIndices = [0, 1, 2, 3, 4].map((index) => index % nodeCount);
    const fixedPath = [
      [-3.55, 0.88, 0.18],
      [-2.02, 1.18, -0.08],
      [-0.68, 0.36, 0.22],
      [0.9, -0.08, 0.04],
      [2.65, 0.96, -0.12],
    ];
    fixedPath.forEach(([x, y, z], index) => nodes[index].set(x, y, z));

    const matrix = new THREE.Matrix4();
    const nodeGeometry = new THREE.SphereGeometry(0.045, 7, 7);
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: structure,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });
    const nodeMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodeCount);
    nodes.forEach((position, index) => {
      const scale = 0.72 + (index % 5) * 0.13;
      matrix.compose(position, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
      nodeMesh.setMatrixAt(index, matrix);
    });
    nodeMesh.instanceMatrix.needsUpdate = true;
    topology.add(nodeMesh);

    const serviceNodes = nodes.filter((_, index) => index % 5 === 0);
    const serviceGeometry = new THREE.BoxGeometry(0.105, 0.105, 0.105);
    const serviceMaterial = new THREE.MeshBasicMaterial({
      color: ink,
      wireframe: true,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    const serviceMesh = new THREE.InstancedMesh(serviceGeometry, serviceMaterial, serviceNodes.length);
    serviceNodes.forEach((position, index) => {
      const rotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, index % 2 ? Math.PI / 4 : 0),
      );
      matrix.compose(position, rotation, new THREE.Vector3(1, 1, 1));
      serviceMesh.setMatrixAt(index, matrix);
    });
    serviceMesh.instanceMatrix.needsUpdate = true;
    topology.add(serviceMesh);

    const edgePositions: number[] = [];
    const edgeCount = mobile ? 62 : 112;
    for (let i = 0; i < edgeCount; i += 1) {
      const a = nodes[i % nodeCount];
      let b = nodes[(i * 11 + 9) % nodeCount];
      if (a.distanceTo(b) > 3.4) b = nodes[(i + 7) % nodeCount];
      edgePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: pale,
      transparent: true,
      opacity: 0.31,
      depthWrite: false,
    });
    topology.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

    const orbitMaterial = new THREE.LineBasicMaterial({
      color: structure,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    });
    const orbitLines: THREE.Line[] = [];
    [1.55, 2.25, 3.05, 3.78].forEach((radius, index) => {
      const points = Array.from({ length: 96 }, (_, pointIndex) => {
        const angle = (pointIndex / 95) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * radius * 1.35,
          Math.sin(angle) * radius * (0.54 + index * 0.025),
          -0.45 - index * 0.08,
        );
      });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), orbitMaterial.clone());
      orbitLines.push(line);
      topology.add(line);
    });

    const noiseCount = mobile ? 72 : 172;
    const noiseBase = new Float32Array(noiseCount * 3);
    for (let i = 0; i < noiseCount; i += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 0.8 + random() * 4.3;
      noiseBase[i * 3] = Math.cos(angle) * radius * 1.22;
      noiseBase[i * 3 + 1] = Math.sin(angle) * radius * 0.64;
      noiseBase[i * 3 + 2] = (random() - 0.5) * 2.6;
    }
    const noiseArray = noiseBase.slice();
    const noiseGeometry = new THREE.BufferGeometry();
    noiseGeometry.setAttribute("position", new THREE.BufferAttribute(noiseArray, 3));
    const noiseMaterial = new THREE.PointsMaterial({
      color: ink,
      size: mobile ? 0.025 : 0.021,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const noise = new THREE.Points(noiseGeometry, noiseMaterial);
    topology.add(noise);

    const scannerMaterial = new THREE.MeshBasicMaterial({
      color: orange,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const scanner = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 5.8), scannerMaterial);
    scanner.position.set(-4.6, 0, 0.45);
    scanner.rotation.y = -0.16;
    attack.add(scanner);

    const attackCurve = new THREE.CatmullRomCurve3(pathIndices.map((index) => nodes[index]), false, "centripetal");
    const attackPoints = attackCurve.getPoints(120);
    const attackGeometry = new THREE.BufferGeometry().setFromPoints(attackPoints);
    attackGeometry.setDrawRange(0, 0);
    const attackMaterial = new THREE.LineBasicMaterial({
      color: orange,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const attackLine = new THREE.Line(attackGeometry, attackMaterial);
    attack.add(attackLine);

    const vulnerabilityMaterial = new THREE.MeshBasicMaterial({
      color: orange,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const vulnerabilityRings = [1, 2, 4].map((pathIndex, index) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.115 + index * 0.018, 0.14 + index * 0.018, 28),
        vulnerabilityMaterial.clone(),
      );
      ring.position.copy(nodes[pathIndex]);
      ring.position.z += 0.04;
      attack.add(ring);
      return ring;
    });

    const criticalMaterial = new THREE.MeshBasicMaterial({
      color: red,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const critical = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), criticalMaterial);
    critical.position.copy(nodes[2]);
    attack.add(critical);

    const sourcePositions = [
      new THREE.Vector3(-4.6, -2.2, 0.2),
      new THREE.Vector3(-4.1, 2.15, -0.4),
      new THREE.Vector3(-1.5, -2.75, 0.4),
      new THREE.Vector3(4.5, -2.1, 0.1),
      new THREE.Vector3(4.6, 2.1, -0.25),
      new THREE.Vector3(1.5, 2.65, 0.3),
    ];
    const targetIndices = [23, 31, 2, 47, 4, 18].map((index) => index % nodeCount);
    const signalCurves: THREE.CubicBezierCurve3[] = [];
    const signalLines: THREE.Line[] = [];
    const packetMeshes: THREE.Mesh[] = [];
    const packetMaterial = new THREE.MeshBasicMaterial({
      color: teal,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    sourcePositions.forEach((source, index) => {
      const target = nodes[targetIndices[index]];
      const midpoint = source.clone().lerp(target, 0.5);
      const curve = new THREE.CubicBezierCurve3(
        source,
        midpoint.clone().add(new THREE.Vector3(0, index % 2 ? -1.15 : 1.15, 0.35)),
        midpoint.clone().add(new THREE.Vector3(index % 2 ? 0.8 : -0.8, 0, -0.2)),
        target,
      );
      signalCurves.push(curve);
      const material = new THREE.LineBasicMaterial({
        color: teal,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(52)), material);
      signalLines.push(line);
      defend.add(line);

      const packet = new THREE.Mesh(new THREE.SphereGeometry(0.058, 7, 7), packetMaterial.clone());
      packet.position.copy(source);
      packetMeshes.push(packet);
      defend.add(packet);
    });

    const defendPathIndices = [26, 12, 2, 43, 58].map((index) => index % nodeCount);
    const defendPath = new THREE.CatmullRomCurve3(defendPathIndices.map((index) => nodes[index]), false, "centripetal");
    const defendPoints = defendPath.getPoints(110);
    const defendGeometry = new THREE.BufferGeometry().setFromPoints(defendPoints);
    defendGeometry.setDrawRange(0, 0);
    const defendMaterial = new THREE.LineBasicMaterial({
      color: teal,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    defend.add(new THREE.Line(defendGeometry, defendMaterial));

    const hypothesisMaterials: THREE.LineBasicMaterial[] = [];
    [-0.92, 0.65, 1.12].forEach((offset, index) => {
      const start = nodes[defendPathIndices[0]];
      const end = nodes[defendPathIndices[4]];
      const middle = start.clone().lerp(end, 0.52).add(new THREE.Vector3(0.2 * index, offset, -0.35));
      const curve = new THREE.CatmullRomCurve3([start, middle, end], false, "centripetal");
      const material = new THREE.LineBasicMaterial({
        color: index === 2 ? teal : structure,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      hypothesisMaterials.push(material);
      defend.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), material));
    });

    const unifiedRingMaterials = [orange, teal].map(
      (color) =>
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
    );
    const unifiedRings = [1.18, 1.48].map((radius, index) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.012, 96), unifiedRingMaterials[index]);
      ring.position.z = -0.15 - index * 0.05;
      ring.scale.y = 0.58;
      unified.add(ring);
      return ring;
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: ink,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), coreMaterial);
    unified.add(core);

    let width = 0;
    let height = 0;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      world.position.x = width > 1040 ? 2.05 : width > 720 ? 1.18 : 0;
      world.position.y = width > 720 ? -0.08 : -0.75;
      world.scale.setScalar(width > 720 ? 1 : 0.72);
    };
    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
    resize();

    let frame = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      const progress = reducedMotion ? 0.91 : progressRef.current;
      const noisePhase = between(progress, 0.095, 0.245, 0.04);
      const attackPhase = between(progress, 0.205, 0.49, 0.04);
      const remediationPhase = between(progress, 0.33, 0.515, 0.03);
      const defendPhase = between(progress, 0.505, 0.785, 0.035);
      const investigationPhase = between(progress, 0.625, 0.825, 0.035);
      const clarity = smooth((progress - 0.735) / 0.125);
      const unifiedPhase = smooth((progress - 0.855) / 0.09);

      const topologyVisibility =
        0.5 + noisePhase * 0.34 - remediationPhase * 0.2 - clarity * 0.38 + unifiedPhase * 0.22;
      nodeMaterial.opacity = topologyVisibility;
      serviceMaterial.opacity = topologyVisibility * 0.62;
      edgeMaterial.opacity = 0.22 + noisePhase * 0.34 - clarity * 0.19 + unifiedPhase * 0.13;
      orbitLines.forEach((line, index) => {
        const material = line.material as THREE.LineBasicMaterial;
        material.opacity = 0.07 + noisePhase * (0.12 + index * 0.014) - clarity * 0.055 + unifiedPhase * 0.07;
        line.rotation.z = (reducedMotion ? 0 : elapsed * (index % 2 ? -0.009 : 0.007)) + index * 0.08;
      });

      noiseMaterial.opacity = 0.09 + noisePhase * 0.64 + defendPhase * 0.31 - clarity * 0.37;
      const noiseAttribute = noiseGeometry.getAttribute("position") as THREE.BufferAttribute;
      const positions = noiseAttribute.array as Float32Array;
      if (!reducedMotion) {
        for (let i = 0; i < noiseCount; i += 1) {
          const strength = 0.015 + noisePhase * 0.085 + defendPhase * 0.035;
          positions[i * 3] = noiseBase[i * 3] + Math.sin(elapsed * (0.35 + (i % 7) * 0.045) + i) * strength;
          positions[i * 3 + 1] =
            noiseBase[i * 3 + 1] + Math.cos(elapsed * (0.28 + (i % 5) * 0.05) + i * 0.7) * strength;
        }
        noiseAttribute.needsUpdate = true;
      }

      const scannerLocal = clamp((progress - 0.225) / 0.14);
      scanner.position.x = -4.7 + scannerLocal * 9.4;
      scannerMaterial.opacity = attackPhase * 0.12;
      scanner.scale.x = 0.7 + Math.sin(elapsed * 2) * 0.08;

      const attackDraw = smooth((progress - 0.285) / 0.11);
      attackGeometry.setDrawRange(0, Math.max(0, Math.floor(attackPoints.length * attackDraw)));
      const neutralize = smooth((progress - 0.48) / 0.08) * (1 - unifiedPhase);
      attackMaterial.color.copy(orange).lerp(structure, neutralize);
      attackMaterial.opacity = Math.max(attackPhase * 0.92, neutralize * 0.2, unifiedPhase * 0.5);
      vulnerabilityRings.forEach((ring, index) => {
        const material = ring.material as THREE.MeshBasicMaterial;
        const reveal = smooth((scannerLocal - (0.18 + index * 0.24)) / 0.18);
        material.opacity = attackPhase * reveal * (0.46 + Math.sin(elapsed * 2.2 + index) * 0.08);
        ring.scale.setScalar(0.92 + Math.sin(elapsed * 1.4 + index) * 0.08);
      });
      criticalMaterial.opacity = remediationPhase * 0.82;
      critical.rotation.z = reducedMotion ? Math.PI / 4 : elapsed * 0.35;

      signalLines.forEach((line, index) => {
        (line.material as THREE.LineBasicMaterial).opacity = defendPhase * (0.25 + (index % 3) * 0.07);
      });
      packetMeshes.forEach((packet, index) => {
        const packetProgress = reducedMotion ? 0.72 : (elapsed * (0.11 + index * 0.012) + index * 0.16) % 1;
        packet.position.copy(signalCurves[index].getPoint(packetProgress));
        (packet.material as THREE.MeshBasicMaterial).opacity = defendPhase * 0.86;
        const packetScale = 0.82 + Math.sin(elapsed * 3 + index) * 0.16;
        packet.scale.setScalar(packetScale);
      });

      const defendDraw = smooth((progress - 0.575) / 0.14);
      defendGeometry.setDrawRange(0, Math.max(0, Math.floor(defendPoints.length * defendDraw)));
      defendMaterial.opacity = Math.max(defendPhase * 0.75, clarity * (1 - unifiedPhase) * 0.68, unifiedPhase * 0.42);
      hypothesisMaterials.forEach((material, index) => {
        const prune = index < 2 ? smooth((progress - (0.705 + index * 0.025)) / 0.055) : 0;
        material.opacity = investigationPhase * (index === 2 ? 0.58 : 0.34) * (1 - prune);
      });

      unifiedRingMaterials.forEach((material, index) => {
        material.opacity = unifiedPhase * (index === 0 ? 0.43 : 0.5);
      });
      unifiedRings[0].rotation.z = reducedMotion ? 0.2 : elapsed * 0.08;
      unifiedRings[1].rotation.z = reducedMotion ? -0.2 : elapsed * -0.06;
      coreMaterial.opacity = unifiedPhase * 0.8;
      core.scale.setScalar(0.9 + (reducedMotion ? 0 : Math.sin(elapsed * 1.4) * 0.1));

      world.rotation.y = (progress - 0.5) * 0.095 + (reducedMotion ? 0 : Math.sin(elapsed * 0.14) * 0.018);
      world.rotation.x = (progress - 0.5) * -0.035;
      const calmScale = 1 - clarity * 0.11 + unifiedPhase * 0.04;
      world.scale.setScalar((width > 720 ? 1 : 0.72) * calmScale);
      camera.position.z = 11 - clarity * 0.4;
      renderer.render(scene, camera);
      if (!reducedMotion) frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) object.geometry.dispose();
        if ("material" in object) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material instanceof THREE.Material && material.dispose());
        }
      });
      renderer.dispose();
    };
  }, [progressRef]);

  return <canvas ref={canvasRef} className="security-canvas" aria-hidden="true" />;
}

export default function SkyddaPage() {
  const storyRef = useRef<HTMLElement>(null);
  const demoDialogRef = useRef<HTMLDialogElement>(null);
  const progressRef = useRef(0);
  const activeStepRef = useRef(0);
  const [activeStep, setActiveStep] = useState(0);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [demoSent, setDemoSent] = useState(false);

  useLayoutEffect(() => {
    const story = storyRef.current;
    if (!story) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const panels = Array.from(story.querySelectorAll<HTMLElement>(".story-copy"));
      gsap.set(panels, { autoAlpha: 0, y: 44 });
      gsap.set(panels[0], { autoAlpha: 1, y: 0 });

      const timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: story,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.42,
          invalidateOnRefresh: true,
          onUpdate: (trigger) => {
            progressRef.current = trigger.progress;
            let nextStep = 0;
            STORY_POSITIONS.forEach((position, index) => {
              if (trigger.progress >= position - 0.025) nextStep = index;
            });
            if (nextStep !== activeStepRef.current) {
              activeStepRef.current = nextStep;
              setActiveStep(nextStep);
            }
          },
        },
      });

      timeline.to({ value: 0 }, { value: 1, duration: 1, ease: "none" }, 0);
      panels.forEach((panel, index) => {
        const enterAt = STORY_POSITIONS[index];
        const exitAt = STORY_POSITIONS[index + 1] ?? 1.02;
        if (index > 0) {
          timeline.fromTo(
            panel,
            { autoAlpha: 0, y: 44 },
            { autoAlpha: 1, y: 0, duration: 0.032 },
            Math.max(0, enterAt - 0.014),
          );
        }
        if (index < panels.length - 1) {
          timeline.to(
            panel,
            { autoAlpha: 0, y: -34, duration: 0.026, ease: "power2.in" },
            Math.max(enterAt + 0.045, exitAt - 0.032),
          );
        }
      });

      return () => timeline.kill();
    });

    media.add("(prefers-reduced-motion: reduce)", () => {
      progressRef.current = 0.91;
      activeStepRef.current = STORY_STEPS.length - 1;
      setActiveStep(STORY_STEPS.length - 1);
    });

    return () => media.revert();
  }, []);

  const goToStep = (index: number) => {
    const story = storyRef.current;
    if (!story) return;
    const top = story.getBoundingClientRect().top + window.scrollY;
    const scrollable = story.offsetHeight - window.innerHeight;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: top + scrollable * STORY_POSITIONS[index],
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  const openDemo = () => {
    setDemoSent(false);
    demoDialogRef.current?.showModal();
  };

  const submitDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDemoSent(true);
  };

  return (
    <>
      <header className="site-nav">
        <a className="brand" href="#top" aria-label="Skydda home">
          <img src="/skydda-mark.svg" alt="" width="22" height="22" />
          <span>Skydda</span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#problem">Problem</a>
          <a href="#suite">Skydda Suite</a>
          <a href="#field-notes">Field Notes</a>
        </nav>
        <button className="cta-button nav-cta" type="button" onClick={openDemo}>
          Book a demo <span aria-hidden="true">→</span>
        </button>
      </header>

      <main id="top">
        <section className="story" ref={storyRef} aria-label="How Skydda understands your enterprise">
          <span className="story-anchor story-anchor--problem" id="problem" />
          <span className="story-anchor story-anchor--suite" id="suite" />
          <div className="story-stage">
            <div className="coordinate-grid" aria-hidden="true" />
            <SecurityWorld progressRef={progressRef} />
            <p className="sr-only">
              A single enterprise graph moves from noisy telemetry through offensive scanning, validated exposure,
              defensive investigation, and one clear recommended action.
            </p>

            <div className="world-hud" aria-hidden="true">
              <span>SECURITY OBSERVATORY / 01</span>
              <span>LAT 58.21 · DEPTH 02 · LIVE</span>
            </div>

            <div className="story-copy hero-copy is-initial" data-step="0">
              <div className="copy-inner copy-inner--hero">
                <p className="eyebrow"><span className="live-dot" /> SKYDDA UNIFIED / LIVE CONTEXT</p>
                <h1>
                  Attack and Defend —<br />
                  <span className="attack-text">deeply aware,</span><br />
                  <span className="defend-text">secure</span> enterprises.
                </h1>
                <div className="hero-footer">
                  <p>
                    One living model of your enterprise. Attack discovers what could happen. Defend proves what did.
                  </p>
                  <button className="text-button" type="button" onClick={() => goToStep(1)}>
                    Scroll to investigate <span aria-hidden="true">↓</span>
                  </button>
                </div>
              </div>
            </div>

            <article className="story-copy copy-left" data-step="1">
              <div className="copy-inner">
                <p className="step-label"><span>01</span> THE PROBLEM / NOISE</p>
                <h2>The attacker stopped being human. Skydda didn’t stay one either.</h2>
                <p className="body-copy">
                  60% of security alerts are never investigated deeply enough. Skydda Attack looks for exploitable
                  weaknesses while Skydda Defend investigates the activity already moving through your environment.
                </p>
                <div className="telemetry-strip" aria-label="Incoming telemetry sources">
                  {['ENDPOINT', 'IDENTITY', 'NETWORK', 'CLOUD', 'SIEM'].map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
            </article>

            <article className="story-copy copy-left" data-step="2">
              <div className="copy-inner">
                <p className="step-label attack-text"><span>02</span> SKYDDA ATTACK</p>
                <h2>Find the paths an attacker would find.</h2>
                <p className="body-copy">
                  Skydda continuously evaluates your environment like an adversary—identifying exposed services,
                  vulnerable systems, exploitable relationships, and attack paths before they become incidents.
                </p>
                <div className="scan-readout" aria-label="Observed exposure states">
                  <span>OBSERVED / TCP 445</span>
                  <span>VALIDATED / CVE-2026-4187</span>
                  <span>CHAINED / PRIVILEGE ESCALATION</span>
                </div>
              </div>
            </article>

            <article className="story-copy copy-right" data-step="3">
              <div className="copy-inner remediation-wrap">
                <p className="step-label attack-text"><span>03</span> DISCOVERY / ACTION</p>
                <h2>Detection is only the beginning.</h2>
                <p className="body-copy compact">
                  Skydda determines what can actually be chained together—and what matters most.
                </p>
                <div className="product-card">
                  <div className="card-topline">
                    <span className="critical-dot" /> CRITICAL EXPOSURE <span>03:14 UTC</span>
                  </div>
                  <h3>External access can reach a privileged workload</h3>
                  <dl className="exposure-stats">
                    <div><dt>Attack path</dt><dd>4 steps</dd></div>
                    <div><dt>Affected assets</dt><dd>3</dd></div>
                    <div><dt>Confidence</dt><dd>High</dd></div>
                  </dl>
                  <div className="recommendation">
                    <span>RECOMMENDED REMEDIATION</span>
                    <strong>Restrict external service exposure</strong>
                    <button
                      type="button"
                      className="evidence-button"
                      aria-expanded={evidenceOpen}
                      onClick={() => setEvidenceOpen((value) => !value)}
                    >
                      {evidenceOpen ? 'Hide evidence' : 'View evidence'} <span aria-hidden="true">{evidenceOpen ? '−' : '+'}</span>
                    </button>
                  </div>
                  {evidenceOpen && (
                    <div className="evidence-detail">
                      <span>INTERNET → PUBLIC-APP-08</span>
                      <span>SMB / TCP 445 → WKLD-19</span>
                      <span>SVC-ID-227 → SRV-PROD-02</span>
                    </div>
                  )}
                </div>
              </div>
            </article>

            <article className="story-copy copy-center bridge-copy" data-step="4">
              <div className="copy-inner">
                <p className="step-label"><span>04</span> ONE ENVIRONMENT / TWO ENGINES</p>
                <h2>
                  <span className="attack-text">Attack discovers what could happen.</span><br />
                  <span className="defend-text">Defend investigates what did.</span>
                </h2>
                <p className="body-copy">The discovered environment stays. New activity moves through the same context.</p>
              </div>
            </article>

            <article className="story-copy copy-left" data-step="5">
              <div className="copy-inner">
                <p className="step-label defend-text"><span>05</span> SKYDDA DEFEND</p>
                <h2>Understand what actually happened.</h2>
                <p className="body-copy">
                  Skydda investigates every alert using evidence, competing hypotheses, and your organization’s own
                  context—proving, disproving, and verifying before reaching a conclusion.
                </p>
                <div className="correlation-line">
                  <span>118 SIGNALS</span><i /> <span>27 ENTITIES</span><i /> <strong>1 INVESTIGATION</strong>
                </div>
              </div>
            </article>

            <article className="story-copy copy-left" data-step="6">
              <div className="copy-inner">
                <p className="step-label defend-text"><span>06</span> INVESTIGATION</p>
                <h2>Disproven, not assumed.</h2>
                <p className="body-copy">
                  Skydda doesn’t trust its first answer. It systematically eliminates explanations until the strongest
                  evidence-backed conclusion remains.
                </p>
                <div className="hypothesis-list" aria-label="Investigation hypotheses">
                  <div className="is-disproven"><span>A / Credential reuse</span><strong>DISPROVEN</strong></div>
                  <div className="is-disproven"><span>B / Benign automation</span><strong>DISPROVEN</strong></div>
                  <div className="is-verified"><span>C / Compromised identity</span><strong>VERIFIED</strong></div>
                </div>
              </div>
            </article>

            <article className="story-copy copy-center clarity-copy" data-step="7">
              <div className="copy-inner">
                <p className="step-label"><span>07</span> NOISE → CLARITY</p>
                <h2>From noise to clarity.</h2>
                <div className="clarity-metrics">
                  <div><span>118</span><small>events</small></div>
                  <i aria-hidden="true">→</i>
                  <div><span>1</span><small>investigation</small></div>
                  <i aria-hidden="true">→</i>
                  <div><span>1</span><small>action</small></div>
                </div>
                <p className="body-copy">Less telemetry to interpret. More evidence to act on.</p>
              </div>
            </article>

            <article className="story-copy copy-left unified-copy" data-step="8">
              <div className="copy-inner">
                <p className="step-label"><span>08</span> SKYDDA UNIFIED</p>
                <h2>One living understanding of your enterprise.</h2>
                <p className="body-copy">
                  Attack continuously discovers weaknesses. Defend continuously investigates activity. Both learn from
                  the same assets, identities, relationships, history, and business context.
                </p>
                <div className="engine-key">
                  <span><i className="attack-key" /> ATTACK / WHAT COULD HAPPEN</span>
                  <span><i className="defend-key" /> DEFEND / WHAT DID HAPPEN</span>
                </div>
              </div>
            </article>

            <nav className="story-progress" aria-label="Skydda story chapters">
              <span className="active-story-label" aria-hidden="true">
                {String(activeStep + 1).padStart(2, '0')} / {STORY_STEPS[activeStep]}
              </span>
              <div>
                {STORY_STEPS.map((step, index) => (
                  <button
                    key={step}
                    type="button"
                    className={index === activeStep ? 'is-active' : ''}
                    aria-label={`Go to ${step}`}
                    aria-current={index === activeStep ? 'step' : undefined}
                    onClick={() => goToStep(index)}
                  ><span /></button>
                ))}
              </div>
            </nav>
          </div>
        </section>

        <section className="editorial-section why-section" id="field-notes">
          <div className="section-kicker"><span>FIELD NOTES / 001</span><span>REASONING UNDER PRESSURE</span></div>
          <div className="why-grid">
            <p className="vertical-label">WHY NOT JUST AN AI SOC?</p>
            <div>
              <h2>Other tools bolt an LLM onto a SOC and hope for the best.</h2>
              <p className="lead-copy">
                Skydda doesn’t hope—it doubts. Intelligence comes from active investigation, technical validation, and
                the context unique to your business. No language model makes the call alone.
              </p>
              <div className="principles">
                <article>
                  <span>01 / PROVE → DISPROVE → VERIFY</span>
                  <h3>Disproven, not assumed.</h3>
                  <p>Skydda doesn’t trust its first answer. It proves, disproves, and verifies before acting.</p>
                </article>
                <article>
                  <span>02 / HUMAN AUTHORITY</span>
                  <h3>You stay in control.</h3>
                  <p>Skydda acts when you say, escalates when it matters, and explains every step. Nothing stays hidden.</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="editorial-section coverage-section" id="coverage">
          <div className="coverage-heading">
            <p className="section-label">COVERAGE / BUILT FOR REAL OPERATIONS</p>
            <h2>Built for CISOs<br />who won’t compromise.</h2>
            <p>Every alert. Every exposure. Every decision shown in full.</p>
          </div>
          <div className="coverage-list">
            {COVERAGE.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="field-note-section">
          <p className="section-label">FIELD NOTE / 007 · KNOWING VS. HOPING</p>
          <blockquote>
            “A security decision is only as strong as the evidence that survives doubt.”
          </blockquote>
          <div className="note-meta">
            <span>SKYDDA RESEARCH</span>
            <span>INVESTIGATION DESIGN</span>
            <span>06 MIN READ</span>
          </div>
        </section>

        <section className="final-cta" id="demo">
          <div className="calm-graph" aria-hidden="true">
            <div className="calm-ring ring-one" />
            <div className="calm-ring ring-two" />
            <span className="calm-node node-one" />
            <span className="calm-node node-two" />
            <span className="calm-node node-three" />
            <i className="calm-path path-one" />
            <i className="calm-path path-two" />
          </div>
          <div className="final-content">
            <p className="section-label">ONE ENVIRONMENT. ONE CLEAR ANSWER.</p>
            <h2>Stop hoping.<br /><span>Start knowing.</span></h2>
            <p>Every alert investigated. Every exposure understood.<br />Answers in minutes, not days.</p>
            <button className="cta-button final-button" type="button" onClick={openDemo}>
              Book a demo <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top">
          <img src="/skydda-mark.svg" alt="" width="22" height="22" />
          <span>Skydda</span>
        </a>
        <p>Attack what could happen. Defend what did.</p>
        <div><span>© 2026 SKYDDA AI</span><a href="https://skydda.ai/privacy-policy">PRIVACY</a></div>
      </footer>

      <dialog className="demo-dialog" ref={demoDialogRef}>
        <button
          className="dialog-close"
          type="button"
          aria-label="Close demo request"
          onClick={() => demoDialogRef.current?.close()}
        >×</button>
        {demoSent ? (
          <div className="demo-success">
            <p className="section-label">REQUEST RECEIVED</p>
            <h2>Let’s make your environment knowable.</h2>
            <p>This prototype has captured your request. A production form would now route it to the Skydda team.</p>
            <button className="cta-button" type="button" onClick={() => demoDialogRef.current?.close()}>Done →</button>
          </div>
        ) : (
          <form onSubmit={submitDemo}>
            <p className="section-label">BOOK A DEMO / 30 MINUTES</p>
            <h2>Your environment.<br />Real answers.</h2>
            <p>Tell us who’s joining. We’ll make every minute count.</p>
            <div className="form-grid">
              <label>First name<input name="firstName" autoComplete="given-name" required placeholder="Jane" /></label>
              <label>Last name<input name="lastName" autoComplete="family-name" required placeholder="Smith" /></label>
              <label className="wide-field">Work email<input name="email" type="email" autoComplete="email" required placeholder="jane@company.com" /></label>
              <label className="wide-field">Organization<input name="organization" autoComplete="organization" required placeholder="Acme Corp" /></label>
            </div>
            <button className="cta-button form-submit" type="submit">Continue →</button>
          </form>
        )}
      </dialog>
    </>
  );
}
