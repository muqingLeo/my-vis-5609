<script lang="ts">
    import { Scroll } from "$lib";
    import type { TMovie } from "../../types";
    import * as THREE from "three";
    import { onMount } from "svelte";
    import { onWindowResize, loadModels } from "$lib/Helper-3D";
    import * as d3 from "d3";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  
    let progress = 0;
    let threeJSContainer: HTMLElement;
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    const FLOOR = -250;
  
    // 3D elements
    const morphs: Array<THREE.Mesh> = [];
    let mixer: THREE.AnimationMixer;
    let genreBars: THREE.Mesh[] = [];
    let barLabels: THREE.Object3D[] = [];
    let genreLabels: THREE.Object3D[] = [];
  
    // Data
    const uniqueGenres = ["Drama", "Comedy", "Action", "Romance", "Horror", "Thriller", "Documentary"];
    const decades = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s"];
  
    // Fixed colors for each genre
    const genreColors = {
      "Drama": 0x8B4513,     // Brown
      "Comedy": 0x32CD32,    // Lime Green
      "Action": 0x1E90FF,    // Dodger Blue
      "Romance": 0xFF69B4,   // Hot Pink
      "Horror": 0x800080,    // Purple
      "Thriller": 0xFF4500,  // Orange Red
      "Documentary": 0xFFD700 // Gold
    };
  
    const genreData = {
      "1950s": {"Drama": 80, "Comedy": 50, "Action": 30, "Romance": 60, "Horror": 20, "Thriller": 25, "Documentary": 15},
      "1960s": {"Drama": 70, "Comedy": 45, "Action": 50, "Romance": 40, "Horror": 30, "Thriller": 60, "Documentary": 20},
      "1970s": {"Drama": 65, "Comedy": 55, "Action": 70, "Romance": 35, "Horror": 60, "Thriller": 80, "Documentary": 25},
      "1980s": {"Drama": 60, "Comedy": 80, "Action": 90, "Romance": 50, "Horror": 60, "Thriller": 55, "Documentary": 30},
      "1990s": {"Drama": 70, "Comedy": 75, "Action": 85, "Romance": 70, "Horror": 50, "Thriller": 65, "Documentary": 40},
      "2000s": {"Drama": 75, "Comedy": 65, "Action": 80, "Romance": 60, "Horror": 45, "Thriller": 55, "Documentary": 70}
    };
  
    const clock = new THREE.Clock();
  
    // Raycaster and mouse vector for interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
  
    // Tooltip element (we add it in the markup below)
    let tooltipEl: HTMLDivElement;
  
    // Create a basic HTML legend (for the non-3D legend)
    function createSimpleLegend() {
      const div = document.createElement('div');
      div.className = 'simple-legend';
      div.innerHTML = `
        <div class="legend-title">GENRE LEGEND</div>
        <ul class="legend-list">
          ${Object.entries(genreColors).map(([genre, color]) => {
            const hexColor = `#${color.toString(16).padStart(6, '0')}`;
            return `<li class="legend-item">
                      <span class="color-box" style="background-color: ${hexColor};"></span>
                      <span class="genre-name">${genre}</span>
                    </li>`;
          }).join('')}
        </ul>
      `;
      return div;
    }
  
    onMount(() => {
      init(window.innerWidth * 0.6, window.innerHeight * 0.9);
  
      // Create and add the simple HTML legend
      const legendDiv = createSimpleLegend();
      document.querySelector('.viz-container')?.appendChild(legendDiv);
  
      // Get the tooltip element by its id
      tooltipEl = document.getElementById("tooltip") as HTMLDivElement;
  
      // Add pointer event listeners for hover and click interactivity
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("click", onClick);
  
      return () => {
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("click", onClick);
      };
    });
  
    function init(SCREEN_WIDTH: number, SCREEN_HEIGHT: number) {
      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
      renderer.shadowMap.enabled = true;
      threeJSContainer.appendChild(renderer.domElement);
  
      // Camera
      camera = new THREE.PerspectiveCamera(30, SCREEN_WIDTH / SCREEN_HEIGHT, 10, 3000);
      camera.position.set(0, 50, 900);
  
      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x87CEEB);  // Sky blue
  
      // Lights
      const ambient = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambient);
  
      const light = new THREE.DirectionalLight(0xffffff, 1.5);
      light.position.set(0, 1500, 1000);
      light.castShadow = true;
      scene.add(light);
  
      const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
      backLight.position.set(0, 1000, -1000);
      scene.add(backLight);
  
      // Ground
      const groundGeo = new THREE.PlaneGeometry(5000, 5000);
      const groundMat = new THREE.MeshLambertMaterial({ color: 0x7CBA5E });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = FLOOR;
      ground.receiveShadow = true;
      scene.add(ground);
  
      // Create genre bars and labels
      createGenreBarsAndLabels();
  
      // Load flamingo models
      const models = [
        {
          path: "3d/Flamingo.glb",
          speed: 450,
          duration: 1,
          x: 300,
          y: FLOOR + 250,
          z: 0,
          scale: 0.3,
        },
        {
          path: "3d/Flamingo.glb",
          speed: 500,
          duration: 1,
          x: -200,
          y: FLOOR + 230,
          z: -200,
          scale: 0.25,
        },
        {
          path: "3d/Flamingo.glb",
          speed: 550,
          duration: 1,
          x: 0,
          y: FLOOR + 270,
          z: 300,
          scale: 0.35,
        },
        {
          path: "3d/Flamingo.glb",
          speed: 600,
          duration: 1,
          x: -150,
          y: FLOOR + 260,
          z: 150,
          scale: 0.3,
        }
      ];
      mixer = loadModels(models, scene, mixer, morphs);
  
      window.addEventListener("resize", () => {
        onWindowResize(camera, renderer, window.innerWidth * 0.6, window.innerHeight * 0.9);
      });
  
      // Add OrbitControls so the user can interact with the scene
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.minDistance = 100;
      controls.maxDistance = 2000;
      controls.target.set(0, 0, 0);
      controls.update();
  
      // Set up animation loop
      renderer.setAnimationLoop(animate);
    }
  
    function createGenreBarsAndLabels() {
      const colorScale = (genre: string) => new THREE.Color(genreColors[genre]);
      let maxValue = 0;
      Object.values(genreData).forEach(decadeData => {
        Object.values(decadeData).forEach(count => {
          maxValue = Math.max(maxValue, count as number);
        });
      });
  
      const heightScale = Math.max(125 / maxValue, 1.8);
      const decadeSpacing = 58;
      const genreSpacing = 20;
      const barWidth = 11;
  
      // Create a group for the 3D legend (inside the scene)
      const legendGroup = new THREE.Group();
      const bgGeometry = new THREE.PlaneGeometry(200, 280);
      const bgMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const bgPanel = new THREE.Mesh(bgGeometry, bgMaterial);
      bgPanel.position.set(40, -90, 0);
      legendGroup.add(bgPanel);
  
      const titleCanvas = document.createElement('canvas');
      const titleCtx = titleCanvas.getContext('2d');
      titleCanvas.width = 512;
      titleCanvas.height = 64;
      if (titleCtx) {
        titleCtx.fillStyle = 'white';
        titleCtx.font = 'Bold 36px Arial';
        titleCtx.fillText('GENRE LEGEND', 10, 40);
        const titleTexture = new THREE.CanvasTexture(titleCanvas);
        const titleMaterial = new THREE.MeshBasicMaterial({
          map: titleTexture,
          transparent: true,
          side: THREE.DoubleSide
        });
        const titlePlane = new THREE.Mesh(
          new THREE.PlaneGeometry(180, 30),
          titleMaterial
        );
        titlePlane.position.set(40, 60, 0);
        legendGroup.add(titlePlane);
      }
  
      legendGroup.position.set(-200, FLOOR + 350, 250);
      legendGroup.rotation.y = Math.PI / 6;
      scene.add(legendGroup);
  
      uniqueGenres.forEach((genre, genreIndex) => {
        const barColor = colorScale(genre);
        const cubeGeo = new THREE.BoxGeometry(20, 20, 20);
        const cubeMat = new THREE.MeshStandardMaterial({
          color: barColor,
          emissive: barColor,
          emissiveIntensity: 0.5
        });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.position.set(0, genreIndex * -30, 0);
        legendGroup.add(cube);
  
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.font = 'Bold 36px Arial';
          ctx.fillText(genre, 10, 40);
          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
          });
          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(120, 30),
            material
          );
          plane.position.set(80, genreIndex * -30, 0);
          legendGroup.add(plane);
          genreLabels.push(plane);
        }
      });
  
      decades.forEach((decade, decadeIndex) => {
        const decadeX = (decadeIndex - decades.length / 2) * decadeSpacing;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 32;
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.font = 'Bold 20px Arial';
          ctx.fillText(decade, 5, 24);
          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
          });
          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(80, 20),
            material
          );
          plane.position.set(decadeX, FLOOR + 20, 120);
          // Remove any unwanted rotation so the text stays upright
          plane.rotation.x = 0;
          scene.add(plane);
          barLabels.push(plane);
          plane.userData = { decadeIndex };
        }
  
        uniqueGenres.forEach((genre, genreIndex) => {
          const count = genreData[decade][genre] || 0;
          const height = Math.max(count * heightScale, 10);
          const genreZ = (genreIndex - uniqueGenres.length / 2) * genreSpacing;
          const barGeo = new THREE.BoxGeometry(barWidth, height, barWidth);
          const barColor = colorScale(genre);
          const barMat = new THREE.MeshStandardMaterial({
            color: barColor,
            metalness: 0.3,
            roughness: 0.8,
            emissive: barColor,
            emissiveIntensity: 0.3,
          });
          const bar = new THREE.Mesh(barGeo, barMat);
          bar.position.set(decadeX, FLOOR + height / 2, genreZ);
          bar.castShadow = true;
          bar.receiveShadow = true;
          bar.userData = { decade, genre, count, decadeIndex, genreIndex };
  
          // Create a label for the bar (with both genre and count)
          const genreCanvas = document.createElement('canvas');
          const genreCtx = genreCanvas.getContext('2d');
          genreCanvas.width = 256;
          genreCanvas.height = 64;
          if (genreCtx) {
            // Background for readability
            genreCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            genreCtx.fillRect(0, 0, 256, 64);
            genreCtx.strokeStyle = barColor.getStyle();
            genreCtx.lineWidth = 3;
            genreCtx.strokeRect(1, 1, 254, 62);
            genreCtx.fillStyle = 'white';
            genreCtx.font = 'Bold 22px Arial';
            genreCtx.fillText(`${genre}: ${count}`, 10, 38);
            const genreTexture = new THREE.CanvasTexture(genreCanvas);
            const genreMaterial = new THREE.MeshBasicMaterial({
              map: genreTexture,
              transparent: true,
              side: THREE.DoubleSide
            });
            const genrePlane = new THREE.Mesh(
              new THREE.PlaneGeometry(40, 20),
              genreMaterial
            );
            // Position the label to the side of the bar
            genrePlane.position.set(barWidth + 25, 0, 0);
            genrePlane.rotation.y = -Math.PI / 2;
            bar.add(genrePlane);
          }
  
          bar.visible = false;
          scene.add(bar);
          genreBars.push(bar);
        });
      });
    }
  
    function animate() {
      // Update OrbitControls if enabled
      if (controls) controls.update();
  
      // Different phases based on scroll progress
      const phase = Math.floor(progress / 25);
      const phaseProgress = (progress % 25) / 25;
  
      // Update camera FOV for phase 3 (overview)
      camera.fov = phase === 3 ? 40 : 35;
      camera.updateProjectionMatrix();
  
      switch (phase) {
        case 0: // Introduction phase
          camera.position.set(0, FLOOR + 200, 300 + phaseProgress * 300);
          camera.lookAt(0, 0, 0);
          genreBars.forEach(bar => (bar.visible = false));
          barLabels.forEach(label => (label.visible = false));
          genreLabels.forEach(label => (label.visible = true));
          morphs.forEach(flamingo => (flamingo.visible = false));
          break;
        case 1: // First half of decades
          const halfPoint = Math.ceil(decades.length / 2);
          const targetDecade = Math.floor(phaseProgress * halfPoint);
          camera.position.set(-200 + phaseProgress * 200, FLOOR + 250, 450 - phaseProgress * 150);
          camera.lookAt(0, 0, 0);
          genreBars.forEach(bar => {
            const userData = bar.userData;
            if (userData.decadeIndex < targetDecade) {
              bar.visible = true;
              bar.scale.y = 1;
            } else if (userData.decadeIndex === targetDecade) {
              bar.visible = true;
              bar.scale.y = Math.min(1, (phaseProgress * halfPoint) % 1 * 3);
            } else {
              bar.visible = false;
            }
          });
          barLabels.forEach(label => {
            const userData = label.userData;
            label.visible = userData && userData.decadeIndex <= targetDecade;
          });
          genreLabels.forEach(label => (label.visible = true));
          morphs.forEach(flamingo => (flamingo.visible = false));
          break;
        case 2: // Second half of decades
          const secondHalfStart = Math.ceil(decades.length / 2);
          const secondHalfTarget = secondHalfStart + Math.floor(phaseProgress * (decades.length - secondHalfStart));
          camera.position.set(0, FLOOR + 250 + phaseProgress * 50, 300);
          camera.lookAt(0, 50, 0);
          genreBars.forEach(bar => {
            const userData = bar.userData;
            if (userData.decadeIndex < secondHalfTarget) {
              bar.visible = true;
              bar.scale.y = 1;
            } else if (userData.decadeIndex === secondHalfTarget) {
              bar.visible = true;
              bar.scale.y = Math.min(1, (phaseProgress * (decades.length - secondHalfStart)) % 1 * 3);
            } else {
              bar.visible = false;
            }
          });
          barLabels.forEach(label => {
            const userData = label.userData;
            label.visible = userData && userData.decadeIndex <= secondHalfTarget;
          });
          genreLabels.forEach(label => (label.visible = true));
          morphs.forEach((flamingo, index) => {
            flamingo.visible = phaseProgress > 0.6;
            if (flamingo.visible) {
              const scale = Math.min(1, (phaseProgress - 0.6) * 2.5);
              const baseScale = [0.3, 0.25, 0.35, 0.3][index] || 0.3;
              flamingo.scale.set(baseScale * scale, baseScale * scale, baseScale * scale);
            }
          });
          break;
        case 3: // Overview phase with flamingos
          camera.fov = 48;
          camera.updateProjectionMatrix();
          genreBars.forEach(bar => {
            bar.visible = true;
            const userData = bar.userData;
            const material = bar.material as THREE.MeshStandardMaterial;
            if (material.emissive) {
              const time = clock.getElapsedTime();
              material.emissiveIntensity = 0.3 + Math.sin(time * 2 + userData.genreIndex * 0.5) * 0.1;
            }
          });
          barLabels.forEach(label => (label.visible = true));
          genreLabels.forEach(label => (label.visible = false));
          morphs.forEach(flamingo => (flamingo.visible = true));
          const angle = phaseProgress * Math.PI * 2;
          const radius = 450;
          const height = FLOOR + 320;
          camera.position.set(
            Math.sin(angle) * radius,
            height,
            Math.cos(angle) * radius
          );
          camera.lookAt(0, FLOOR + 60, 0);
          const delta = clock.getDelta();
          if (mixer) {
            mixer.update(delta);
          }
          morphs.forEach((flamingo, index) => {
            const speedFactor = 0.5 + (index * 0.2);
            const t = clock.getElapsedTime() * speedFactor;
            const flamingoRadius = 120 + index * 40;
            flamingo.position.x = Math.sin(t + index * Math.PI / 1.5) * flamingoRadius;
            flamingo.position.z = Math.cos(t + index * Math.PI / 1.5) * flamingoRadius;
            flamingo.rotation.y = Math.atan2(
              Math.cos(t + index * Math.PI / 1.5),
              -Math.sin(t + index * Math.PI / 1.5)
            );
            const originalY = FLOOR + 230 + (index * 10);
            flamingo.position.y = originalY + Math.sin(t * 2) * 5;
          });
          break;
      }
  
      renderer.render(scene, camera);
    }
  
    // Pointer event handler for hover interaction
    function onPointerMove(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(genreBars);
      if (intersects.length > 0) {
        const bar = intersects[0].object as THREE.Mesh;
        showTooltip(bar, event.clientX, event.clientY);
      } else {
        hideTooltip();
      }
    }
  
    // Pointer event handler for click interaction
    function onClick(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(genreBars);
      if (intersects.length > 0) {
        const bar = intersects[0].object as THREE.Mesh;
        console.log("Clicked on bar:", bar.userData);
        // You can add further interactivity here (e.g. highlight or show detailed info)
      }
    }
  
    // Show tooltip near the pointer with the bar's data
    function showTooltip(bar: THREE.Mesh, x: number, y: number) {
      const { decade, genre, count } = bar.userData;
      tooltipEl.innerHTML = `<strong>${decade}</strong><br/>${genre}: ${count}`;
      tooltipEl.style.left = x + 10 + "px";
      tooltipEl.style.top = y + 10 + "px";
      tooltipEl.style.display = "block";
    }
  
    function hideTooltip() {
      tooltipEl.style.display = "none";
    }
  </script>
  
  <h2>The Evolution of Movie Genres Through Time</h2>
  
  <Scroll bind:progress>
    <!-- Scrolly content sections -->
    <div class="threejsSection">
      <h3>Exploring Genre Trends in Cinema</h3>
      <p>This visualization shows how movie genres have evolved across decades, with 3D bars representing the popularity of different genres.</p>
      <p>Scroll down to embark on a journey through cinematic history!</p>
    </div>
  
    <div class="threejsSection">
      <h3>The Rise of Genres (1950s-1970s)</h3>
      <p>As you scroll, watch how different genres emerged and gained popularity in the early decades of modern cinema.</p>
      <p>Notice how certain genres dominated particular time periods, reflecting cultural trends and audience preferences.</p>
      <p>In the 1950s, Drama and Romance were king, while the 1960s saw the rise of Thrillers. By the 1970s, Action and Horror had gained significant popularity.</p>
    </div>
  
    <div class="threejsSection">
      <h3>Modern Cinema (1980s-Present)</h3>
      <p>Continuing our journey, we see how genres evolved in more recent decades.</p>
      <p>The 1980s were dominated by Action and Comedy blockbusters, while the 1990s saw a resurgence in Romance alongside Action films.</p>
      <p>In the 2000s and 2010s, we witness the rise of Documentary and Animation films, reflecting changing audience tastes and advances in technology.</p>
    </div>
  
    <div class="threejsSection">
      <h3>The Big Picture</h3>
      <p>As our flamingo friends circle the visualization, we can observe the complete landscape of genre evolution.</p>
      <p>This aerial view provides a holistic perspective on how cinema has transformed over time.</p>
      <p>Action has remained consistently popular across decades, while genres like Animation and Documentary have seen significant growth in recent times.</p>
    </div>
  
    <!-- Visualization container with a progress indicator -->
    <svelte:fragment slot="viz">
      <div class="viz-container">
        <div class="progress-display">Scroll Progress: {progress.toFixed(0)}%</div>
        <div bind:this={threeJSContainer}></div>
      </div>
    </svelte:fragment>
  </Scroll>
  
  <!-- Tooltip for displaying column data -->
  <div
    id="tooltip"
    style="position: absolute; pointer-events: none; background: rgba(0,0,0,0.7); color: white; padding: 6px; border-radius: 4px; font-size: 14px; display: none; z-index: 999;"
  ></div>
  
  <style>
    div.threejsSection {
      text-align: left;
      color: #333;
      height: 200vh;
      border: 2px solid #aaa;
      padding: 20px;
      margin: 10px;
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
    }
    h3 {
      color: #449900;
      font-size: 1.6em;
      margin-bottom: 15px;
    }
    p {
      font-size: 1.1em;
      line-height: 1.5;
      margin-bottom: 15px;
    }
    .viz-container {
      position: relative;
    }
    .simple-legend {
      position: absolute;
      bottom: 20px;
      left: 20px;
      z-index: 20;
      background-color: rgba(0, 0, 0, 0.7);
      border: 2px solid white;
      border-radius: 5px;
      padding: 10px;
      max-width: 160px;
      font-family: Arial, sans-serif;
    }
    .legend-title {
      color: white;
      font-weight: bold;
      font-size: 14px;
      text-align: center;
      margin-bottom: 8px;
    }
    .legend-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 5px;
    }
    .color-box {
      display: inline-block;
      width: 15px;
      height: 15px;
      margin-right: 8px;
      border: 1px solid white;
    }
    .genre-name {
      color: white;
      font-size: 13px;
    }
    .progress-display {
      position: absolute;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10;
    }
  </style>
  