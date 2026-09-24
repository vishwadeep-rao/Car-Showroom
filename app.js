/* ==========================================================================
   APEX-9 GT 3D SHOWROOM - APPLICATION LOGIC
   Built with Three.js & Web Audio API
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------------------------------------------------
    // 1. Application State & Configurations
    // ----------------------------------------------------------------------
    const state = {
        // Car Configuration
        paintColor: '#e60026',
        metallic: 0.95,
        roughness: 0.15,
        doorsOpen: false,
        headlightsOn: true,
        underglowOn: true,
        autoRotate: true,
        
        // Scene & Environment
        environment: 'cyber', // 'cyber', 'studio', 'hangar', 'sunset'
        
        // Driving Physics
        isDriving: false,
        position: new THREE.Vector3(0, 0, 0),
        rotation: 0, // Y angle in radians
        speed: 0, // Current speed in mph scale
        maxSpeed: 240,
        acceleration: 0.8,
        friction: 0.985,
        brakePower: 1.5,
        steeringAngle: 0,
        maxSteerAngle: 0.45,
        rpm: 800,
        gear: 'D1',
        keys: { forward: false, backward: false, left: false, right: false, brake: false },
        
        // Audio
        audioEnabled: false,
        audioCtx: null,
        engineOsc: null,
        engineGain: null,
        engineFilter: null
    };

    // ----------------------------------------------------------------------
    // 2. Three.js Core Setup (Scene, Camera, Renderer, Controls)
    // ----------------------------------------------------------------------
    const canvas = document.getElementById('webgl-canvas');
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07090e');
    scene.fog = new THREE.FogExp2('#07090e', 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(6, 3, 9);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Orbit Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevents camera going below ground
    controls.minDistance = 3.5;
    controls.maxDistance = 25;
    controls.target.set(0, 0.8, 0);

    // ----------------------------------------------------------------------
    // 3. Lighting Setup
    // ----------------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainSpotLight = new THREE.SpotLight(0xffffff, 2.5);
    mainSpotLight.position.set(8, 12, 8);
    mainSpotLight.angle = Math.PI / 4;
    mainSpotLight.penumbra = 0.5;
    mainSpotLight.castShadow = true;
    mainSpotLight.shadow.mapSize.width = 2048;
    mainSpotLight.shadow.mapSize.height = 2048;
    mainSpotLight.shadow.bias = -0.0001;
    scene.add(mainSpotLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.8);
    rimLight.position.set(-8, 6, -8);
    scene.add(rimLight);

    const warmFillLight = new THREE.DirectionalLight(0xff7700, 0.8);
    warmFillLight.position.set(8, 4, -6);
    scene.add(warmFillLight);

    // ----------------------------------------------------------------------
    // 4. Procedural Supercar Model Construction
    // ----------------------------------------------------------------------
    const carGroup = new THREE.Group();
    scene.add(carGroup);

    // Materials Store
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(state.paintColor),
        metalness: state.metallic,
        roughness: state.roughness,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
        color: 0x111115,
        metalness: 0.8,
        roughness: 0.3
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x050810,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.85,
        transparent: true,
        opacity: 0.85,
        ior: 1.5
    });

    const wheelRimMaterial = new THREE.MeshStandardMaterial({
        color: 0xddddee,
        metalness: 0.95,
        roughness: 0.1
    });

    const tireMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1e,
        metalness: 0.1,
        roughness: 0.85
    });

    const brakeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff002b,
        metalness: 0.5,
        roughness: 0.2
    });

    const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x00f0ff,
        emissiveIntensity: 2.0
    });

    const taillightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff002b,
        emissiveIntensity: 2.5
    });

    // --- CAR BODYWORK ---
    const bodyMeshGroup = new THREE.Group();
    carGroup.add(bodyMeshGroup);

    // Main Wedge Chassis Base
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.45, 4.4);
    const chassisMesh = new THREE.Mesh(chassisGeo, bodyMaterial);
    chassisMesh.position.set(0, 0.48, 0);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    bodyMeshGroup.add(chassisMesh);

    // Front Nose Cone
    const noseGeo = new THREE.BoxGeometry(2.02, 0.3, 1.2);
    const noseMesh = new THREE.Mesh(noseGeo, bodyMaterial);
    noseMesh.position.set(0, 0.35, 2.3);
    noseMesh.rotation.x = -0.15;
    noseMesh.castShadow = true;
    bodyMeshGroup.add(noseMesh);

    // Front Splitter (Carbon Fiber)
    const splitterGeo = new THREE.BoxGeometry(2.18, 0.08, 0.6);
    const splitterMesh = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitterMesh.position.set(0, 0.16, 2.65);
    splitterMesh.castShadow = true;
    bodyMeshGroup.add(splitterMesh);

    // Aerodynamic Teardrop Roof / Cabin
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.55, 2.1);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
    cabinMesh.position.set(0, 0.95, -0.2);
    cabinMesh.castShadow = true;
    bodyMeshGroup.add(cabinMesh);

    // Roof Top Carbon Cover
    const roofCoverGeo = new THREE.BoxGeometry(1.4, 0.06, 1.9);
    const roofCover = new THREE.Mesh(roofCoverGeo, carbonMaterial);
    roofCover.position.set(0, 1.24, -0.2);
    bodyMeshGroup.add(roofCover);

    // Rear Engine Deck & Diffuser
    const rearDeckGeo = new THREE.BoxGeometry(2.0, 0.4, 1.4);
    const rearDeck = new THREE.Mesh(rearDeckGeo, bodyMaterial);
    rearDeck.position.set(0, 0.58, -1.6);
    rearDeck.castShadow = true;
    bodyMeshGroup.add(rearDeck);

    const diffuserGeo = new THREE.BoxGeometry(2.08, 0.25, 0.8);
    const diffuser = new THREE.Mesh(diffuserGeo, carbonMaterial);
    diffuser.position.set(0, 0.22, -2.15);
    bodyMeshGroup.add(diffuser);

    // --- REAR WING / SPOILER ---
    const spoilerGroup = new THREE.Group();
    
    // Wing Blade
    const wingGeo = new THREE.BoxGeometry(2.2, 0.06, 0.45);
    const wingBlade = new THREE.Mesh(wingGeo, carbonMaterial);
    wingBlade.position.set(0, 1.15, -2.2);
    wingBlade.castShadow = true;
    spoilerGroup.add(wingBlade);

    // Wing Struts
    const strutGeo = new THREE.BoxGeometry(0.08, 0.35, 0.15);
    const strutLeft = new THREE.Mesh(strutGeo, carbonMaterial);
    strutLeft.position.set(-0.6, 0.95, -2.2);
    const strutRight = strutLeft.clone();
    strutRight.position.x = 0.6;
    spoilerGroup.add(strutLeft, strutRight);

    bodyMeshGroup.add(spoilerGroup);

    // --- LIGHTING FIXTURES & HEADLIGHTS ---
    // LED Headlight Bars
    const headlightBarGeo = new THREE.BoxGeometry(0.65, 0.08, 0.15);
    const headlightLeft = new THREE.Mesh(headlightBarGeo, headlightMaterial);
    headlightLeft.position.set(-0.7, 0.42, 2.82);
    const headlightRight = headlightLeft.clone();
    headlightRight.position.x = 0.7;
    bodyMeshGroup.add(headlightLeft, headlightRight);

    // Headlight Spotlights (Forward Projections)
    const leftSpot = new THREE.SpotLight(0x00f0ff, 4.0, 25, Math.PI / 6, 0.3);
    leftSpot.position.set(-0.7, 0.42, 2.85);
    leftSpot.target.position.set(-0.7, 0, 10);
    
    const rightSpot = new THREE.SpotLight(0x00f0ff, 4.0, 25, Math.PI / 6, 0.3);
    rightSpot.position.set(0.7, 0.42, 2.85);
    rightSpot.target.position.set(0.7, 0, 10);

    carGroup.add(leftSpot, leftSpot.target, rightSpot, rightSpot.target);

    // LED Taillight Bar
    const taillightGeo = new THREE.BoxGeometry(1.9, 0.08, 0.1);
    const taillightBar = new THREE.Mesh(taillightGeo, taillightMaterial);
    taillightBar.position.set(0, 0.65, -2.32);
    bodyMeshGroup.add(taillightBar);

    // --- NEON UNDERGLOW ---
    const underglowPoint1 = new THREE.PointLight(0x00f0ff, 3.5, 4.5);
    underglowPoint1.position.set(0, 0.1, 0.5);
    const underglowPoint2 = new THREE.PointLight(0x00f0ff, 3.5, 4.5);
    underglowPoint2.position.set(0, 0.1, -1.2);
    carGroup.add(underglowPoint1, underglowPoint2);

    // --- SCISSOR DOORS (ANIMATABLE HINGED GROUPS) ---
    const doorLeftHinge = new THREE.Group();
    doorLeftHinge.position.set(-1.02, 0.6, 0.7); // Hinge pivot point
    bodyMeshGroup.add(doorLeftHinge);

    const doorMeshGeo = new THREE.BoxGeometry(0.12, 0.55, 1.4);
    const doorLeftMesh = new THREE.Mesh(doorMeshGeo, bodyMaterial);
    doorLeftMesh.position.set(0, 0, -0.6);
    doorLeftMesh.castShadow = true;
    doorLeftHinge.add(doorLeftMesh);

    const doorRightHinge = new THREE.Group();
    doorRightHinge.position.set(1.02, 0.6, 0.7);
    bodyMeshGroup.add(doorRightHinge);

    const doorRightMesh = new THREE.Mesh(doorMeshGeo, bodyMaterial);
    doorRightMesh.position.set(0, 0, -0.6);
    doorRightMesh.castShadow = true;
    doorRightHinge.add(doorRightMesh);

    // --- WHEELS & BRAKES ASSEMBLY ---
    const wheels = [];
    const frontWheelHinges = []; // For steering left/right

    function createWheel(x, y, z, isFront) {
        const wheelPivot = new THREE.Group();
        wheelPivot.position.set(x, y, z);

        const wheelSpinGroup = new THREE.Group(); // Spun during rotation
        wheelPivot.add(wheelSpinGroup);

        // Tire Rubber
        const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 32);
        tireGeo.rotateZ(Math.PI / 2);
        const tireMesh = new THREE.Mesh(tireGeo, tireMaterial);
        tireMesh.castShadow = true;
        wheelSpinGroup.add(tireMesh);

        // Wheel Rim Hub
        const rimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.33, 16);
        rimGeo.rotateZ(Math.PI / 2);
        const rimMesh = new THREE.Mesh(rimGeo, wheelRimMaterial);
        wheelSpinGroup.add(rimMesh);

        // Rim Spokes (Multi-blade turbine design)
        for (let i = 0; i < 5; i++) {
            const spokeGeo = new THREE.BoxGeometry(0.04, 0.34, 0.08);
            const spoke = new THREE.Mesh(spokeGeo, wheelRimMaterial);
            spoke.rotation.x = (i * Math.PI) / 2.5;
            spoke.position.x = x > 0 ? 0.02 : -0.02;
            wheelSpinGroup.add(spoke);
        }

        // Ceramic Brake Caliper
        const caliperGeo = new THREE.BoxGeometry(0.12, 0.22, 0.16);
        const caliper = new THREE.Mesh(caliperGeo, brakeMaterial);
        caliper.position.set(x > 0 ? -0.1 : 0.1, 0.14, 0);
        wheelPivot.add(caliper); // Stays stationary during wheel spin

        carGroup.add(wheelPivot);

        if (isFront) {
            frontWheelHinges.push(wheelPivot);
        }

        wheels.push(wheelSpinGroup);
    }

    // Instantiate 4 Wheels
    createWheel(-1.05, 0.42, 1.45, true);  // Front Left
    createWheel(1.05, 0.42, 1.45, true);   // Front Right
    createWheel(-1.05, 0.42, -1.35, false); // Rear Left
    createWheel(1.05, 0.42, -1.35, false);  // Rear Right


    // ----------------------------------------------------------------------
    // 5. Showroom Environments (Grids, Studio, Hangar, Sunset)
    // ----------------------------------------------------------------------
    let environmentGroup = new THREE.Group();
    scene.add(environmentGroup);

    let floorGrid, floorMesh;

    function buildEnvironment(type) {
        // Clear previous environment
        while (environmentGroup.children.length > 0) {
            const obj = environmentGroup.children[0];
            environmentGroup.remove(obj);
        }

        if (type === 'cyber') {
            scene.background.set('#07090e');
            scene.fog.color.set('#07090e');
            scene.fog.density = 0.015;

            // Reflective Dark Ground Floor
            const floorGeo = new THREE.PlaneGeometry(200, 200);
            const floorMat = new THREE.MeshStandardMaterial({
                color: 0x05070c,
                metalness: 0.9,
                roughness: 0.2
            });
            floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.receiveShadow = true;
            environmentGroup.add(floorMesh);

            // Glowing Cyber Grid Lines
            floorGrid = new THREE.GridHelper(120, 60, 0x00f0ff, 0x1a2638);
            floorGrid.position.y = 0.01;
            environmentGroup.add(floorGrid);

            // Neon Pillars surrounding the showroom
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = 14;
                const pillarGeo = new THREE.CylinderGeometry(0.1, 0.1, 12, 16);
                const pillarMat = new THREE.MeshStandardMaterial({
                    color: 0x00f0ff,
                    emissive: i % 2 === 0 ? 0x00f0ff : 0xff0055,
                    emissiveIntensity: 2.0
                });
                const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                pillar.position.set(Math.cos(angle) * radius, 6, Math.sin(angle) * radius);
                environmentGroup.add(pillar);
            }

        } else if (type === 'studio') {
            scene.background.set('#e2e8f0');
            scene.fog.color.set('#e2e8f0');
            scene.fog.density = 0.008;

            const floorGeo = new THREE.PlaneGeometry(200, 200);
            const floorMat = new THREE.MeshStandardMaterial({
                color: 0xf8fafc,
                metalness: 0.1,
                roughness: 0.1
            });
            floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.receiveShadow = true;
            environmentGroup.add(floorMesh);

            floorGrid = new THREE.GridHelper(100, 50, 0xcbd5e1, 0xe2e8f0);
            floorGrid.position.y = 0.01;
            environmentGroup.add(floorGrid);

        } else if (type === 'hangar') {
            scene.background.set('#0b0e14');
            scene.fog.color.set('#0b0e14');
            scene.fog.density = 0.018;

            const floorGeo = new THREE.PlaneGeometry(200, 200);
            const floorMat = new THREE.MeshStandardMaterial({
                color: 0x111622,
                metalness: 0.8,
                roughness: 0.4
            });
            floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.receiveShadow = true;
            environmentGroup.add(floorMesh);

            floorGrid = new THREE.GridHelper(120, 40, 0xffaa00, 0x222d3d);
            floorGrid.position.y = 0.01;
            environmentGroup.add(floorGrid);

        } else if (type === 'sunset') {
            scene.background.set('#1a0826');
            scene.fog.color.set('#1a0826');
            scene.fog.density = 0.012;

            const floorGeo = new THREE.PlaneGeometry(200, 200);
            const floorMat = new THREE.MeshStandardMaterial({
                color: 0x0f0417,
                metalness: 0.9,
                roughness: 0.15
            });
            floorMesh = new THREE.Mesh(floorGeo, floorMat);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.receiveShadow = true;
            environmentGroup.add(floorMesh);

            floorGrid = new THREE.GridHelper(140, 70, 0xff0088, 0x4a125e);
            floorGrid.position.y = 0.01;
            environmentGroup.add(floorGrid);
        }
    }

    buildEnvironment('cyber');

    // ----------------------------------------------------------------------
    // 6. Driving Particle System (Tire Smoke)
    // ----------------------------------------------------------------------
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleAlphas = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        particlePositions[i * 3] = 0;
        particlePositions[i * 3 + 1] = -100; // Hidden initially
        particlePositions[i * 3 + 2] = 0;
        particleAlphas[i] = 0;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.35,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    let particleIdx = 0;
    function emitTireSmoke(x, z) {
        particlePositions[particleIdx * 3] = x + (Math.random() - 0.5) * 0.4;
        particlePositions[particleIdx * 3 + 1] = 0.15 + Math.random() * 0.2;
        particlePositions[particleIdx * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
        particleIdx = (particleIdx + 1) % particleCount;
        particleGeo.attributes.position.needsUpdate = true;
    }

    // ----------------------------------------------------------------------
    // 7. Web Audio Engine Sound Synthesizer
    // ----------------------------------------------------------------------
    function initAudio() {
        if (state.audioCtx) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            state.audioCtx = new AudioContext();

            state.engineOsc = state.audioCtx.createOscillator();
            state.engineGain = state.audioCtx.createGain();
            state.engineFilter = state.audioCtx.createBiquadFilter();

            state.engineOsc.type = 'sawtooth';
            state.engineOsc.frequency.setValueAtTime(45, state.audioCtx.currentTime); // Low idle rumble

            state.engineFilter.type = 'lowpass';
            state.engineFilter.frequency.setValueAtTime(300, state.audioCtx.currentTime);

            state.engineGain.gain.setValueAtTime(0.08, state.audioCtx.currentTime);

            state.engineOsc.connect(state.engineFilter);
            state.engineFilter.connect(state.engineGain);
            state.engineGain.connect(state.audioCtx.destination);

            state.engineOsc.start();
        } catch (e) {
            console.warn("Web Audio initialization failed", e);
        }
    }

    function updateAudioEngine() {
        if (!state.audioEnabled || !state.audioCtx) return;

        const targetFreq = 45 + (state.speed * 2.2); // Freq increases with speed
        const targetFilter = 300 + (state.speed * 8.0);

        state.engineOsc.frequency.setTargetAtTime(targetFreq, state.audioCtx.currentTime, 0.1);
        state.engineFilter.frequency.setTargetAtTime(targetFilter, state.audioCtx.currentTime, 0.1);
    }

    // ----------------------------------------------------------------------
    // 8. Test Drive Physics & Animation Loop
    // ----------------------------------------------------------------------
    const clock = new THREE.Clock();

    function updatePhysics(delta) {
        if (!state.isDriving) return;

        // Acceleration & Braking
        if (state.keys.forward) {
            state.speed += state.acceleration;
        } else if (state.keys.backward) {
            state.speed -= state.acceleration * 0.7;
        } else {
            state.speed *= state.friction; // Friction decay
        }

        if (state.keys.brake) {
            state.speed *= 0.92; // Strong brake
            if (Math.abs(state.speed) > 15) {
                // Emit tire smoke on heavy braking
                emitTireSmoke(carGroup.position.x - Math.sin(state.rotation) * 1.5, carGroup.position.z - Math.cos(state.rotation) * 1.5);
            }
        }

        // Speed Cap
        state.speed = THREE.MathUtils.clamp(state.speed, -40, state.maxSpeed);

        // Steering Angle
        if (state.keys.left) {
            state.steeringAngle = THREE.MathUtils.lerp(state.steeringAngle, state.maxSteerAngle, 0.15);
        } else if (state.keys.right) {
            state.steeringAngle = THREE.MathUtils.lerp(state.steeringAngle, -state.maxSteerAngle, 0.15);
        } else {
            state.steeringAngle = THREE.MathUtils.lerp(state.steeringAngle, 0, 0.2);
        }

        // Apply Steering to front wheel hinges
        frontWheelHinges.forEach(hinge => {
            hinge.rotation.y = state.steeringAngle;
        });

        // Rotation & Position Update
        if (Math.abs(state.speed) > 0.1) {
            const dir = state.speed >= 0 ? 1 : -1;
            state.rotation += state.steeringAngle * (state.speed / 80) * dir * delta * 4;
            
            // Move Car
            carGroup.position.x += Math.sin(state.rotation) * (state.speed * 0.05) * delta * 60;
            carGroup.position.z += Math.cos(state.rotation) * (state.speed * 0.05) * delta * 60;
            carGroup.rotation.y = state.rotation;

            // Spin Wheels
            wheels.forEach(wheel => {
                wheel.rotation.x += (state.speed * 0.08) * delta * 60;
            });
        }

        // Camera Follow (Smooth Spring Arm)
        const idealOffset = new THREE.Vector3(
            carGroup.position.x - Math.sin(state.rotation) * 8.5,
            carGroup.position.y + 3.2,
            carGroup.position.z - Math.cos(state.rotation) * 8.5
        );
        camera.position.lerp(idealOffset, 0.08);
        controls.target.lerp(new THREE.Vector3(carGroup.position.x, carGroup.position.y + 0.8, carGroup.position.z), 0.1);

        // Update Dashboard HUD
        const currentSpeed = Math.abs(Math.round(state.speed));
        document.getElementById('hud-speed').textContent = String(currentSpeed).padStart(3, '0');
        
        // RPM Bar
        state.rpm = 800 + (currentSpeed * 32);
        const rpmPercent = Math.min(100, (state.rpm / 8500) * 100);
        document.getElementById('hud-rpm-bar').style.width = rpmPercent + '%';

        // Gear Logic
        if (state.speed < 0) state.gear = 'R';
        else if (currentSpeed < 45) state.gear = 'D1';
        else if (currentSpeed < 90) state.gear = 'D2';
        else if (currentSpeed < 150) state.gear = 'D3';
        else state.gear = 'D4';
        document.getElementById('hud-gear').textContent = state.gear;

        updateAudioEngine();
    }

    // Main Render Loop
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        // Auto 360 Spin in Showroom mode
        if (!state.isDriving && state.autoRotate) {
            carGroup.rotation.y += 0.005;
        }

        // Scissor Doors Animation Lerp
        const targetDoorAngle = state.doorsOpen ? Math.PI / 3 : 0;
        doorLeftHinge.rotation.z = THREE.MathUtils.lerp(doorLeftHinge.rotation.z, -targetDoorAngle, 0.08);
        doorLeftHinge.rotation.y = THREE.MathUtils.lerp(doorLeftHinge.rotation.y, targetDoorAngle * 0.3, 0.08);
        
        doorRightHinge.rotation.z = THREE.MathUtils.lerp(doorRightHinge.rotation.z, targetDoorAngle, 0.08);
        doorRightHinge.rotation.y = THREE.MathUtils.lerp(doorRightHinge.rotation.y, -targetDoorAngle * 0.3, 0.08);

        // Physics Update
        updatePhysics(delta);

        controls.update();
        renderer.render(scene, camera);
    }

    // Hide Loader Screen on Ready
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        const progressBar = document.getElementById('progress-bar');
        const loaderStatus = document.getElementById('loader-status');
        
        if (progressBar) progressBar.style.width = '100%';
        if (loaderStatus) loaderStatus.textContent = 'Ready!';
        
        setTimeout(() => {
            if (loader) loader.classList.add('fade-out');
        }, 300);
    }, 1200);

    animate();

    // ----------------------------------------------------------------------
    // 9. UI Event Bindings & Event Handlers
    // ----------------------------------------------------------------------

    // Window Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Color Swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            
            const colorHex = swatch.getAttribute('data-color');
            state.paintColor = colorHex;
            bodyMaterial.color.set(colorHex);
        });
    });

    // Material Sliders
    const sliderMetallic = document.getElementById('slider-metallic');
    const valMetallic = document.getElementById('val-metallic');
    sliderMetallic.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.metallic = val;
        bodyMaterial.metalness = val;
        valMetallic.textContent = Math.round(val * 100) + '%';
    });

    const sliderRoughness = document.getElementById('slider-roughness');
    const valRoughness = document.getElementById('val-roughness');
    sliderRoughness.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.roughness = val;
        bodyMaterial.roughness = val;
        valRoughness.textContent = Math.round(val * 100) + '%';
    });

    // Interactive Action Toggles
    const btnDoors = document.getElementById('btn-doors');
    const indDoors = document.getElementById('ind-doors');
    const doorsText = document.getElementById('doors-text');
    btnDoors.addEventListener('click', () => {
        state.doorsOpen = !state.doorsOpen;
        btnDoors.classList.toggle('active', state.doorsOpen);
        indDoors.classList.toggle('active', state.doorsOpen);
        doorsText.textContent = state.doorsOpen ? 'DOORS OPEN' : 'DOORS CLOSED';
    });

    const btnHeadlights = document.getElementById('btn-headlights');
    const indLights = document.getElementById('ind-lights');
    btnHeadlights.addEventListener('click', () => {
        state.headlightsOn = !state.headlightsOn;
        btnHeadlights.classList.toggle('active', state.headlightsOn);
        indLights.classList.toggle('active', state.headlightsOn);

        const intensity = state.headlightsOn ? 4.0 : 0;
        leftSpot.intensity = intensity;
        rightSpot.intensity = intensity;
        headlightMaterial.emissiveIntensity = state.headlightsOn ? 2.0 : 0;
    });

    const btnUnderglow = document.getElementById('btn-underglow');
    const indUnderglow = document.getElementById('ind-underglow');
    btnUnderglow.addEventListener('click', () => {
        state.underglowOn = !state.underglowOn;
        btnUnderglow.classList.toggle('active', state.underglowOn);
        indUnderglow.classList.toggle('active', state.underglowOn);

        const intensity = state.underglowOn ? 3.5 : 0;
        underglowPoint1.intensity = intensity;
        underglowPoint2.intensity = intensity;
    });

    // Camera Presets
    document.querySelectorAll('.cam-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            state.autoRotate = false;
            document.getElementById('btn-auto-rotate').classList.remove('active');

            const preset = btn.getAttribute('data-cam');
            const targetPos = new THREE.Vector3();

            switch (preset) {
                case 'isometric': targetPos.set(6, 3, 9); break;
                case 'front': targetPos.set(0, 1.2, 6.5); break;
                case 'side': targetPos.set(7, 1.5, 0); break;
                case 'rear': targetPos.set(0, 2.0, -6.5); break;
                case 'wheel': targetPos.set(2.2, 0.8, 1.8); break;
                case 'top': targetPos.set(0, 9, 0.1); break;
            }

            // Smooth camera transition
            let progress = 0;
            const startPos = camera.position.clone();
            function transitionCam() {
                progress += 0.05;
                camera.position.lerpVectors(startPos, targetPos, progress);
                if (progress < 1) requestAnimationFrame(transitionCam);
            }
            transitionCam();
        });
    });

    // Environment Selector
    const envSelect = document.getElementById('env-select');
    envSelect.addEventListener('change', (e) => {
        state.environment = e.target.value;
        buildEnvironment(state.environment);
    });

    // Panels Toggle & Close
    const btnToggleSpecs = document.getElementById('btn-toggle-specs');
    const specsPanel = document.getElementById('specs-panel');
    const closeSpecsBtn = document.getElementById('close-specs-btn');

    btnToggleSpecs.addEventListener('click', () => {
        specsPanel.classList.toggle('closed-left');
        btnToggleSpecs.classList.toggle('active', !specsPanel.classList.contains('closed-left'));
    });

    closeSpecsBtn.addEventListener('click', () => {
        specsPanel.classList.add('closed-left');
        btnToggleSpecs.classList.remove('active');
    });

    const btnToggleControls = document.getElementById('btn-toggle-controls');
    const controlsPanel = document.getElementById('controls-panel');
    const closeControlsBtn = document.getElementById('close-controls-btn');

    btnToggleControls.addEventListener('click', () => {
        controlsPanel.classList.toggle('closed-right');
        btnToggleControls.classList.toggle('active', !controlsPanel.classList.contains('closed-right'));
    });

    closeControlsBtn.addEventListener('click', () => {
        controlsPanel.classList.add('closed-right');
        btnToggleControls.classList.remove('active');
    });

    // Documentation Tab Switcher
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(btn.getAttribute('data-tab'));
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // Auto Rotate Toggle
    const btnAutoRotate = document.getElementById('btn-auto-rotate');
    btnAutoRotate.addEventListener('click', () => {
        state.autoRotate = !state.autoRotate;
        btnAutoRotate.classList.toggle('active', state.autoRotate);
    });

    // Audio Sound Toggle
    const btnSound = document.getElementById('btn-sound');
    const soundIcon = document.getElementById('sound-icon');
    const soundText = document.getElementById('sound-text');

    btnSound.addEventListener('click', () => {
        initAudio();
        state.audioEnabled = !state.audioEnabled;

        if (state.audioEnabled) {
            soundIcon.className = 'fa-solid fa-volume-high';
            soundText.textContent = 'Sound On';
            btnSound.classList.add('active');
            if (state.audioCtx && state.audioCtx.state === 'suspended') {
                state.audioCtx.resume();
            }
        } else {
            soundIcon.className = 'fa-solid fa-volume-xmark';
            soundText.textContent = 'Sound Off';
            btnSound.classList.remove('active');
            if (state.engineGain) {
                state.engineGain.gain.setValueAtTime(0, state.audioCtx.currentTime);
            }
        }
    });

    // Test Drive Toggle
    const btnTestDrive = document.getElementById('btn-test-drive');
    const btnExitDrive = document.getElementById('btn-exit-drive');
    const driveHud = document.getElementById('drive-hud');

    function startTestDrive() {
        state.isDriving = true;
        state.autoRotate = false;
        btnAutoRotate.classList.remove('active');

        // Close panels for clear view
        specsPanel.classList.add('closed-left');
        controlsPanel.classList.add('closed-right');
        btnToggleSpecs.classList.remove('active');
        btnToggleControls.classList.remove('active');

        driveHud.classList.remove('hidden');

        initAudio();
    }

    function exitTestDrive() {
        state.isDriving = false;
        state.speed = 0;
        driveHud.classList.add('hidden');
        
        // Reset Car position
        carGroup.position.set(0, 0, 0);
        carGroup.rotation.set(0, 0, 0);
        state.rotation = 0;

        // Reset camera
        camera.position.set(6, 3, 9);
        controls.target.set(0, 0.8, 0);
    }

    btnTestDrive.addEventListener('click', startTestDrive);
    btnExitDrive.addEventListener('click', exitTestDrive);

    // Keyboard Key Handling for Test Drive
    window.addEventListener('keydown', (e) => {
        if (!state.isDriving) return;

        switch (e.code) {
            case 'KeyW': case 'ArrowUp': state.keys.forward = true; break;
            case 'KeyS': case 'ArrowDown': state.keys.backward = true; break;
            case 'KeyA': case 'ArrowLeft': state.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': state.keys.right = true; break;
            case 'Space': state.keys.brake = true; break;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (!state.isDriving) return;

        switch (e.code) {
            case 'KeyW': case 'ArrowUp': state.keys.forward = false; break;
            case 'KeyS': case 'ArrowDown': state.keys.backward = false; break;
            case 'KeyA': case 'ArrowLeft': state.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': state.keys.right = false; break;
            case 'Space': state.keys.brake = false; break;
        }
    });

});
