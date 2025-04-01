<script lang="ts">
    import { Scroll } from "$lib";
    import * as THREE from "three";
    import { onMount } from "svelte";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
    import { onWindowResize, loadModels } from "$lib/Helper-3D";
  
    let progress = 0;
    let threeJSContainer: HTMLElement;
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    const FLOOR = -250;
  
    // Flamingo / 3D elements
    const morphs: THREE.Mesh[] = [];
    let mixer: THREE.AnimationMixer;
    let genreBars: THREE.Mesh[] = [];
  
    // Arrays for decade labels, etc.
    let barLabels: THREE.Object3D[] = [];      // decade label planes
    let legendTextPlanes: THREE.Mesh[] = [];   // text planes in the 3D legend
    let legendCubes: THREE.Mesh[] = [];        // color cubes in the 3D legend
  
    // Data
    const uniqueGenres = ["Drama", "Comedy", "Action", "Romance", "Horror", "Thriller", "Documentary"];
    const decades = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s"];
  
    // Genre Colors
    const genreColors = {
      "Drama": 0x8B4513,     // Brown
      "Comedy": 0x32CD32,    // Lime Green
      "Action": 0x1E90FF,    // Dodger Blue
      "Romance": 0xFF69B4,   // Hot Pink
      "Horror": 0x800080,    // Purple
      "Thriller": 0xFF4500,  // Orange Red
      "Documentary": 0xFFD700 // Gold
    };
  
    // Additional descriptions for the legend
    const genreDescriptions = {
      "Drama": "Intense, character-driven stories",
      "Comedy": "Humorous, light-hearted films",
      "Action": "High energy, fast-paced sequences",
      "Romance": "Love and relationship-focused",
      "Horror": "Scary, suspenseful themes",
      "Thriller": "Edge-of-your-seat tension",
      "Documentary": "Real-life, informative focus"
    };
  
    // Example data for each decade and genre
    const genreData = {
      "1950s": {"Drama": 80, "Comedy": 50, "Action": 30, "Romance": 60, "Horror": 20, "Thriller": 25, "Documentary": 15},
      "1960s": {"Drama": 70, "Comedy": 45, "Action": 50, "Romance": 40, "Horror": 30, "Thriller": 60, "Documentary": 20},
      "1970s": {"Drama": 65, "Comedy": 55, "Action": 70, "Romance": 35, "Horror": 60, "Thriller": 80, "Documentary": 25},
      "1980s": {"Drama": 60, "Comedy": 80, "Action": 90, "Romance": 50, "Horror": 60, "Thriller": 55, "Documentary": 30},
      "1990s": {"Drama": 70, "Comedy": 75, "Action": 85, "Romance": 70, "Horror": 50, "Thriller": 65, "Documentary": 40},
      "2000s": {"Drama": 75, "Comedy": 65, "Action": 80, "Romance": 60, "Horror": 45, "Thriller": 55, "Documentary": 70}
    };
  
    // For animation
    const clock = new THREE.Clock();
  
    // For click interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let tooltipEl: HTMLDivElement;  // references the tooltip element
  
    onMount(() => {
      init(window.innerWidth * 0.6, window.innerHeight * 0.9);
  
      // Add an HTML legend (at bottom-left)
      const legendDiv = createHtmlLegend();
      document.querySelector('.viz-container')?.appendChild(legendDiv);
  
      tooltipEl = document.getElementById("tooltip") as HTMLDivElement;
  
      // Add click event listener (no hover events now)
      renderer.domElement.addEventListener("click", onClick);
  
      return () => {
        renderer.domElement.removeEventListener("click", onClick);
      };
    });
  
    // Create a simple HTML legend with genre names and descriptions
    function createHtmlLegend() {
      const div = document.createElement('div');
      div.className = 'simple-legend';
      div.innerHTML = `
        <div class="legend-title">GENRE LEGEND</div>
        <ul class="legend-list">
          ${Object.entries(genreColors).map(([genre, color]) => {
            const hexColor = `#${color.toString(16).padStart(6, '0')}`;
            return `
              <li class="legend-item">
                <span class="color-box" style="background-color: ${hexColor};"></span>
                <span class="genre-name">${genre}: ${genreDescriptions[genre]}</span>
              </li>
            `;
          }).join('')}
        </ul>
      `;
      return div;
    }
  
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
  
      // Build the 3D legend (in the scene)
      create3DLegend();
  
      // Create the bars for each decade & genre with labels
      createGenreBarsAndLabels();
  
      // Load flamingo models
      const models = [
        { path: "3d/Flamingo.glb", speed: 450, duration: 1, x: 300,  y: FLOOR + 250, z: 0,    scale: 0.3 },
        { path: "3d/Flamingo.glb", speed: 500, duration: 1, x: -200, y: FLOOR + 230, z: -200, scale: 0.25 },
        { path: "3d/Flamingo.glb", speed: 550, duration: 1, x: 0,    y: FLOOR + 270, z: 300,  scale: 0.35 },
        { path: "3d/Flamingo.glb", speed: 600, duration: 1, x: -150, y: FLOOR + 260, z: 150,  scale: 0.3 }
      ];
      mixer = loadModels(models, scene, mixer, morphs);
  
      // Resize handler
      window.addEventListener("resize", () => {
        onWindowResize(camera, renderer, window.innerWidth * 0.6, window.innerHeight * 0.9);
      });
  
      // OrbitControls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
      controls.minDistance = 100;
      controls.maxDistance = 2000;
      controls.target.set(0, 0, 0);
      controls.update();
  
      // Start animation loop
      renderer.setAnimationLoop(animate);
    }
  
    // 3D Legend: colored cubes and text that always face the camera
    function create3DLegend() {
      const legendGroup = new THREE.Group();
      legendGroup.position.set(-200, FLOOR + 350, 250);
      scene.add(legendGroup);
  
      // Black background panel for the legend
      const bgGeometry = new THREE.PlaneGeometry(200, 280);
      const bgMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const bgPanel = new THREE.Mesh(bgGeometry, bgMaterial);
      bgPanel.position.set(0, -70, -1); // slightly behind
      legendGroup.add(bgPanel);
  
      // "GENRE LEGEND" Title
      const titleCanvas = document.createElement('canvas');
      titleCanvas.width = 512;
      titleCanvas.height = 64;
      const titleCtx = titleCanvas.getContext('2d');
      if (titleCtx) {
        titleCtx.fillStyle = 'white';
        titleCtx.font = 'Bold 36px Arial';
        titleCtx.fillText('GENRE LEGEND', 10, 40);
      }
      const titleTexture = new THREE.CanvasTexture(titleCanvas);
      titleTexture.minFilter = THREE.LinearFilter;
      titleTexture.magFilter = THREE.LinearFilter;
      const titleMaterial = new THREE.MeshBasicMaterial({
        map: titleTexture,
        transparent: true,
        side: THREE.DoubleSide
      });
      const titlePlane = new THREE.Mesh(new THREE.PlaneGeometry(180, 30), titleMaterial);
      titlePlane.position.set(0, 60, 0);
      legendGroup.add(titlePlane);
  
      // For each genre, add a colored cube and text label
      uniqueGenres.forEach((genre, i) => {
        const barColor = genreColors[genre];
        // The color cube
        const cubeGeo = new THREE.BoxGeometry(15, 15, 15);
        const cubeMat = new THREE.MeshStandardMaterial({
          color: barColor,
          emissive: barColor,
          emissiveIntensity: 0.5
        });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);
        cube.position.set(-70, i * -30, 0);
        legendGroup.add(cube);
        legendCubes.push(cube);
  
        // The text label for the genre
        const textCanvas = document.createElement('canvas');
        textCanvas.width = 512;
        textCanvas.height = 64;
        const ctx = textCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.font = 'Bold 32px Arial';
          ctx.fillText(genre, 10, 40);
        }
        const textTexture = new THREE.CanvasTexture(textCanvas);
        textTexture.minFilter = THREE.LinearFilter;
        textTexture.magFilter = THREE.LinearFilter;
        const textMaterial = new THREE.MeshBasicMaterial({
          map: textTexture,
          transparent: true,
          side: THREE.DoubleSide
        });
        const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(70, 20), textMaterial);
        textPlane.position.set(-20, i * -30, 0);
        legendGroup.add(textPlane);
        legendTextPlanes.push(textPlane);
      });
    }
  
    // Create bars for each decade and genre.
    // Each bar gets a label plane that is hidden by default.
    // The label is placed well above the bar and will be toggled on click.
    function createGenreBarsAndLabels() {
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
  
      // Create decade labels
      decades.forEach((decade, decadeIndex) => {
        const decadeX = (decadeIndex - decades.length / 2) * decadeSpacing;
  
        const dCanvas = document.createElement('canvas');
        dCanvas.width = 256;
        dCanvas.height = 64;
        const dCtx = dCanvas.getContext('2d');
        if (dCtx) {
          dCtx.fillStyle = 'white';
          dCtx.font = 'Bold 32px Arial';
          dCtx.fillText(decade, 10, 42);
        }
        const dTexture = new THREE.CanvasTexture(dCanvas);
        dTexture.minFilter = THREE.LinearFilter;
        dTexture.magFilter = THREE.LinearFilter;
        const dMaterial = new THREE.MeshBasicMaterial({
          map: dTexture,
          transparent: true,
          side: THREE.DoubleSide
        });
        const dPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 25), dMaterial);
        dPlane.position.set(decadeX, FLOOR + 20, 120);
        scene.add(dPlane);
        barLabels.push(dPlane);
  
        // For each genre in this decade, create a bar and a label
        uniqueGenres.forEach((genre, genreIndex) => {
          const count = genreData[decade][genre] || 0;
          const height = Math.max(count * heightScale, 10);
          const genreZ = (genreIndex - uniqueGenres.length / 2) * genreSpacing;
  
          const barGeo = new THREE.BoxGeometry(barWidth, height, barWidth);
          const barMat = new THREE.MeshStandardMaterial({
            color: genreColors[genre],
            metalness: 0.3,
            roughness: 0.8,
            emissive: genreColors[genre],
            emissiveIntensity: 0.3
          });
          const bar = new THREE.Mesh(barGeo, barMat);
          bar.position.set(decadeX, FLOOR + height / 2, genreZ);
          bar.castShadow = true;
          bar.receiveShadow = true;
          bar.userData = { decade, genre, count, decadeIndex, genreIndex };
  
          // Create the label for the bar
          const labelCanvas = document.createElement('canvas');
          labelCanvas.width = 512;
          labelCanvas.height = 128;
          const labelCtx = labelCanvas.getContext('2d');
          if (labelCtx) {
            labelCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            labelCtx.fillRect(0, 0, 512, 128);
            labelCtx.strokeStyle = 'white';
            labelCtx.lineWidth = 4;
            labelCtx.strokeRect(2, 2, 508, 124);
            labelCtx.fillStyle = 'white';
            labelCtx.font = 'Bold 36px Arial';
            labelCtx.fillText(`${genre}: ${count}`, 10, 70);
          }
          const labelTexture = new THREE.CanvasTexture(labelCanvas);
          labelTexture.minFilter = THREE.LinearFilter;
          labelTexture.magFilter = THREE.LinearFilter;
          const labelMaterial = new THREE.MeshBasicMaterial({
            map: labelTexture,
            transparent: true,
            side: THREE.DoubleSide
          });
          const labelPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), labelMaterial);
  
          // Place the label well above the bar
          labelPlane.position.set(0, height + 30, 0);
          // Disable depth test so it's always visible
          labelMaterial.depthTest = false;
          labelMaterial.depthWrite = false;
          labelPlane.renderOrder = 9999;
          // Hide label initially (will be toggled on click)
          labelPlane.visible = false;
          bar.add(labelPlane);
          bar.userData.labelPlane = labelPlane;
  
          bar.visible = false;
          scene.add(bar);
          genreBars.push(bar);
        });
      });
    }
  
    // Animation loop
    function animate() {
      if (controls) controls.update();
  
      // Determine phase from scroll progress
      const phase = Math.floor(progress / 25);
      const phaseProgress = (progress % 25) / 25;
      camera.fov = phase === 3 ? 40 : 35;
      camera.updateProjectionMatrix();
  
      switch (phase) {
        case 0:
          camera.position.set(0, FLOOR + 200, 300 + phaseProgress * 300);
          camera.lookAt(0, 0, 0);
          genreBars.forEach(bar => (bar.visible = false));
          barLabels.forEach(label => (label.visible = false));
          morphs.forEach(flamingo => (flamingo.visible = false));
          break;
        case 1: {
          const halfPoint = Math.ceil(decades.length / 2);
          const targetDecade = Math.floor(phaseProgress * halfPoint);
          camera.position.set(-200 + phaseProgress * 200, FLOOR + 250, 450 - phaseProgress * 150);
          camera.lookAt(0, 0, 0);
          genreBars.forEach(bar => {
            const ud = bar.userData;
            if (ud.decadeIndex < targetDecade) {
              bar.visible = true;
              bar.scale.y = 1;
            } else if (ud.decadeIndex === targetDecade) {
              bar.visible = true;
              bar.scale.y = Math.min(1, (phaseProgress * halfPoint) % 1 * 3);
            } else {
              bar.visible = false;
            }
          });
          barLabels.forEach(label => {
            const ud = label.userData;
            label.visible = ud && ud.decadeIndex <= targetDecade;
          });
          morphs.forEach(flamingo => (flamingo.visible = false));
          break;
        }
        case 2: {
          const secondHalfStart = Math.ceil(decades.length / 2);
          const secondHalfTarget = secondHalfStart + Math.floor(phaseProgress * (decades.length - secondHalfStart));
          camera.position.set(0, FLOOR + 250 + phaseProgress * 50, 300);
          camera.lookAt(0, 50, 0);
          genreBars.forEach(bar => {
            const ud = bar.userData;
            if (ud.decadeIndex < secondHalfTarget) {
              bar.visible = true;
              bar.scale.y = 1;
            } else if (ud.decadeIndex === secondHalfTarget) {
              bar.visible = true;
              bar.scale.y = Math.min(1, (phaseProgress * (decades.length - secondHalfStart)) % 1 * 3);
            } else {
              bar.visible = false;
            }
          });
          barLabels.forEach(label => {
            const ud = label.userData;
            label.visible = ud && ud.decadeIndex <= secondHalfTarget;
          });
          // Show flamingos gradually
          morphs.forEach((flamingo, index) => {
            flamingo.visible = phaseProgress > 0.6;
            if (flamingo.visible) {
              const scale = Math.min(1, (phaseProgress - 0.6) * 2.5);
              const baseScale = [0.3, 0.25, 0.35, 0.3][index] || 0.3;
              flamingo.scale.set(baseScale * scale, baseScale * scale, baseScale * scale);
            }
          });
          break;
        }
        case 3:
          camera.fov = 48;
          camera.updateProjectionMatrix();
          genreBars.forEach(bar => {
            bar.visible = true;
            const mat = bar.material as THREE.MeshStandardMaterial;
            const time = clock.getElapsedTime();
            if (mat.emissive) {
              mat.emissiveIntensity = 0.3 + Math.sin(time * 2 + bar.userData.genreIndex * 0.5) * 0.1;
            }
          });
          barLabels.forEach(label => (label.visible = true));
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
          break;
      }
  
      // Update flamingo movement if visible
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      morphs.forEach((flamingo, index) => {
        if (flamingo.visible) {
          const speedFactor = 0.5 + index * 0.2;
          const t = clock.getElapsedTime() * speedFactor;
          const flamingoRadius = 120 + index * 40;
          flamingo.position.x = Math.sin(t + index * Math.PI / 1.5) * flamingoRadius;
          flamingo.position.z = Math.cos(t + index * Math.PI / 1.5) * flamingoRadius;
          flamingo.rotation.y = Math.atan2(
            Math.cos(t + index * Math.PI / 1.5),
            -Math.sin(t + index * Math.PI / 1.5)
          );
          const originalY = FLOOR + 230 + index * 10;
          flamingo.position.y = originalY + Math.sin(t * 2) * 5;
        }
      });
  
      // Make sure decade labels and 3D legend text face the camera
      barLabels.forEach(label => label.lookAt(camera.position));
      legendTextPlanes.forEach(plane => plane.lookAt(camera.position));
      legendCubes.forEach(cube => cube.lookAt(camera.position));
  
      // Ensure each bar's label (if visible) faces the camera
      genreBars.forEach(bar => {
        const labelPlane = bar.userData.labelPlane as THREE.Mesh;
        if (labelPlane) {
          labelPlane.lookAt(camera.position);
        }
      });
  
      renderer.render(scene, camera);
    }
  
    // Click logic: toggle the bar's label and tooltip on click.
    function onClick(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      // Enable recursive search so that clicking on a child (e.g. label plane) still detects the bar.
      const intersects = raycaster.intersectObjects(genreBars, true);
      if (intersects.length > 0) {
        // Climb the parent chain to get the top-level bar
        let bar = intersects[0].object;
        while (bar.parent && !genreBars.includes(bar)) {
          bar = bar.parent;
        }
        // Toggle the label plane and tooltip on click
        if (bar.userData.labelPlane) {
          const currentlyVisible = bar.userData.labelPlane.visible;
          if (currentlyVisible) {
            bar.userData.labelPlane.visible = false;
            hideTooltip();
          } else {
            bar.userData.labelPlane.visible = true;
            showTooltip(bar, event.clientX, event.clientY);
          }
        }
        // Hide labels for all other bars
        genreBars.forEach(otherBar => {
          if (otherBar !== bar && otherBar.userData.labelPlane) {
            otherBar.userData.labelPlane.visible = false;
          }
        });
      } else {
        // Clicked outside any bar: hide all labels and tooltip
        hideTooltip();
        genreBars.forEach(bar => {
          if (bar.userData.labelPlane) {
            bar.userData.labelPlane.visible = false;
          }
        });
      }
    }
  
    // Show tooltip near the mouse pointer with the bar's data.
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
  
    <!-- Visualization container with progress indicator -->
    <svelte:fragment slot="viz">
      <div class="viz-container">
        <div class="progress-display">Scroll Progress: {progress.toFixed(0)}%</div>
        <div bind:this={threeJSContainer}></div>
      </div>
    </svelte:fragment>
  </Scroll>
  
  <!-- Tooltip for displaying bar data on click -->
  <div
    id="tooltip"
    style="
      position: absolute;
      pointer-events: none;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 6px;
      border-radius: 4px;
      font-size: 14px;
      display: none;
      z-index: 999;
    "
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
      max-width: 300px;
      font-family: Arial, sans-serif;
    }
    .legend-title {
      color: white;
      font-weight: bold;
      font-size: 16px;
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
  