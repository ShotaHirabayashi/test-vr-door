/**
 * おふろクエスト - VR Adventure
 * WebXR + Three.js で作る子供向けお風呂クエストVRゲーム
 */

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ========================================
// ゲーム設定
// ========================================
const GAME_CONFIG = {
    starsRequired: 5,
    playerSpeed: 0.05,
    starRotationSpeed: 0.02,
    doorGlowSpeed: 0.01,
    messageDisplayTime: 3000,
};

// ========================================
// ゲーム状態
// ========================================
const gameState = {
    starsCollected: 0,
    isPlaying: false,
    isVR: false,
    isAR: false,
    isCameraMode: false,
    canMove: true,
    messages: [
        "がんばって！ おふろは きもちいいよ！",
        "あと すこし！",
        "おもちゃは あとで あそぼうね！",
        "きみなら できる！",
        "おふろで あったまろう！"
    ]
};

// ========================================
// Three.js 変数
// ========================================
let scene, camera, renderer, controls;
let player, playerGroup;
let stars = [];
let obstacles = [];
let goalDoor;
let doorLight;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let raycaster, tempMatrix;
let moveForward = false;
let clock;

// UI要素
const loadingScreen = document.getElementById('loading-screen');
const startScreen = document.getElementById('start-screen');
const gameUI = document.getElementById('game-ui');
const goalScreen = document.getElementById('goal-screen');
const starsCountEl = document.getElementById('stars-count');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const startButton = document.getElementById('start-button');
const vrButton = document.getElementById('vr-button');
const restartButton = document.getElementById('restart-button');
const finalStarsEl = document.getElementById('final-stars');
const arButton = document.getElementById('ar-button');
const cameraButton = document.getElementById('camera-button');
const cameraVideo = document.getElementById('camera-video');

// ========================================
// 初期化
// ========================================
async function init() {
    clock = new THREE.Clock();
    
    // シーン作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 5, 30);
    
    // カメラ作成
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, 1.6, 8);
    
    // レンダラー作成
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    
    document.getElementById('container').appendChild(renderer.domElement);
    
    // コントロール（非VR用）
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    
    // プレイヤーグループ
    playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 8);
    scene.add(playerGroup);
    
    // ライト設定
    setupLights();
    
    // 環境作成
    createEnvironment();
    
    // 星を配置
    createStars();
    
    // 障害物（おもちゃ）を配置
    createObstacles();
    
    // ゴールの扉を作成
    createGoalDoor();
    
    // VRコントローラー設定
    setupVRControllers();
    
    // レイキャスター
    raycaster = new THREE.Raycaster();
    tempMatrix = new THREE.Matrix4();
    
    // イベントリスナー
    setupEventListeners();
    
    // VR対応確認
    checkVRSupport();
    
    // ローディング完了
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
    }, 2500);
    
    // アニメーションループ
    renderer.setAnimationLoop(animate);
}

// ========================================
// ライト設定
// ========================================
function setupLights() {
    // アンビエントライト
    const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
    scene.add(ambientLight);
    
    // メインディレクショナルライト
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);
    
    // ポイントライト（温かい雰囲気）
    const warmLight = new THREE.PointLight(0xffaa44, 0.5, 20);
    warmLight.position.set(-3, 3, 0);
    scene.add(warmLight);
    
    // ゴール用のスポットライト
    doorLight = new THREE.SpotLight(0x74C0FC, 2, 15, Math.PI / 4, 0.5);
    doorLight.position.set(0, 5, -8);
    doorLight.target.position.set(0, 0, -10);
    doorLight.castShadow = true;
    scene.add(doorLight);
    scene.add(doorLight.target);
}

// ========================================
// 環境作成
// ========================================
function createEnvironment() {
    // 床
    const floorGeometry = new THREE.PlaneGeometry(20, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d5a80,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // カーペット（スタート地点）
    const carpetGeometry = new THREE.PlaneGeometry(4, 4);
    const carpetMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6b6b,
        roughness: 0.9
    });
    const carpet = new THREE.Mesh(carpetGeometry, carpetMaterial);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.01, 8);
    scene.add(carpet);
    
    // 壁（左）
    const wallGeometry = new THREE.BoxGeometry(0.3, 4, 30);
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        roughness: 0.6
    });
    
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-10, 2, -5);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    
    // 壁（右）
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(10, 2, -5);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    
    // 天井
    const ceilingGeometry = new THREE.PlaneGeometry(20, 30);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 1
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);
    
    // 廊下の照明
    for (let z = 5; z >= -8; z -= 4) {
        const lightFixture = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.1, 0.5),
            new THREE.MeshBasicMaterial({ color: 0xffffee })
        );
        lightFixture.position.set(0, 3.9, z);
        scene.add(lightFixture);
        
        const pointLight = new THREE.PointLight(0xffffee, 0.3, 6);
        pointLight.position.set(0, 3.5, z);
        scene.add(pointLight);
    }
    
    // 壁の飾り（写真フレーム）
    createWallDecorations();
}

// ========================================
// 壁の装飾
// ========================================
function createWallDecorations() {
    const framePositions = [
        { x: -9.7, y: 2, z: 3 },
        { x: -9.7, y: 2, z: -2 },
        { x: 9.7, y: 2, z: 0 },
        { x: 9.7, y: 2, z: -5 },
    ];
    
    framePositions.forEach((pos, index) => {
        // フレーム
        const frameGeometry = new THREE.BoxGeometry(0.1, 1.2, 0.8);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.5
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(pos.x, pos.y, pos.z);
        
        // 絵（カラフルな色）
        const colors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x95E1D3];
        const pictureGeometry = new THREE.BoxGeometry(0.05, 1, 0.6);
        const pictureMaterial = new THREE.MeshStandardMaterial({
            color: colors[index % colors.length],
            roughness: 0.3
        });
        const picture = new THREE.Mesh(pictureGeometry, pictureMaterial);
        picture.position.set(
            pos.x > 0 ? pos.x - 0.08 : pos.x + 0.08,
            pos.y,
            pos.z
        );
        
        scene.add(frame);
        scene.add(picture);
    });
}

// ========================================
// 星を作成
// ========================================
function createStars() {
    const starPositions = [
        { x: -2, y: 1.5, z: 5 },
        { x: 3, y: 1.2, z: 2 },
        { x: -4, y: 1.8, z: -1 },
        { x: 2, y: 1.3, z: -4 },
        { x: -1, y: 1.6, z: -7 },
    ];
    
    starPositions.forEach((pos, index) => {
        const star = createStarMesh();
        star.position.set(pos.x, pos.y, pos.z);
        star.userData = { 
            type: 'star', 
            index: index,
            collected: false,
            originalY: pos.y
        };
        stars.push(star);
        scene.add(star);
        
        // 星の光
        const starLight = new THREE.PointLight(0xFFD700, 0.5, 3);
        starLight.position.copy(star.position);
        star.userData.light = starLight;
        scene.add(starLight);
    });
}

function createStarMesh() {
    const starGroup = new THREE.Group();
    
    // 星の形を作成（シンプルな8面体ベース）
    const geometry = new THREE.OctahedronGeometry(0.3, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: 0xFFAA00,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8
    });
    
    const star = new THREE.Mesh(geometry, material);
    star.scale.set(1, 1.5, 1);
    starGroup.add(star);
    
    // 輝きエフェクト
    const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    starGroup.add(glow);
    
    return starGroup;
}

// ========================================
// 障害物（おもちゃ）を作成
// ========================================
function createObstacles() {
    // おもちゃの車
    createToyCar(-3, 0, 3);
    createToyCar(4, 0, -2);
    
    // ブロック
    createToyBlocks(3, 0, 4);
    createToyBlocks(-4, 0, -3);
    
    // ぬいぐるみ
    createTeddyBear(5, 0, 0);
    createTeddyBear(-5, 0, -5);
}

function createToyCar(x, y, z) {
    const carGroup = new THREE.Group();
    
    // 車体
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.4, 1.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF4444,
        roughness: 0.3,
        metalness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    body.castShadow = true;
    carGroup.add(body);
    
    // キャビン
    const cabinGeometry = new THREE.BoxGeometry(0.6, 0.3, 0.6);
    const cabinMaterial = new THREE.MeshStandardMaterial({
        color: 0x4444FF,
        roughness: 0.3
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 0.55, -0.1);
    cabin.castShadow = true;
    carGroup.add(cabin);
    
    // タイヤ
    const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8
    });
    
    const wheelPositions = [
        { x: 0.45, z: 0.35 },
        { x: -0.45, z: 0.35 },
        { x: 0.45, z: -0.35 },
        { x: -0.45, z: -0.35 }
    ];
    
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, 0.15, pos.z);
        carGroup.add(wheel);
    });
    
    carGroup.position.set(x, y, z);
    carGroup.userData = { type: 'obstacle', name: 'おもちゃのくるま' };
    obstacles.push(carGroup);
    scene.add(carGroup);
}

function createToyBlocks(x, y, z) {
    const blocksGroup = new THREE.Group();
    const colors = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x95E1D3, 0xA8E6CF];
    
    const blockPositions = [
        { x: 0, y: 0.2, z: 0 },
        { x: 0.3, y: 0.2, z: 0.3 },
        { x: -0.2, y: 0.2, z: 0.2 },
        { x: 0.1, y: 0.6, z: 0.1 },
        { x: -0.1, y: 0.6, z: -0.1 },
    ];
    
    blockPositions.forEach((pos, index) => {
        const size = 0.25 + Math.random() * 0.15;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({
            color: colors[index % colors.length],
            roughness: 0.5
        });
        const block = new THREE.Mesh(geometry, material);
        block.position.set(pos.x, pos.y, pos.z);
        block.rotation.y = Math.random() * Math.PI;
        block.castShadow = true;
        blocksGroup.add(block);
    });
    
    blocksGroup.position.set(x, y, z);
    blocksGroup.userData = { type: 'obstacle', name: 'つみき' };
    obstacles.push(blocksGroup);
    scene.add(blocksGroup);
}

function createTeddyBear(x, y, z) {
    const bearGroup = new THREE.Group();
    
    const bearMaterial = new THREE.MeshStandardMaterial({
        color: 0xC4A484,
        roughness: 0.9
    });
    
    // 体
    const bodyGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const body = new THREE.Mesh(bodyGeometry, bearMaterial);
    body.position.y = 0.4;
    body.scale.set(1, 1.2, 0.8);
    body.castShadow = true;
    bearGroup.add(body);
    
    // 頭
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const head = new THREE.Mesh(headGeometry, bearMaterial);
    head.position.set(0, 0.9, 0);
    head.castShadow = true;
    bearGroup.add(head);
    
    // 耳
    const earGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const leftEar = new THREE.Mesh(earGeometry, bearMaterial);
    leftEar.position.set(-0.2, 1.15, 0);
    bearGroup.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, bearMaterial);
    rightEar.position.set(0.2, 1.15, 0);
    bearGroup.add(rightEar);
    
    // 鼻
    const noseGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 0.85, 0.25);
    bearGroup.add(nose);
    
    // 目
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.95, 0.22);
    bearGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.95, 0.22);
    bearGroup.add(rightEye);
    
    bearGroup.position.set(x, y, z);
    bearGroup.userData = { type: 'obstacle', name: 'くまさん' };
    obstacles.push(bearGroup);
    scene.add(bearGroup);
}

// ========================================
// ゴールの扉を作成
// ========================================
function createGoalDoor() {
    const doorGroup = new THREE.Group();
    
    // ドアフレーム
    const frameGeometry = new THREE.BoxGeometry(2.2, 3.2, 0.2);
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.5
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 1.6, -10);
    frame.castShadow = true;
    scene.add(frame);
    
    // ドア本体
    const doorGeometry = new THREE.BoxGeometry(1.8, 2.8, 0.15);
    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x74C0FC,
        emissive: 0x74C0FC,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.2
    });
    goalDoor = new THREE.Mesh(doorGeometry, doorMaterial);
    goalDoor.position.set(0, 1.6, -9.9);
    goalDoor.castShadow = true;
    goalDoor.userData = { type: 'goal' };
    scene.add(goalDoor);
    
    // ドアノブ
    const knobGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const knobMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        metalness: 0.8,
        roughness: 0.2
    });
    const knob = new THREE.Mesh(knobGeometry, knobMaterial);
    knob.position.set(0.7, 1.4, -9.8);
    scene.add(knob);
    
    // お風呂アイコン（ドアの上）
    createBathIcon(0, 2.8, -9.7);
    
    // 光のパーティクル
    createDoorParticles();
}

function createBathIcon(x, y, z) {
    const iconGroup = new THREE.Group();
    
    // 浴槽
    const tubGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.4);
    const tubMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0x74C0FC,
        emissiveIntensity: 0.5
    });
    const tub = new THREE.Mesh(tubGeometry, tubMaterial);
    iconGroup.add(tub);
    
    // 泡
    const bubbleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bubbleMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFFFF,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8
    });
    
    for (let i = 0; i < 5; i++) {
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        bubble.position.set(
            (Math.random() - 0.5) * 0.6,
            0.2 + Math.random() * 0.1,
            (Math.random() - 0.5) * 0.2
        );
        bubble.scale.setScalar(0.5 + Math.random() * 0.5);
        iconGroup.add(bubble);
    }
    
    iconGroup.position.set(x, y, z);
    scene.add(iconGroup);
}

function createDoorParticles() {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 3;
        positions[i * 3 + 1] = Math.random() * 4;
        positions[i * 3 + 2] = -9.5 + Math.random() * 0.5;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0x74C0FC,
        size: 0.1,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    particles.userData = { type: 'doorParticles' };
    scene.add(particles);
}

// ========================================
// VRコントローラー設定
// ========================================
function setupVRControllers() {
    const controllerModelFactory = new XRControllerModelFactory();
    
    // コントローラー1
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    scene.add(controller1);
    
    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);
    
    // コントローラー2
    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    scene.add(controller2);
    
    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);
    
    // レイビジュアル
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -5)
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x4ECDC4,
        transparent: true,
        opacity: 0.5
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    controller1.add(line.clone());
    controller2.add(line.clone());
}

function onSelectStart() {
    moveForward = true;
}

function onSelectEnd() {
    moveForward = false;
}

// ========================================
// イベントリスナー
// ========================================
function setupEventListeners() {
    // ウィンドウリサイズ
    window.addEventListener('resize', onWindowResize);
    
    // スタートボタン
    startButton.addEventListener('click', startGame);
    
    // VRボタン
    vrButton.addEventListener('click', enterVR);
    
    // ARボタン
    arButton.addEventListener('click', enterAR);
    
    // カメラモードボタン（iPhone対応）
    cameraButton.addEventListener('click', enterCameraMode);
    
    // リスタートボタン
    restartButton.addEventListener('click', restartGame);
    
    // キーボード（非VR用）
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    // デバイスの向き（スマホ用）
    window.addEventListener('deviceorientation', onDeviceOrientation);
    
    // タッチで前進（スマホ用）
    document.getElementById('container').addEventListener('touchstart', onTouchStart);
    document.getElementById('container').addEventListener('touchend', onTouchEnd);
}

function onDeviceOrientation(event) {
    if (event.alpha !== null) {
        deviceOrientation.alpha = event.alpha; // Z軸回転（コンパス）
        deviceOrientation.beta = event.beta;   // X軸回転（前後傾き）
        deviceOrientation.gamma = event.gamma; // Y軸回転（左右傾き）
    }
}

let isTouching = false;

function onTouchStart(event) {
    if (gameState.isPlaying && (gameState.isCameraMode || !gameState.isVR)) {
        isTouching = true;
    }
}

function onTouchEnd(event) {
    isTouching = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let keys = { w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false };
let deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };

function onKeyDown(event) {
    switch (event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            keys.w = true;
            break;
        case 's':
        case 'arrowdown':
            keys.s = true;
            break;
        case 'a':
        case 'arrowleft':
            keys.a = true;
            break;
        case 'd':
        case 'arrowright':
            keys.d = true;
            break;
    }
}

function onKeyUp(event) {
    switch (event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
            keys.w = false;
            break;
        case 's':
        case 'arrowdown':
            keys.s = false;
            break;
        case 'a':
        case 'arrowleft':
            keys.a = false;
            break;
        case 'd':
        case 'arrowright':
            keys.d = false;
            break;
    }
}

// ========================================
// VR/AR対応確認
// ========================================
async function checkVRSupport() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if ('xr' in navigator) {
        // VR対応チェック
        const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
        if (isVRSupported) {
            vrButton.disabled = false;
        } else {
            vrButton.style.display = 'none'; // 非対応なら非表示
        }
        
        // AR対応チェック
        const isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (isARSupported) {
            arButton.disabled = false;
        } else {
            arButton.style.display = 'none'; // 非対応なら非表示
        }
    } else {
        // WebXR非対応（iPhoneなど）
        vrButton.style.display = 'none';
        arButton.style.display = 'none';
    }
    
    // iPhoneの場合はカメラモードを強調
    if (isIOS) {
        cameraButton.innerHTML = '<span class="button-icon">📷</span><span>カメラARモード ✨おすすめ</span>';
        cameraButton.style.order = '-1'; // 一番上に
    }
}

// ========================================
// ゲーム開始
// ========================================
function startGame() {
    gameState.isPlaying = true;
    startScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
    
    // カメラ位置をリセット
    camera.position.set(0, 1.6, 8);
    controls.target.set(0, 1, 0);
    
    showMessage("⭐ほしを あつめて おふろへ いこう！");
}

function enterVR() {
    gameState.isVR = true;
    gameState.isAR = false;
    
    // VRセッション開始
    navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
    }).then((session) => {
        renderer.xr.setSession(session);
        startGame();
    });
}

function enterAR() {
    gameState.isVR = true;
    gameState.isAR = true;
    
    // ARセッション開始（カメラ映像をバックグラウンドに）
    navigator.xr.requestSession('immersive-ar', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'hit-test'],
        requiredFeatures: ['local-floor']
    }).then((session) => {
        // ARモードでは背景を透明に
        renderer.xr.setSession(session);
        scene.background = null;
        scene.fog = null;
        
        // 床と壁を半透明に
        scene.traverse((object) => {
            if (object.isMesh && object.userData.type !== 'star' && object.userData.type !== 'goal') {
                if (object.material) {
                    object.material.transparent = true;
                    object.material.opacity = 0.3;
                }
            }
        });
        
        startGame();
        showMessage("📱 カメラをかざして ほしを さがそう！");
    }).catch((error) => {
        console.error('AR session error:', error);
        showMessage("ARモードを開始できませんでした");
    });
}

// ========================================
// カメラモード（iPhone対応）
// ========================================
async function enterCameraMode() {
    try {
        // iOS 13+ではジャイロセンサーの許可が必要
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
                showMessage("ジャイロセンサーの許可が必要です");
                return;
            }
        }
        
        // カメラへのアクセスを要求
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',  // 背面カメラ
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        
        // ビデオ要素にストリームをセット
        cameraVideo.srcObject = stream;
        cameraVideo.classList.add('active');
        
        // ゲーム状態を更新
        gameState.isCameraMode = true;
        
        // シーンの背景を透明に
        scene.background = null;
        scene.fog = null;
        
        // レンダラーを透明に設定
        renderer.setClearColor(0x000000, 0);
        
        // 床と壁を半透明に
        scene.traverse((object) => {
            if (object.isMesh) {
                const type = object.userData.type;
                if (type === 'star' || type === 'goal') {
                    // 星とゴールは見やすくする
                    if (object.material) {
                        object.material.transparent = true;
                        object.material.opacity = 1;
                    }
                } else if (type === 'obstacle') {
                    // 障害物（おもちゃ）は半透明
                    if (object.material) {
                        object.material.transparent = true;
                        object.material.opacity = 0.7;
                    }
                } else {
                    // 床や壁は非表示に
                    if (object.material && !object.material.emissive) {
                        object.visible = false;
                    }
                }
            }
        });
        
        // OrbitControlsを無効化（ジャイロで制御するため）
        controls.enabled = false;
        
        // ゲーム開始
        startGame();
        showMessage("📷 がめんを タッチして すすもう！");
        
    } catch (error) {
        console.error('Camera access error:', error);
        showMessage("カメラにアクセスできませんでした 😢");
    }
}

function stopCameraMode() {
    if (cameraVideo.srcObject) {
        const tracks = cameraVideo.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        cameraVideo.srcObject = null;
    }
    cameraVideo.classList.remove('active');
    gameState.isCameraMode = false;
    
    // OrbitControlsを再有効化
    controls.enabled = true;
    
    // 元に戻す
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 5, 30);
    renderer.setClearColor(0x1a1a2e, 1);
    
    scene.traverse((object) => {
        if (object.isMesh) {
            object.visible = true;
            if (object.material) {
                object.material.transparent = false;
                object.material.opacity = 1;
            }
        }
    });
}

function restartGame() {
    // カメラモードを停止
    if (gameState.isCameraMode) {
        stopCameraMode();
    }
    
    // ゲーム状態リセット
    gameState.starsCollected = 0;
    gameState.isPlaying = true;
    gameState.isCameraMode = false;
    
    // 星をリセット
    stars.forEach(star => {
        star.visible = true;
        star.userData.collected = false;
        if (star.userData.light) {
            star.userData.light.visible = true;
        }
    });
    
    // すべてのオブジェクトを元に戻す
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 5, 30);
    renderer.setClearColor(0x1a1a2e, 1);
    
    scene.traverse((object) => {
        if (object.isMesh) {
            object.visible = true;
            if (object.material) {
                object.material.transparent = false;
                object.material.opacity = 1;
            }
        }
    });
    
    // UI更新
    starsCountEl.textContent = '0';
    goalScreen.classList.add('hidden');
    gameUI.classList.remove('hidden');
    
    // 位置リセット
    camera.position.set(0, 1.6, 8);
    playerGroup.position.set(0, 0, 8);
    
    showMessage("もういちど がんばろう！");
}

// ========================================
// メッセージ表示
// ========================================
function showMessage(text, duration = GAME_CONFIG.messageDisplayTime) {
    messageText.textContent = text;
    messageBox.classList.remove('hidden');
    
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, duration);
}

// ========================================
// アニメーションループ
// ========================================
function animate() {
    const delta = clock.getDelta();
    
    if (gameState.isPlaying) {
        // 星のアニメーション
        animateStars(delta);
        
        // ドアのアニメーション
        animateDoor(delta);
        
        // パーティクルアニメーション
        animateParticles(delta);
        
        // プレイヤー移動
        updatePlayerMovement(delta);
        
        // 衝突判定
        checkCollisions();
    }
    
    controls.update();
    renderer.render(scene, camera);
}

function animateStars(delta) {
    stars.forEach((star, index) => {
        if (!star.userData.collected) {
            // 回転
            star.rotation.y += GAME_CONFIG.starRotationSpeed;
            
            // 浮遊
            star.position.y = star.userData.originalY + Math.sin(Date.now() * 0.002 + index) * 0.1;
        }
    });
}

function animateDoor(delta) {
    if (goalDoor) {
        // 扉の光のパルス
        const intensity = 0.3 + Math.sin(Date.now() * 0.002) * 0.2;
        goalDoor.material.emissiveIntensity = intensity;
        
        // スポットライトの強度
        if (doorLight) {
            doorLight.intensity = 2 + Math.sin(Date.now() * 0.003) * 0.5;
        }
    }
}

function animateParticles(delta) {
    scene.traverse((object) => {
        if (object.userData.type === 'doorParticles') {
            const positions = object.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += 0.01;
                if (positions[i + 1] > 4) {
                    positions[i + 1] = 0;
                }
            }
            object.geometry.attributes.position.needsUpdate = true;
        }
    });
}

function updatePlayerMovement(delta) {
    const speed = GAME_CONFIG.playerSpeed;
    
    if (gameState.isVR && renderer.xr.isPresenting) {
        // VRモードでの移動
        if (moveForward) {
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(camera.quaternion);
            direction.y = 0;
            direction.normalize();
            
            playerGroup.position.add(direction.multiplyScalar(speed));
        }
    } else if (gameState.isCameraMode) {
        // カメラモード（スマホ）での移動
        // ジャイロセンサーでカメラ回転
        const alpha = THREE.MathUtils.degToRad(deviceOrientation.alpha || 0);
        const beta = THREE.MathUtils.degToRad(deviceOrientation.beta || 0);
        const gamma = THREE.MathUtils.degToRad(deviceOrientation.gamma || 0);
        
        // スマホを縦持ちした時の向きに対応
        camera.rotation.x = beta - Math.PI / 2;
        camera.rotation.y = -alpha;
        camera.rotation.z = -gamma;
        camera.rotation.order = 'YXZ';
        
        // タッチで前進
        if (isTouching) {
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(camera.quaternion);
            direction.y = 0;
            direction.normalize();
            
            camera.position.add(direction.multiplyScalar(speed));
        }
        
        // 境界チェック
        camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
        camera.position.z = Math.max(-9.5, Math.min(10, camera.position.z));
    } else {
        // 非VRモードでの移動（PC）
        if (keys.w) camera.position.z -= speed;
        if (keys.s) camera.position.z += speed;
        if (keys.a) camera.position.x -= speed;
        if (keys.d) camera.position.x += speed;
        
        // 境界チェック
        camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
        camera.position.z = Math.max(-9.5, Math.min(10, camera.position.z));
    }
}

// ========================================
// 衝突判定
// ========================================
function checkCollisions() {
    const playerPosition = gameState.isVR && renderer.xr.isPresenting 
        ? playerGroup.position 
        : camera.position;
    
    // 星との衝突
    stars.forEach((star, index) => {
        if (!star.userData.collected) {
            const distance = playerPosition.distanceTo(star.position);
            if (distance < 1) {
                collectStar(star);
            }
        }
    });
    
    // 障害物との接近警告
    obstacles.forEach(obstacle => {
        const distance = playerPosition.distanceTo(obstacle.position);
        if (distance < 1.5) {
            // 振動エフェクト（可能な場合）
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }
    });
    
    // ゴール判定
    if (goalDoor) {
        const doorDistance = playerPosition.distanceTo(goalDoor.position);
        if (doorDistance < 1.5 && gameState.starsCollected >= GAME_CONFIG.starsRequired) {
            reachGoal();
        } else if (doorDistance < 2 && gameState.starsCollected < GAME_CONFIG.starsRequired) {
            showMessage(`あと ${GAME_CONFIG.starsRequired - gameState.starsCollected}こ ほしが ひつよう！`);
        }
    }
}

function collectStar(star) {
    star.userData.collected = true;
    star.visible = false;
    
    if (star.userData.light) {
        star.userData.light.visible = false;
    }
    
    gameState.starsCollected++;
    starsCountEl.textContent = gameState.starsCollected;
    
    // 効果音の代わりにバイブレーション
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    // メッセージ
    if (gameState.starsCollected < GAME_CONFIG.starsRequired) {
        const randomMessage = gameState.messages[Math.floor(Math.random() * gameState.messages.length)];
        showMessage(`⭐ ゲット！ ${randomMessage}`);
    } else {
        showMessage("🌟 ぜんぶ あつめた！おふろへ いこう！");
    }
}

function reachGoal() {
    gameState.isPlaying = false;
    
    // カメラモードを停止
    if (gameState.isCameraMode) {
        stopCameraMode();
    }
    
    // ゴール画面表示
    gameUI.classList.add('hidden');
    goalScreen.classList.remove('hidden');
    finalStarsEl.textContent = gameState.starsCollected;
    
    // VRセッション終了
    if (renderer.xr.isPresenting) {
        renderer.xr.getSession().end();
    }
}

// ========================================
// 初期化実行
// ========================================
init();

