import * as THREE from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'https://cdn.skypack.dev/gsap';

// --- Camera Setup ---
const camera = new THREE.PerspectiveCamera(
    // Increased FOV from 10 to 30. A FOV of 10 is very narrow, making the bee hard to see.
    30,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
// Keep camera at z=13. This means the default 'center' of your view is around (0,0,0).
camera.position.z = 13; 
// Optional: Add a helper to visualize the camera frustum for debugging
// const helper = new THREE.CameraHelper( camera );
// scene.add( helper );

const scene = new THREE.Scene();
let bee; // This will refer to the parent group that we move and rotate
let actualBeeModel; // This will refer to the loaded GLTF scene (the actual bee mesh and animation)
let mixer;

const loader = new GLTFLoader();
loader.load('/demon_bee_full_texture.glb',
    function (gltf) {
        actualBeeModel = gltf.scene; // Store the actual loaded model

        // --- VERY IMPORTANT: ADJUST THESE VALUES TO SEE YOUR BEE ---
        // The default scale/position of your GLB might be off.
        // Try these values first, then adjust.
        // For example, if bee is too large, reduce scale. If it's off-center, adjust position.
        
        // Find the bounding box to understand the model's dimensions
        const box = new THREE.Box3().setFromObject(actualBeeModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        console.log("Loaded Bee Model - Size:", size);
        console.log("Loaded Bee Model - Center:", center);

        // --- Suggested Starting Adjustments (Tune these!) ---
        // These values are often good for making models visible initially.
        actualBeeModel.position.set(0, -center.y, 0); // Center the model vertically based on its bounding box
        actualBeeModel.scale.set(3, 3, 3); // Start with a noticeable scale. Adjust up/down.
                                          // If still not visible, try much larger scales like 10, 20.
                                          // If too big, reduce.
        // --- END OF CRITICAL ADJUSTMENTS ---


        // Create a parent group for the bee. We animate this group.
        bee = new THREE.Group();
        bee.add(actualBeeModel); // Add the actual bee model to the group
        scene.add(bee); // Add the group to the scene

        mixer = new THREE.AnimationMixer(actualBeeModel); // Mixer for the actual model's animations
        // Ensure there's at least one animation clip
        if (gltf.animations && gltf.animations.length > 0) {
            mixer.clipAction(gltf.animations[0]).play();
            console.log("Bee animation started.");
        } else {
            console.warn("No animations found in the GLTF model. Animation might not play.");
        }

        console.log("GLTF Model loaded and added to scene. Bee object ready.");
        // Initial call to modelMove to set the bee's initial position/rotation
        modelMove();
    },
    function (xhr) {
        // Optional: Progress callback for loading
        // console.log(`Loading bee: ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`);
    },
    function (error) {
        console.error('An error occurred loading the GLTF model. Check file path and network tab:', error);
    }
);

const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true}); // Added antialias for smoother edges
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container3D').appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 2); // Increased intensity for better visibility
scene.add(ambientLight);

const topLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased intensity
topLight.position.set(5, 5, 5); // Position of the light source
topLight.target.position.set(0, 0, 0); // Where the light is pointing (optional, but good practice)
scene.add(topLight);
scene.add(topLight.target); // Add the target to the scene for it to work

// Optional: Add a second light for better overall illumination
const backLight = new THREE.DirectionalLight(0xffffff, 0.7);
backLight.position.set(-5, -5, -5);
scene.add(backLight);


const reRender3D = () => {
    requestAnimationFrame(reRender3D);
    renderer.render(scene, camera);
    if(mixer) mixer.update(0.02); // Update mixer for the actualBeeModel's animation
};
reRender3D();

// Define target positions and rotations for the bee based on section IDs
let arrPositionModel = [
    {
        id: 'home',
        // This is where the *parent group* (bee) will be.
        // With camera.position.z = 13, setting bee.position.z = 0 places it at the camera's focal point.
        // Adjust Y for vertical offset if needed relative to the screen center.
        position: {x: 0, y: 0, z: 0}, 
        // Rotation in radians. Math.PI * 0.5 is 90 degrees.
        rotation: {x: 0, y: Math.PI * 0.5, z: 0} 
    },
    {
        id: "about",
        position: { x: 1, y: -1, z: -5 },
        rotation: { x: 0.5, y: -0.5, z: 0 },
    },
    {
        id: "skills",
        position: { x: -1, y: -1, z: -5 },
        rotation: { x: 0, y: 0.5, z: 0 },
    },
    {
        id: "education",
        position: { x: 0, y: -1, z: -7 },
        rotation: { x: 0.2, y: 0.8, z: 0 },
    },
    {
        id: "work",
        position: { x: 1.5, y: -1, z: -6 },
        rotation: { x: 0, y: -0.9, z: 0 },
    },
    {
        id: "experience",
        position: { x: -1.5, y: -1, z: -6 },
        rotation: { x: 0.1, y: 0.9, z: 0 },
    },
    {
        id: "contact",
        position: { x: 0.8, y: -1, z: 0 },
        rotation: { x: 0.3, y: -0.5, z: 0 },
    },
];

const modelMove = () => {
    const sections = document.querySelectorAll('.section');
    let currentSection = 'home'; // Default to 'home' if no other section is predominantly visible

    let maxVisibleHeight = 0; // Tracks the largest visible portion of a section

    sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Calculate the overlap of the section with the viewport
        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(viewportHeight, rect.bottom);
        const visibleHeight = visibleBottom - visibleTop;

        // Determine if this section is the most visible AND its top half is in view
        // The condition `rect.top <= viewportHeight * 0.5` ensures we prioritize sections
        // as their top enters the middle of the screen.
        if (visibleHeight > 0 && visibleHeight > maxVisibleHeight && rect.top <= viewportHeight * 0.5) {
             currentSection = section.id;
             maxVisibleHeight = visibleHeight;
        }
    });

    let position_active = arrPositionModel.findIndex(
        (val) => val.id === currentSection // Use strict equality (===)
    );

    if (position_active >= 0 && bee) { // Ensure 'bee' (the group) exists before animating
        let new_coordinates = arrPositionModel[position_active];
        
        // Tween the position of the bee group
        gsap.to(bee.position, {
            x: new_coordinates.position.x,
            y: new_coordinates.position.y,
            z: new_coordinates.position.z,
            duration: 3,
            ease: "power1.out"
        });

        // Tween the rotation of the bee group using directionalRotation for better control
        // "_short" ensures the shortest path for rotation, preventing unexpected full spins.
        gsap.to(bee.rotation, {
            x: new_coordinates.rotation.x + "_short", 
            y: new_coordinates.rotation.y + "_short",
            z: new_coordinates.rotation.z + "_short",
            duration: 3,
            ease: "power1.out"
        });
    }
};

// Event listeners
window.addEventListener('scroll', () => {
    // Only call modelMove if the bee model is loaded
    if (bee) {
        modelMove();
    }
});

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // Re-evaluate bee position on resize, as layout might change
    if (bee) {
        modelMove();
    }
});