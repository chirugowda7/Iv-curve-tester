function initTester3D(containerId, autoRotate = false) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4, 2, 6);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.target.set(0, 0, 0);

    // Lighting (Professional Studio)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffffff, 1, 10);
    rimLight.position.set(0, -2, 3);
    scene.add(rimLight);

    // -----------------------------------------
    // Texture Generators (Canvas)
    // -----------------------------------------
    function createScreenTexture(vocStr = '21.50', iscStr = '5.20') {
        const cvs = document.createElement('canvas');
        cvs.width = 512; cvs.height = 256;
        const ctx = cvs.getContext('2d');
        
        ctx.fillStyle = '#e5edc4'; // LCD Green/Yellow background
        ctx.fillRect(0,0,512,256);

        ctx.fillStyle = '#111111'; // Dark text
        ctx.font = 'bold 38px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('IV CURVE TESTER', 256, 100);
        
        ctx.font = 'bold 34px "Courier New", Courier, monospace';
        ctx.fillText('V: ' + vocStr + 'V  I: ' + iscStr + 'A', 256, 170);
        
        const tex = new THREE.CanvasTexture(cvs);
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return tex;
    }

    function createGraphTexture() {
        const cvs = document.createElement('canvas');
        cvs.width = 512; cvs.height = 512;
        const ctx = cvs.getContext('2d');
        
        // Match the cyan faceplate background so it blends
        ctx.fillStyle = '#61b0b7';
        ctx.fillRect(0,0,512,512);
        
        // Draw the graph axes and lines in white
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(80, 60); ctx.lineTo(80, 400); // Y
        ctx.lineTo(460, 400); // X
        ctx.stroke();
        
        // Arrows
        ctx.beginPath(); ctx.moveTo(70,70); ctx.lineTo(80,60); ctx.lineTo(90,70); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(450,390); ctx.lineTo(460,400); ctx.lineTo(450,410); ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('I', 50, 75);
        ctx.fillText('V', 470, 395);
        
        // Professional Blue Curve
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, 120);
        for(let i=0; i<=100; i++) {
            let p = i/100;
            let x = 80 + p*360;
            let y = 400 - (1 - Math.pow(p, 6)) * 280;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        const tex = new THREE.CanvasTexture(cvs);
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return tex;
    }

    function createHeaderTexture() {
        const cvs = document.createElement('canvas');
        cvs.width = 512; cvs.height = 128;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#61b0b7'; // Cyan faceplate match
        ctx.fillRect(0,0,512,128);
        ctx.fillStyle = '#ffffff'; // White text
        ctx.font = 'bold 44px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('IV CURVE TESTER', 256, 80);
        const tex = new THREE.CanvasTexture(cvs);
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return tex;
    }
    
    function createButtonTexture(text, color, textColor='#ffffff') {
        const cvs = document.createElement('canvas');
        cvs.width = 128; cvs.height = 128;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0,0,128,128);
        ctx.fillStyle = textColor;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, 64, 75);
        return new THREE.CanvasTexture(cvs);
    }

    // -----------------------------------------
    // Constructing Realistic 3D Model
    // -----------------------------------------
    const tester = new THREE.Group();
    
    // 1. Enclosure (Body) - White in screenshot
    const bodyGeo = new THREE.BoxGeometry(2.6, 4.0, 1.6);
    const bodyMat = new THREE.MeshPhysicalMaterial({ 
        color: 0xe2e8f0, // White/Light Grey
        roughness: 0.6, 
        metalness: 0.1,
        clearcoat: 0.05
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    tester.add(body);

    // 2. Faceplate Base - Cyan in screenshot
    const faceGeo = new THREE.PlaneGeometry(2.4, 3.8);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x61b0b7, roughness: 0.6 }); 
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.z = 0.801;
    tester.add(face);

    // 3. Top Blue Header (Cyan with Text)
    const headerGeo = new THREE.PlaneGeometry(2.4, 0.5);
    const headerMat = new THREE.MeshStandardMaterial({ map: createHeaderTexture(), roughness: 0.4 });
    const header = new THREE.Mesh(headerGeo, headerMat);
    header.position.set(0, 1.65, 0.802);
    tester.add(header);

    // 4. LCD Screen
    const screenBezelGeo = new THREE.BoxGeometry(1.9, 0.9, 0.05);
    const screenBezelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.1 });
    const screenBezel = new THREE.Mesh(screenBezelGeo, screenBezelMat);
    screenBezel.position.set(0, 0.9, 0.81);
    tester.add(screenBezel);

    const screenGeo = new THREE.PlaneGeometry(1.7, 0.7);
    let screenMap = createScreenTexture();
    let screenMat = new THREE.MeshStandardMaterial({ 
        map: screenMap,
        emissiveMap: screenMap,
        emissive: 0xffffff, 
        emissiveIntensity: 0.2 // Soft backlight
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.9, 0.84);
    tester.add(screen);

    // 5. Buttons - First 3 green, last 1 red
    const btnData = [
        { x: -0.7, tex: createButtonTexture('MENU', '#57a389') },
        { x: -0.23, tex: createButtonTexture('UP', '#57a389') },
        { x: 0.23, tex: createButtonTexture('DOWN', '#57a389') },
        { x: 0.7, tex: createButtonTexture('ENTER', '#d94b4b') }
    ];
    
    const btns = [];
    btnData.forEach(data => {
        const bGeo = new THREE.BoxGeometry(0.35, 0.35, 0.1);
        const bMat = new THREE.MeshStandardMaterial({ map: data.tex, roughness: 0.3 });
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(data.x, 0.2, 0.82);
        bMesh.castShadow = true;
        tester.add(bMesh);
        btns.push(bMesh);
    });

    // 6. Graph Area
    const graphGeo = new THREE.PlaneGeometry(2.2, 1.4);
    const graphMat = new THREE.MeshStandardMaterial({ map: createGraphTexture(), roughness: 0.6 });
    const graph = new THREE.Mesh(graphGeo, graphMat);
    graph.position.set(0, -0.85, 0.802);
    tester.add(graph);

    // 7. Cables & Connectors (Top two Red, Bottom two Blue)
    const connectorGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16);
    const connectorMatBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }); // Base of plug
    const cableMatRed = new THREE.MeshStandardMaterial({ color: 0xd94b4b, roughness: 0.4 });
    const cableMatBlue = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
    
    // Add curvature to cables using Spline/TubeGeometry for extra realism
    class CustomSinCurve extends THREE.Curve {
        constructor(scale = 1) { super(); this.scale = scale; }
        getPoint(t, optTarget = new THREE.Vector3()) {
            const tx = t * 2; const ty = -t * 1.5; const tz = Math.sin(t * Math.PI) * 0.5;
            return optTarget.set(tx, ty, tz).multiplyScalar(this.scale);
        }
    }
    const path = new CustomSinCurve(1);
    const tubeGeo = new THREE.TubeGeometry(path, 20, 0.05, 8, false);

    const positions = [
        { y: 0.8, mat: cableMatRed },
        { y: 0.1, mat: cableMatRed },
        { y: -0.6, mat: cableMatBlue },
        { y: -1.3, mat: cableMatBlue }
    ];

    positions.forEach(p => {
        // Plug base (black/grey)
        const base = new THREE.Mesh(connectorGeo, connectorMatBlack);
        base.rotation.z = Math.PI / 2;
        base.position.set(1.35, p.y, 0);
        tester.add(base);
        
        // Curved wire (Red/Blue)
        const wire = new THREE.Mesh(tubeGeo, p.mat);
        wire.position.set(1.45, p.y, 0);
        tester.add(wire);
    });

    // Shadow plane
    const planeGeo = new THREE.PlaneGeometry(10, 10);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.1 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2.2;
    plane.receiveShadow = true;
    scene.add(plane);

    scene.add(tester);

    // -----------------------------------------
    // Interactivity
    // -----------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    container.addEventListener('pointerdown', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([...btns, screen]);
        
        if(intersects.length > 0) {
            const obj = intersects[0].object;
            if(obj === screen) {
                screenMat.emissiveIntensity = 0.5;
                setTimeout(() => { screenMat.emissiveIntensity = 0.2; }, 200);
            } else {
                obj.position.z -= 0.05; // Press down
                screenMat.emissiveIntensity = 0.4;
                setTimeout(() => { 
                    obj.position.z += 0.05; // Pop up
                    screenMat.emissiveIntensity = 0.2; 
                }, 150);
            }
        }
    });
    
    container.addEventListener('pointerenter', () => {
        document.body.style.cursor = 'grab';
    });
    container.addEventListener('pointerleave', () => {
        document.body.style.cursor = 'default';
    });
    container.addEventListener('pointerdown', () => { document.body.style.cursor = 'grabbing'; });
    container.addEventListener('pointerup', () => { document.body.style.cursor = 'grab'; });

    window.addEventListener('resize', () => {
        if(container.clientWidth > 0) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    return {
        updateScreen: function(voc, isc) {
            screenMap.dispose(); // Free up memory
            screenMap = createScreenTexture(voc, isc);
            screenMat.map = screenMap;
            screenMat.emissiveMap = screenMap;
            screenMat.needsUpdate = true;
        }
    };
}
