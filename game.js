let scene, camera, renderer;
let player; // اللاعب
const keys = { w: false, a: false, s: false, d: false, space: false }; // أزرار التحكم
let lastTime = performance.now();

// دالة بناء العالم ثلاثي الأبعاد
function init3DWorld() {
    // 1. إخفاء واجهة القائمة بدل مسح كلشي
    const menu = document.getElementById('main-menu'); // غيّر 'main-menu' لـ ID القائمة تاعك
    if (menu) menu.style.display = 'none'; 

    // حماية: إذا كان المشهد مبنياً من قبل، ما تعاودش تبنيه
    if (scene) return; 

    // 2. إعداد المشهد
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    // إضافة ضباب (Fog) لتحسين الأداء وإخفاء حدود العالم
    scene.fog = new THREE.Fog(0x87CEEB, 10, 50); 

    // 3. إعداد الكاميرا
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);
    player = camera; // اللاعب هو الكاميرا دابا

    // 4. إعداد المصير
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // دقة الشاشة
    document.body.appendChild(renderer.domElement);

    // 5. الإضاءة
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 6. بناء الأرضية باستخدام InstancedMesh (الحل السحري للأداء)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // لون أخضر تاع حشيش

    const count = 100; // 10x10 = 100 مكعب
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    
    let index = 0;
    for (let x = -5; x < 5; x++) {
        for (let z = -5; z < 5; z++) {
            dummy.position.set(x, 0, z);
            dummy.updateMatrix();
            mesh.setMatrixAt(index++, dummy.matrix);
        }
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh); // نضيفو mesh واحد برك فيه 100 مكعب!

    // 7. التحكم بالكيبورد (WASD + Space)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') keys.w = true;
        if (e.code === 'KeyA') keys.a = true;
        if (e.code === 'KeyS') keys.s = true;
        if (e.code === 'KeyD') keys.d = true;
        if (e.code === 'Space') keys.space = true;
    });
    document.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') keys.w = false;
        if (e.code === 'KeyA') keys.a = false;
        if (e.code === 'KeyS') keys.s = false;
        if (e.code === 'KeyD') keys.d = false;
        if (e.code === 'Space') keys.space = false;
    });

    // 8. تشغيل اللعبة
    animate(performance.now());
}

// دالة التحديث والرسم
function animate(time) {
    requestAnimationFrame(animate);
    
    // حساب الوقت بين كل إطار (Delta Time) باش الحركة تكون سلسة
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    // حركة اللاعب (WASD)
    const speed = 5 * delta;
    if (keys.w) player.position.z -= speed;
    if (keys.s) player.position.z += speed;
    if (keys.a) player.position.x -= speed;
    if (keys.d) player.position.x += speed;
    
    // وضع الطيران (Space)
    if (keys.space) player.position.y += speed;

    // فيزياء بسيطة: منع اللاعب من السقوط تحت الأرض
    if (player.position.y < 2) player.position.y = 2;

    renderer.render(scene, camera);
}

// ربط الأزرار
document.addEventListener('DOMContentLoaded', () => {
    const singleplayerBtn = document.getElementById('singleplayer-btn');
    const newWorldBtn = document.getElementById('new-world-btn');

    if (singleplayerBtn) singleplayerBtn.addEventListener('click', init3DWorld);
    if (newWorldBtn) newWorldBtn.addEventListener('click', init3DWorld);
});
