import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

let scene, camera, renderer;
let ship;
const asteroids = [];
const NUM_ASTEROIDS = 15;

let clock;
let isGameOver = false;
let score = 0;
let displayedScore = 0;

const keyState = {
    left: false,
    right: false
};

const SHIP_SPEED = 30;
const ASTEROID_SPEED = 35;
const X_LIMIT = 40;
const COLLISION_CHECK_DISTANCE = 50;

const tempVector3 = new THREE.Vector3();
const cameraOffset = new THREE.Vector3(0, 12, 25);
const lookAtOffset = new THREE.Vector3(0, 0, -20);

const hudElement = document.getElementById('hud');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreElement = document.getElementById('finalScore');
const container = document.getElementById('game-container');

init();
animate();

function init() {
    // SCENA
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000010);

    // KAMERA
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

    // RENDERER
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // OŚWIETLENIE
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-15, 25, 30);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // PŁASZCZYZNA TŁA
    const planeGeom = new THREE.PlaneGeometry(200, 800, 10, 40);
    const planeMat = new THREE.MeshPhongMaterial({
        color: 0x050510,
        shininess: 10
    });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -5;
    plane.position.z = -200;
    scene.add(plane);

    // STATEK
    createShip();

    // ASTEROIDY
    createAsteroids();

    // TIMER
    clock = new THREE.Clock();

    // OBSŁUGA ZDARZEŃ
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    window.restartGame = restartGame;
}

function createShip() {
    const shipGroup = new THREE.Group();

    const noseGeom = new THREE.ConeGeometry(1.2, 4, 16);
    const noseMat = new THREE.MeshPhongMaterial({
        color: 0x0088cc,
        shininess: 100,
        specular: 0xffffff
    });
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0, 1.5);
    shipGroup.add(nose);

    const bodyGeom = new THREE.CylinderGeometry(0.9, 0.9, 3, 16);
    const bodyMat = new THREE.MeshPhongMaterial({
        color: 0x002244,
        shininess: 60,
        specular: 0xffffff
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0, -0.5);
    shipGroup.add(body);

    const wingGeom = new THREE.BoxGeometry(0.2, 2.5, 1.5);
    const wingMat = new THREE.MeshPhongMaterial({
        color: 0x0044aa,
        shininess: 70,
        specular: 0xffffff
    });

    const leftWing = new THREE.Mesh(wingGeom, wingMat);
    leftWing.position.set(-1.2, 0, -0.5);
    shipGroup.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.x = 1.2;
    shipGroup.add(rightWing);

    shipGroup.position.set(0, 0, 0);
    shipGroup.userData.radius = 2.0;

    const shipLight = new THREE.SpotLight(0xffffff, 300);
    shipLight.position.set(0, 0, 2);
    shipLight.angle = Math.PI / 6;
    shipLight.penumbra = 0.2;
    shipLight.decay = 1.5;
    shipLight.distance = 120;
    shipLight.castShadow = false;

    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, 0, -50);
    shipGroup.add(lightTarget);
    shipLight.target = lightTarget;

    shipGroup.add(shipLight);

    scene.add(shipGroup);
    ship = shipGroup;
}

function createAsteroids() {
    const baseGeom = new THREE.IcosahedronGeometry(2, 1);

    const textureLoader = new THREE.TextureLoader();
    let asteroidTexture = null;

    textureLoader.load(
        'assets/asteroid_texture.png',
        (texture) => {
            asteroidTexture = texture;
            asteroids.forEach(ast => {
                if (ast.material) ast.material.map = texture;
                ast.material.needsUpdate = true;
            });
        },
        undefined,
        (error) => {
            console.warn('Nie można załadować tekstury asteroidy');
        }
    );

    const baseMaterial = new THREE.MeshPhongMaterial({
        color: 0xeeeeee,
        shininess: 30,
        specular: 0x444444
    });

    for (let i = 0; i < NUM_ASTEROIDS; i++) {
        const radiusScale = THREE.MathUtils.randFloat(1.5, 3.0);

        const asteroid = new THREE.Mesh(baseGeom, baseMaterial.clone());
        asteroid.scale.setScalar(radiusScale);

        randomizeAsteroidPosition(asteroid, true);

        asteroid.userData.radius = 2 * radiusScale * 0.9;
        asteroid.userData.rotationAxis = new THREE.Vector3(
            Math.random(), Math.random(), Math.random()
        ).normalize();
        asteroid.userData.rotationSpeed = THREE.MathUtils.randFloat(0.3, 1.0);

        scene.add(asteroid);
        asteroids.push(asteroid);
    }
}

function randomizeAsteroidPosition(asteroid, initial = false) {
    const minX = -X_LIMIT;
    const maxX = X_LIMIT;

    const minZ = -120;
    const maxZ = -40;

    const y = THREE.MathUtils.randFloat(-3, 8);

    asteroid.position.x = THREE.MathUtils.randFloat(minX, maxX);
    asteroid.position.y = y;

    if (initial) {
        asteroid.position.z = THREE.MathUtils.randFloat(minZ, maxZ);
    } else {
        asteroid.position.z = THREE.MathUtils.randFloat(minZ - 40, minZ);
    }
}

function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    if (!isGameOver) {
        updateShip(dt);
        updateAsteroids(dt);
        checkCollisions();
        updateScore(dt);
    }

    updateCamera();
    renderer.render(scene, camera);
}

function updateShip(dt) {
    let dx = 0;
    if (keyState.left) dx -= 1;
    if (keyState.right) dx += 1;

    const velocity = dx * SHIP_SPEED;
    ship.position.x += velocity * dt;

    ship.position.x = THREE.MathUtils.clamp(ship.position.x, -X_LIMIT, X_LIMIT);

    const targetRoll = -dx * 0.5;
    ship.rotation.z += (targetRoll - ship.rotation.z) * 5 * dt;
}

function updateAsteroids(dt) {
    for (const asteroid of asteroids) {
        asteroid.position.z += ASTEROID_SPEED * dt;

        asteroid.rotateOnAxis(asteroid.userData.rotationAxis, asteroid.userData.rotationSpeed * dt);

        if (asteroid.position.z > 30) {
            randomizeAsteroidPosition(asteroid, false);
        }
    }
}

function updateCamera() {
    tempVector3.copy(ship.position).add(cameraOffset);
    camera.position.lerp(tempVector3, 0.1);

    tempVector3.copy(ship.position).add(lookAtOffset);
    camera.lookAt(tempVector3);
}

function checkCollisions() {
    const shipPos = ship.position;
    const shipRadius = ship.userData.radius || 2;

    for (const asteroid of asteroids) {
        const deltaZ = Math.abs(asteroid.position.z - shipPos.z);
        if (deltaZ > COLLISION_CHECK_DISTANCE) continue;

        const dist = shipPos.distanceTo(asteroid.position);
        const asteroidRadius = asteroid.userData.radius || 2;

        if (dist < shipRadius + asteroidRadius) {
            onGameOver();
            break;
        }
    }
}

function updateScore(dt) {
    score += dt * 10;

    const newDisplayedScore = Math.floor(score);
    if (newDisplayedScore !== displayedScore) {
        displayedScore = newDisplayedScore;
        hudElement.textContent = 'Wynik: ' + displayedScore;
    }
}

function onGameOver() {
    isGameOver = true;
    finalScoreElement.textContent = 'Twój wynik: ' + Math.floor(score);
    gameOverOverlay.classList.add('visible');
}

function restartGame() {
    ship.position.set(0, 0, 0);
    ship.rotation.set(0, 0, 0);

    for (const asteroid of asteroids) {
        randomizeAsteroidPosition(asteroid, true);
    }

    score = 0;
    displayedScore = 0;
    hudElement.textContent = 'Wynik: 0';
    isGameOver = false;
    gameOverOverlay.classList.remove('visible');
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

function onKeyDown(event) {
    if (event.code === 'ArrowLeft') {
        keyState.left = true;
    }
    if (event.code === 'ArrowRight') {
        keyState.right = true;
    }

    if (event.code === 'KeyR') {
        if (isGameOver) {
            restartGame();
        }
    }
}

function onKeyUp(event) {
    if (event.code === 'ArrowLeft') {
        keyState.left = false;
    }
    if (event.code === 'ArrowRight') {
        keyState.right = false;
    }
}
