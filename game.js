let scene, camera, renderer;

// دالة بناء العالم ثلاثي الأبعاد
function init3DWorld() {
    // 1. إخفاء واجهة القائمة وتفريغ الشاشة للعبة
    document.body.innerHTML = ''; 

    // 2. إعداد المشهد (Scene) ولون السماء
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // لون سماء أزرق فاتح

    // 3. إعداد الكاميرا (Camera)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15); // نرفعو الكاميرا شوية باش نشوفو الأرض

    // 4. إعداد المصير (Renderer) لي يرسم اللعبة في المتصفح
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 5. إضافة الإضاءة (Lighting) باش يبانو البلوكات
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 6. بناء الأرضية (شبكة من البلوكات 10x10)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // لون أخضر تاع حشيش

    for (let x = -5; x < 5; x++) {
        for (let z = -5; z < 5; z++) {
            const block = new THREE.Mesh(geometry, material);
            block.position.set(x, 0, z); // نحطو كل بلوك في بلاصتو
            scene.add(block);
        }
    }

    // 7. تشغيل حلقة الرسم (Animation Loop)
    animate();
}

// دالة تحريك وتحديث الشاشة
function animate() {
    requestAnimationFrame(animate);
    
    // دوران خفيف للكاميرا باش تشوف العالم 3D
    camera.position.x = Math.sin(Date.now() * 0.001) * 15;
    camera.position.z = Math.cos(Date.now() * 0.001) * 15;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

// ربط أزرار "لعب فردي" و "عالم جديد" باش يبداو اللعبة
document.addEventListener('DOMContentLoaded', () => {
    const singleplayerBtn = document.getElementById('singleplayer-btn');
    const newWorldBtn = document.getElementById('new-world-btn');

    if (singleplayerBtn) singleplayerBtn.addEventListener('click', init3DWorld);
    if (newWorldBtn) newWorldBtn.addEventListener('click', init3DWorld);
});
