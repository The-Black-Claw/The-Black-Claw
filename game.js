// ==========================================
// إعدادات اللعبة الأساسية
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // لون السماء أزرق فاتح
// إضافة ضباب (Fog) يبدأ من مسافة 20 وينتهي في 60، يخفي تحميل القطع ويحسن الأداء
scene.fog = new THREE.Fog(0x87ceeb, 20, 60); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 20, 0);

// إيقاف الـ antialias مهم جداً لزيادة الـ FPS في الهواتف الاقتصادية
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // تقليل دقة الشاشة قليلاً لتخفيف الضغط
document.body.appendChild(renderer.domElement);

// إضاءة بسيطة
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040)); // إضاءة محيطية

// ==========================================
// إعدادات نظام الـ Chunks والـ Voxel
// ==========================================
const chunkSize = 16;
const renderDistance = 2; // مسافة الرؤية (2 تعني 2 قطع في كل اتجاه = خفيفة على الرام)
const geometry = new THREE.BoxGeometry(1, 1, 1);
// استخدام مادة بسيطة بدون تفاصيل معقدة لتسريع الرسم
const material = new THREE.MeshLambertMaterial({ color: 0x55aa55 }); 

const chunks = new Map(); // لتخزين القطع النشطة
const chunkPool = []; // مسبح الكائنات (Object Pool) لإعادة الاستخدام

// مصفوفة مؤقتة لتحديد مكان كل بلوك داخل الـ InstancedMesh
const matrix = new THREE.Matrix4();

// ==========================================
// نظام توليد القطع (Chunk Generation)
// ==========================================

// دالة بسيطة لتوليد ارتفاع الأرض (بديل لـ Perlin Noise باش مانستعملوش مكتبات خارجية)
function getHeight(x, z) {
    return Math.floor(Math.sin(x / 5) * 3 + Math.cos(z / 5) * 3 + 10);
}

// دالة للحصول على Chunk من الـ Pool أو إنشاء واحد جديد
function getChunkMesh() {
    if (chunkPool.length > 0) {
        return chunkPool.pop();
    }
    // الحد الأقصى للبلوكات في Chunk هو 16x16x16 بصح راح نرسمو غير السطح لتقليل العدد
    const mesh = new THREE.InstancedMesh(geometry, material, chunkSize * chunkSize);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
}

// دالة بناء الـ Chunk
function buildChunk(chunkX, chunkZ) {
    const mesh = getChunkMesh();
    let blockCount = 0;

    const startX = chunkX * chunkSize;
    const startZ = chunkZ * chunkSize;

    // حلقة لإنشاء البلوكات (نرسم البلوكات السطحية فقط لزيادة الأداء بشكل هائل)
    for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
            const worldX = startX + x;
            const worldZ = startZ + z;
            const h = getHeight(worldX, worldZ);
            
            // تحديد موقع البلوك
            matrix.setPosition(worldX, h, worldZ);
            mesh.setMatrixAt(blockCount, matrix);
            blockCount++;
        }
    }

    mesh.count = blockCount;
    mesh.instanceMatrix.needsUpdate = true;
    
    // تحديث الـ Bounding Sphere مهم جداً لتفعيل الـ Frustum Culling
    mesh.computeBoundingSphere();
    
    mesh.position.set(0, 0, 0); // المواقع راهي محددة داخل الـ Matrix
    scene.add(mesh);
    chunks.set(`${chunkX},${chunkZ}`, mesh);
}

// ==========================================
// التحميل غير المتزامن (Asynchronous Loading)
// ==========================================
const chunksQueue = [];
let isLoading = true;
let totalChunksToLoad = 0;

function updateChunks() {
    const currentChunkX = Math.floor(camera.position.x / chunkSize);
    const currentChunkZ = Math.floor(camera.position.z / chunkSize);

    // 1. تحديد القطع اللي لازم تتبنى
    for (let x = -renderDistance; x <= renderDistance; x++) {
        for (let z = -renderDistance; z <= renderDistance; z++) {
            const cx = currentChunkX + x;
            const cz = currentChunkZ + z;
            const key = `${cx},${cz}`;
            
            if (!chunks.has(key) && !chunksQueue.some(c => c.x === cx && c.z === cz)) {
                chunksQueue.push({ x: cx, z: cz });
            }
        }
    }

    // 2. إخفاء القطع البعيدة وإضافتها للـ Pool (Object Pooling)
    for (let [key, mesh] of chunks.entries()) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx - currentChunkX) > renderDistance || Math.abs(cz - currentChunkZ) > renderDistance) {
            scene.remove(mesh);
            chunkPool.push(mesh);
            chunks.delete(key);
        }
    }
}

// دالة تعالج القطع حبة بحبة باش اللعبة ما تتبلوكاش (تجنب الـ Lag Spikes)
function processChunkQueue() {
    if (chunksQueue.length > 0) {
        // بناء Chunk واحد في كل إطار (Frame)
        const chunk = chunksQueue.shift();
        buildChunk(chunk.x, chunk.z);

        // تحديث شريط التحميل الأولي
        if (isLoading) {
            const progress = ((totalChunksToLoad - chunksQueue.length) / totalChunksToLoad) * 100;
            const loadingBar = document.getElementById('loading-progress');
            if(loadingBar) loadingBar.style.width = `${progress}%`;
        }
    } else if (isLoading) {
        // انتهى التحميل الأولي
        isLoading = false;
        const mainMenu = document.getElementById('main-menu');
        const loadingScreen = document.getElementById('loading-screen');
        if (mainMenu) mainMenu.style.display = 'block';
        if (loadingScreen) loadingScreen.style.display = 'none';
    }
}

// ==========================================
// التحكم (WASD + Space)
// ==========================================
const keys = { w: false, a: false, s: false, d: false, space: false };
let velocity = new THREE.Vector3();
let speed = 0.2;
let isFlying = false;

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key) || key === ' ') {
        if (key === ' ') {
            keys['space'] = true;
            isFlying = !isFlying; // تبديل وضع الطيران
        } else {
            keys[key] = true;
        }
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key) || key === ' ') {
        if (key === ' ') keys['space'] = false;
        else keys[key] = false;
    }
});

function updateControls() {
    if (isLoading) return; // منع الحركة أثناء التحميل

    // استخراج اتجاه الكاميرا للحركة بشكل صحيح
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; // منع الحركة لفوق/تحت عند المشي
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    velocity.set(0, 0, 0);

    if (keys.w) velocity.add(forward);
    if (keys.s) velocity.sub(forward);
    if (keys.a) velocity.sub(right);
    if (keys.d) velocity.add(right);

    velocity.normalize().multiplyScalar(speed);
    
    // الطيران
    if (isFlying) {
        if (keys.space) camera.position.y += speed;
    } else {
        // جاذبية بسيطة ومحاكاة المشي على الأرض
        const currentH = getHeight(camera.position.x, camera.position.z);
        if (camera.position.y > currentH + 2) {
            camera.position.y -= 0.1; // سقوط
        } else {
            camera.position.y = currentH + 2; // البقاء فوق الأرض
        }
    }

    camera.position.add(velocity);
}

// دالة لبدء اللعبة من القائمة
window.startGame = function() {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.style.display = 'none';
    
    // قفل الماوس للتحكم بالكاميرا
    document.body.requestPointerLock();
};

// تحريك الكاميرا بالماوس
document.body.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        camera.rotation.y -= e.movementX * 0.002;
        camera.rotation.x -= e.movementY * 0.002;
        // منع الكاميرا من الانقلاب
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x)); 
    }
});

// ==========================================
// حلقة اللعبة (Game Loop)
// ==========================================

// بدء التحميل الأولي
updateChunks();
totalChunksToLoad = chunksQueue.length;

function animate() {
    requestAnimationFrame(animate);
    
    processChunkQueue(); // بناء بلوك واحد كل إطار لتجنب التجميد
    
    if (!isLoading) {
        updateControls();
        updateChunks(); // التحقق من القطع الجديدة بناءً على مكان اللاعب
    }
    
    renderer.render(scene, camera);
}

animate();

// تحديث الشاشة عند تدوير الهاتف
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

