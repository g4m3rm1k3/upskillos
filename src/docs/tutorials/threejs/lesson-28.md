# Lesson 28: 3D Audio — PositionalAudio, AudioListener, and the Web Audio API

**What you will build**
In this lesson, you will build a 3D audio system that automatically updates panning and distance attenuation as the camera moves through a scene. This introduces the transferable problem of linking a virtual listener (the camera) to a spatial audio graph (Web Audio API), managing user interaction requirements for audio context resumption, and synchronizing audio scheduling with visual updates.

**What you need to know first**
- Lesson 27: Cameras and Scene Traversal (specifically camera positioning)
- Lesson 14: Mesh Materials and Emissive Properties

**Terms used in this lesson**
- **Web Audio API** — a high-level JavaScript API for processing and synthesizing audio in web applications. It uses a graph-based routing system where audio nodes are connected together to form an audio routing graph.
- **AudioContext** — an audio-processing graph built from audio modules linked together, representing the environment in which audio operations are performed. It provides the timing and execution environment.
- **Autoplay policy** — browser security mechanisms that block audio playback until the user interacts with the page (e.g., via click). This exists to prevent unsolicited noise upon page load.
- **PannerNode** — an audio-processing module representing the position and behavior of an audio source signal in space. It solves the problem of spatializing audio relative to a listener.
- **Inverse distance model** — a mathematical curve defining how volume drops as distance increases. Volume equals the reference distance divided by the sum of reference distance and the product of rolloff factor and the distance past the reference distance.

**Objects and methods used**

**AudioListener**
- *What it is:* A virtual listener representing the user's ears in a 3D scene, wrapping the Web Audio API's context and listener.
- *Implementation:* `new THREE.AudioListener()`
- *Its use:* Attached to the camera to ensure that audio panning and volume match the visual perspective of the camera's position and orientation.
- *Type:* A subclass of `THREE.Object3D`.
- *Responsibility:* Manages the Web Audio API `AudioContext` and updates the spatial listener node based on its own world matrix position and rotation.
- *Depends on:* The browser's native Web Audio API support.
- *Connects to:* Attached as a child to a `THREE.Camera`; serves as the destination for `THREE.Audio` and `THREE.PositionalAudio` sources.
- *Shape:* A high-level Three.js wrapper sitting exactly on the boundary between Three.js scene graph manipulation and browser native audio processing.

**Audio**
- *What it is:* A non-positional (2D) audio source that plays ambient or background sound equally in both ears.
- *Implementation:* `new THREE.Audio(listener)`
- *Its use:* Used to play background music or UI sound effects that should not change volume or pan when the camera moves.
- *Type:* A subclass of `THREE.Object3D`.
- *Responsibility:* Wraps a Web Audio API `GainNode` and `AudioBufferSourceNode` to control playback, volume, and looping of a loaded audio buffer.
- *Depends on:* A `THREE.AudioListener` instance to connect to the context's destination.
- *Connects to:* Receives data from a `THREE.AudioBuffer`; outputs to the `THREE.AudioListener`.
- *Shape:* An internal scene utility node that interacts with the Web Audio graph independently of its world position.

**PositionalAudio**
- *What it is:* A spatial (3D) audio source whose volume and stereo panning change based on its distance and direction relative to an `AudioListener`.
- *Implementation:* `new THREE.PositionalAudio(listener)`
- *Its use:* Attached to 3D objects in the scene so that they emit sound from their specific physical location.
- *Type:* A subclass of `THREE.Audio`.
- *Responsibility:* Manages a Web Audio API `PannerNode`, updating its position automatically as the object it is attached to moves in the scene.
- *Depends on:* A `THREE.AudioListener` instance to calculate relative distance and panning.
- *Connects to:* Attached as a child to a `THREE.Mesh` or `THREE.Object3D`; outputs spatialized audio to the listener.
- *Shape:* A high-level Three.js spatial audio wrapper connecting 3D world transforms to the Web Audio spatialization engine.

**AudioLoader**
- *What it is:* A utility for asynchronously fetching and decoding audio files.
- *Implementation:* `new THREE.AudioLoader()`
- *Its use:* Loads MP3, OGG, or WAV files into an `AudioBuffer` for playback by Three.js audio objects.
- *Type:* A subclass of `THREE.Loader`.
- *Responsibility:* Fetches binary audio data over the network and decodes it using the `AudioContext`.
- *Depends on:* The URL of the audio file; a callback function to handle the loaded buffer.
- *Connects to:* Passes the decoded `AudioBuffer` to `THREE.Audio` or `THREE.PositionalAudio` instances via `.setBuffer()`.
- *Shape:* An asynchronous resource loader operating at the data-fetching layer of the application.

**AudioAnalyser**
- *What it is:* A wrapper for the Web Audio API `AnalyserNode`, used to extract frequency and time-domain data from an audio source.
- *Implementation:* `new THREE.AudioAnalyser(audio, fftSize)`
- *Its use:* Used to drive visual effects (like scaling bars) based on the real-time frequency data of playing audio.
- *Type:* A utility class in Three.js.
- *Responsibility:* Performs Fast Fourier Transforms (FFT) on audio data to provide readable arrays of frequency magnitudes.
- *Depends on:* An active `THREE.Audio` or `THREE.PositionalAudio` instance; an FFT size specifying the resolution.
- *Connects to:* Reads from the audio node; provides `Uint8Array` data to the render loop for mesh modification.
- *Shape:* A read-only analysis boundary bridging the audio processing thread and the visual rendering loop.


## Concept Unit: AudioListener — the ears in the scene

### The Problem
How do we establish a point of reference for hearing sound in a 3D environment? Sound needs a position to be heard from, typically matching what the user sees. What would happen if the ears were disconnected from the eyes in a 3D scene?

### Introduce the concept in isolation
We instantiate an `AudioListener` and attach it to the camera. Browsers block audio by default, so we also need to resume the `AudioContext` on a user interaction.

```javascript
import * as THREE from 'three';

const throwawayCamera = new THREE.PerspectiveCamera();
// AudioListener: represents the listener's position/orientation
// Attaches to the camera so audio perspective matches visual perspective
const listener = new THREE.AudioListener();
throwawayCamera.add(listener);  // listener follows camera automatically

console.log('Listener type:', listener.type);         
console.log('Listener context:', listener.context.constructor.name);  

// AudioContext starts SUSPENDED until user gesture:
document.addEventListener('click', () => {
    if (listener.context.state === 'suspended') {
        listener.context.resume().then(() => {
            console.log('AudioContext running:', listener.context.state);
        });
    }
}, {once: true});

console.log('Initial context state:', listener.context.state);
```
Output:
`Listener type: AudioListener`
`Listener context: AudioContext`
`Initial context state: suspended`
(Upon click): `AudioContext running: running`

This proves that `new THREE.AudioListener()` automatically creates a Web Audio API `AudioContext` internally, and that it begins in a suspended state due to browser autoplay policies.

### Discard the throwaway
This isolated camera and listener are discarded and will not appear in the project again.

### Project Change
- **Reference Source**: No reference counterpart — this is a from-scratch addition because we are introducing audio to the project for the first time.
- **Files affected**: `lesson-28.html`
- **Change type**: Add
- **Location**: Inside the `init` function, right after the camera is created.
- **Dependencies**: Three.js library loaded.

### The New Code
```javascript
const listener = new THREE.AudioListener();
camera.add(listener);

document.addEventListener('click', () => {
    if (listener.context.state === 'suspended') {
        listener.context.resume();
    }
}, {once: true});
```

### The Updated Project
The `init()` function now sets up the audio listener attached to the camera, and we have added an event listener to unlock the audio context.

```javascript
12: function init() {
13:     scene = new THREE.Scene();
14:     camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
15:     camera.position.z = 10;
16: 
17:     // ← new
18:     const listener = new THREE.AudioListener();
19:     camera.add(listener);
20: 
21:     document.addEventListener('click', () => {
22:         if (listener.context.state === 'suspended') {
23:             listener.context.resume();
24:         }
25:     }, {once: true});
26:     // new →
27: 
28:     renderer = new THREE.WebGLRenderer();
29:     renderer.setSize(window.innerWidth, window.innerHeight);
30:     document.body.appendChild(renderer.domElement);
31: }
```

### Mechanical walkthrough
- `new THREE.AudioListener()` creates the listener object that wraps the `AudioContext`.
- `camera.add(listener)` adds the listener as a child `Object3D` of the camera. As the camera moves, the listener's world matrix updates, and Three.js automatically passes the position and orientation to the `AudioContext.listener` node.
- `document.addEventListener('click', ...)` registers a one-time click handler.
- `listener.context.state === 'suspended'` checks if the browser's autoplay policy has blocked audio playback.
- `listener.context.resume()` requests the browser to start the audio processing graph, resolving a promise when successful.

### CS lens
The relationship between the camera and the listener is an application of the composite pattern in a scene graph. By making the listener a child of the camera, the spatial computation for audio inherits the matrix transformations of the visual viewport seamlessly.

### SE lens
Dealing with the `suspended` state explicitly is a defensive programming practice required by modern browser security models. Rather than assuming audio can play immediately, we decouple the instantiation of audio nodes from their activation, gating the latter behind an explicit user gesture.

### Commands needed
Open lesson-28.html in a modern browser.

### Run it
When you load the page, check the console. The audio context remains suspended until you click anywhere on the page, at which point the context resumes and is ready to process sound.

### One sentence connecting to previous unit
Now that we have a listener acting as our ears in the scene, we need a source to generate some sound for it to hear.


## Concept Unit: THREE.Audio — non-positional background audio

### The Problem
Some sounds, like background music or a UI notification, should be heard exactly the same way regardless of where the camera is located. How do we play a sound that bypasses the 3D spatialization entirely?

### Introduce the concept in isolation
We create a standard `THREE.Audio` object and load an MP3 into it.

```javascript
import * as THREE from 'three';

const throwawayListener = new THREE.AudioListener();
const throwawayLoader = new THREE.AudioLoader();
const sound = new THREE.Audio(throwawayListener);  // non-positional (2D)

throwawayLoader.load(
    'https://threejs.org/examples/sounds/ping_pong.mp3',
    (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        console.log('Sound loaded, duration:', buffer.duration.toFixed(2) + 's');
    }
);
console.log('Sound type:', sound.type);
console.log('Is playing:', sound.isPlaying);
```
Output:
`Sound type: Audio`
`Is playing: false`
(After async load): `Sound loaded, duration: 1.54s`

This demonstrates that `THREE.Audio` represents a 2D sound connected directly to the listener, and that the `AudioLoader` asynchronously fetches and decodes the audio into a buffer of known duration.

### Discard the throwaway
This isolated 2D sound loader is discarded. We will focus on 3D positional audio for the main project.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-28.html`
- **Change type**: Add
- **Location**: Inside `init`, establishing a generic background ambient sound.
- **Dependencies**: `listener` must already be created.

### The New Code
```javascript
const audioLoader = new THREE.AudioLoader();
const bgSound = new THREE.Audio(listener);

audioLoader.load('https://threejs.org/examples/sounds/ping_pong.mp3', (buffer) => {
    bgSound.setBuffer(buffer);
    bgSound.setLoop(true);
    bgSound.setVolume(0.1);
    
    document.addEventListener('click', () => {
        if (!bgSound.isPlaying) bgSound.play();
    }, {once: true});
});
```

### The Updated Project
The `init()` function now includes the loading and preparation of a background audio track.

```javascript
21:     document.addEventListener('click', () => {
22:         if (listener.context.state === 'suspended') {
23:             listener.context.resume();
24:         }
25:     }, {once: true});
26: 
27:     // ← new
28:     const audioLoader = new THREE.AudioLoader();
29:     const bgSound = new THREE.Audio(listener);
30: 
31:     audioLoader.load('https://threejs.org/examples/sounds/ping_pong.mp3', (buffer) => {
32:         bgSound.setBuffer(buffer);
33:         bgSound.setLoop(true);
34:         bgSound.setVolume(0.1);
35:         
36:         document.addEventListener('click', () => {
37:             if (!bgSound.isPlaying) bgSound.play();
38:         }, {once: true});
39:     });
40:     // new →
41: 
42:     renderer = new THREE.WebGLRenderer();
```

### Mechanical walkthrough
- `new THREE.AudioLoader()` creates the async loader for fetching the file.
- `new THREE.Audio(listener)` creates a non-positional sound source and links it to our previously created listener.
- `audioLoader.load(url, callback)` fetches the MP3, decodes it into an `AudioBuffer` (PCM samples), and executes the callback.
- `bgSound.setBuffer(buffer)` connects the decoded `AudioBuffer` to the internal `AudioBufferSourceNode`.
- `bgSound.setLoop(true)` sets the `loop` property of the source node so it repeats indefinitely.
- `bgSound.setVolume(0.1)` modifies the `GainNode`'s `gain.value` property in the Web Audio graph to 10% volume.
- `bgSound.play()` starts playback (triggered after the context is resumed via the click gesture).

### CS lens
Audio decoding is an asynchronous, CPU-intensive operation. The loader pattern uses callbacks (or promises) to prevent blocking the main rendering thread while the browser fetches and decodes the compressed MP3 data into raw PCM samples for the graph.

### SE lens
Binding the `play()` call to a user interaction event ensures that we comply with autoplay policies and don't throw errors trying to play audio on a suspended context. We check `!bgSound.isPlaying` to prevent overlapping playback if the user clicks multiple times.

### Commands needed
Open lesson-28.html in a modern browser.

### Run it
Click the page. You will hear the sound play continuously at a low volume. The volume remains identical in both ears regardless of where you might move the camera.

### One sentence connecting to previous unit
While 2D background audio is useful, true 3D environments require sounds that emanate from specific locations in space.


## Concept Unit: THREE.PositionalAudio — spatial 3D sound

### The Problem
If a virtual object in our 3D scene emits a sound, that sound should get louder as we approach it, quieter as we walk away, and pan to the left ear if the object is on our left. How do we spatialize audio to match a physical location?

### Introduce the concept in isolation
We create a `THREE.PositionalAudio` object and attach it to a 3D mesh.

```javascript
import * as THREE from 'three';

const throwawayListener = new THREE.AudioListener();
const posSound = new THREE.PositionalAudio(throwawayListener);

posSound.setRefDistance(1);
posSound.setRolloffFactor(1);

console.log('PositionalAudio type:', posSound.type);
console.log('RefDistance:', posSound.getRefDistance());
```
Output:
`PositionalAudio type: PositionalAudio`
`RefDistance: 1`

This shows that `PositionalAudio` possesses spatial configuration properties like reference distance (the distance at which volume is exactly 1.0) and a rolloff factor (how rapidly the volume drops as distance increases past the reference).

### Discard the throwaway
This isolated positional audio object is discarded. We will create a real one attached to a visible mesh.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-28.html`
- **Change type**: Add
- **Location**: Inside `init`, adding a glowing sphere and attaching a positional sound to it.
- **Dependencies**: `audioLoader` and `listener` must be available.

### The New Code
```javascript
const soundSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 8),
    new THREE.MeshStandardMaterial({color: 0xff8800, emissive: 0xff4400, emissiveIntensity: 2})
);
soundSphere.position.set(3, 1, 0);
scene.add(soundSphere);

const posSound = new THREE.PositionalAudio(listener);
audioLoader.load('https://threejs.org/examples/sounds/ping_pong.mp3', (buf) => {
    posSound.setBuffer(buf);
    posSound.setRefDistance(1);
    posSound.setRolloffFactor(1);
    posSound.setLoop(true);
    document.addEventListener('click', () => posSound.play(), {once: true});
});
soundSphere.add(posSound);
```

### The Updated Project
We introduce a visible source for the sound (a glowing sphere) and bind a `PositionalAudio` instance to it.

```javascript
42:     // ← new
43:     const soundSphere = new THREE.Mesh(
44:         new THREE.SphereGeometry(0.3, 16, 8),
45:         new THREE.MeshStandardMaterial({color: 0xff8800, emissive: 0xff4400, emissiveIntensity: 2})
46:     );
47:     soundSphere.position.set(3, 1, 0);
48:     scene.add(soundSphere);
49: 
50:     const posSound = new THREE.PositionalAudio(listener);
51:     audioLoader.load('https://threejs.org/examples/sounds/ping_pong.mp3', (buf) => {
52:         posSound.setBuffer(buf);
53:         posSound.setRefDistance(1);
54:         posSound.setRolloffFactor(1);
55:         posSound.setLoop(true);
56:         document.addEventListener('click', () => posSound.play(), {once: true});
57:     });
58:     soundSphere.add(posSound);
59:     // new →
60: 
61:     renderer = new THREE.WebGLRenderer();
```

### Mechanical walkthrough
- `new THREE.Mesh(...)` creates the physical representation of our sound source.
- `new THREE.PositionalAudio(listener)` creates a sound source that manages a Web Audio `PannerNode`.
- `posSound.setRefDistance(1)` sets the inverse distance model's reference distance. At a distance of 1 unit, the volume will be exactly 1.0.
- `posSound.setRolloffFactor(1)` dictates how sharply the volume drops. Using the formula `volume = refDistance / (refDistance + rolloffFactor * (distance - refDistance))`, at a distance of 2 units the volume becomes 0.5, and at 5 units it becomes 0.2.
- `soundSphere.add(posSound)` makes the audio node a child of the sphere. The `PannerNode`'s world coordinates now automatically track the sphere's coordinates.

### CS lens
The mathematical model of spatial attenuation (the inverse distance model) is an approximation of the inverse-square law of acoustics in physics. By configuring these parameters, we map physical distances in our arbitrary 3D coordinate system to human-perceptible audio scaling.

### SE lens
Attaching the `PositionalAudio` directly to the `Mesh` utilizes the scene graph to manage state synchronization. We don't have to write a custom loop updating the audio node's `x/y/z` properties manually on every frame; the framework's matrix world updates implicitly keep the audio synced with the visual representation.

### Commands needed
Open lesson-28.html in a modern browser.

### Run it
Click to start the audio. If you move the camera left or right (modifying `camera.position.x`), you will hear the stereo panning shift the sound between your left and right ears, and the volume will decrease as you move further away from the glowing sphere at `(3, 1, 0)`.

### One sentence connecting to previous unit
Now that we have sound correctly positioned in space, we can also extract data from that sound to drive visual effects in real time.


## Concept Unit: AudioAnalyser — frequency data for visualizations

### The Problem
How can we make elements in our 3D scene react to the music or sound effects currently playing? We need a way to mathematically inspect the audio signal as it plays.

### Introduce the concept in isolation
We create an `AudioAnalyser` connected to an existing sound source and observe its output array.

```javascript
import * as THREE from 'three';

const throwawayListener = new THREE.AudioListener();
const throwawaySound = new THREE.Audio(throwawayListener);
// AudioAnalyser: wraps AnalyserNode from Web Audio API
const analyser = new THREE.AudioAnalyser(throwawaySound, 32);  // FFT size 32

const data = analyser.getFrequencyData();
console.log('Data length:', data.length);
```
Output:
`Data length: 16`

This shows that an FFT size of 32 results in exactly 16 usable frequency bins (due to the Nyquist theorem, which dictates that the number of frequency bins is half the FFT size). The data array contains 8-bit integers representing magnitude.

### Discard the throwaway
This isolated analyser is discarded. We will build a real visualizer array.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-28.html`
- **Change type**: Add
- **Location**: At the end of `init` to set up the bars, and inside `animate` to update them.
- **Dependencies**: The `posSound` object must be accessible.

### The New Code
```javascript
const analyser = new THREE.AudioAnalyser(posSound, 32);

const bars = [];
for (let i = 0; i < 16; i++) {
    const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1, 0.1),
        new THREE.MeshStandardMaterial({color: new THREE.Color().setHSL(i/16, 1, 0.5)})
    );
    bar.position.set((i - 8) * 0.15, 0, 0);
    scene.add(bar);
    bars.push(bar);
}

// Inside the animate function:
const data = analyser.getFrequencyData();
for (let i = 0; i < bars.length; i++) {
    bars[i].scale.y = data[i] / 128 + 0.1;
}
```

### The Updated Project
We construct an array of boxes representing the frequency spectrum, and we scale them vertically inside the render loop based on the audio analysis data.

```javascript
60:     // ← new
61:     analyser = new THREE.AudioAnalyser(posSound, 32);
62:     bars = [];
63:     for (let i = 0; i < 16; i++) {
64:         const bar = new THREE.Mesh(
65:             new THREE.BoxGeometry(0.1, 1, 0.1),
66:             new THREE.MeshStandardMaterial({color: new THREE.Color().setHSL(i/16, 1, 0.5)})
67:         );
68:         bar.position.set((i - 8) * 0.15, 0, 0);
69:         scene.add(bar);
70:         bars.push(bar);
71:     }
72:     // new →
73: 
74:     renderer = new THREE.WebGLRenderer();
...
80: function animate() {
81:     requestAnimationFrame(animate);
82: 
83:     // ← new
84:     if (analyser) {
85:         const data = analyser.getFrequencyData();
86:         for (let i = 0; i < bars.length; i++) {
87:             bars[i].scale.y = data[i] / 128 + 0.1;
88:         }
89:     }
90:     // new →
91: 
92:     renderer.render(scene, camera);
93: }
```
*Note: Make `analyser` and `bars` global variables at the top of the file so `animate()` can access them.*

### Mechanical walkthrough
- `new THREE.AudioAnalyser(posSound, 32)` creates the analysis wrapper for our 3D sound, wrapping the `AnalyserNode.getByteFrequencyData()` method.
- `for (let i = 0; i < 16; i++)` creates 16 mesh bars. `data[0]` corresponds to bass frequencies, and `data[15]` corresponds to the highest frequencies in the signal.
- `analyser.getFrequencyData()` returns a `Uint8Array` of length 16, where each value ranges from `0` to `255`.
- `bars[i].scale.y = data[i] / 128 + 0.1` maps the `0-255` value to a physical scale factor. A data value of `0` results in a scale of `0.1`; a value of `128` results in a scale of `1.1`; and `255` results in roughly `2.1`.

### CS lens
The `AnalyserNode` performs a Fast Fourier Transform (FFT) on the time-domain waveform data, converting it into the frequency domain. This allows us to inspect how much energy exists at specific frequency bands at any given moment, rather than just inspecting the raw amplitude of the wave.

### SE lens
Normalizing the raw byte data (`0-255`) into a safe range for visual scale (`0.1` to `2.1`) prevents visual glitching (like negative scaling or zero-height bounds issues) and scales the mathematical data into a visually pleasing aesthetic format.

### Commands needed
Open lesson-28.html in a modern browser.

### Run it
When the sound plays, the 16 colored bars will jump in sync with the audio spectrum, accurately reflecting the frequencies present in the ping-pong sound effect.

### One sentence connecting to previous unit
Visuals reacting to sound are great, but sometimes we need precise, programmatic control over exactly when a sound begins playing relative to the system clock.


## Concept Unit: AudioContext timing and scheduling

### The Problem
Using `setTimeout` or waiting for the `requestAnimationFrame` loop to trigger a sound play results in micro-stutters and drift, ruining rhythm games or precise synchronized effects. How do we schedule audio to play exactly at a specific millisecond?

### Introduce the concept in isolation
We inspect the `AudioContext.currentTime` clock and schedule playback in the future using the Web Audio API directly.

```javascript
import * as THREE from 'three';

const throwawayListener = new THREE.AudioListener();
const ctx = throwawayListener.context;  

const startTime = ctx.currentTime + 2.0;
console.log('Audio will start at:', startTime.toFixed(3) + 's');
console.log('Current audio time:', ctx.currentTime.toFixed(3) + 's');
```
Output:
`Audio will start at: 2.000s`
`Current audio time: 0.000s`

This proves that `ctx.currentTime` is a high-precision, continuously incrementing float that operates entirely independently of the JavaScript event loop or `Date.now()`.

### Discard the throwaway
This timing check is discarded.

### Project Change
- **Reference Source**: No reference counterpart.
- **Files affected**: `lesson-28.html`
- **Change type**: Modify
- **Location**: Inside the `click` event handler for `bgSound`.
- **Dependencies**: The `bgSound` object and its buffer.

### The New Code
```javascript
const ctx = listener.context;
const startTime = ctx.currentTime + 2.0;

const source = ctx.createBufferSource();
source.buffer = bgSound.buffer;
source.connect(ctx.destination);
source.start(startTime);
```

### The Updated Project
Instead of just playing the background sound immediately, we demonstrate how to schedule it in the audio thread natively.

```javascript
36:         document.addEventListener('click', () => {
37:             // ← new
38:             const ctx = listener.context;
39:             const startTime = ctx.currentTime + 2.0;
40:             
41:             const source = ctx.createBufferSource();
42:             source.buffer = bgSound.buffer;
43:             source.connect(ctx.destination);
44:             source.start(startTime);
45:             // new →
46:         }, {once: true});
```

### Mechanical walkthrough
- `listener.context` retrieves the underlying Web Audio `AudioContext`.
- `ctx.currentTime` fetches the high-precision audio clock. If we load the page and click at 5.123s, `currentTime` is 5.123s.
- `startTime = ctx.currentTime + 2.0` calculates exactly 2 seconds into the future.
- `ctx.createBufferSource()` creates a raw Web Audio API node for playback.
- `source.buffer = bgSound.buffer` assigns the decoded PCM data.
- `source.connect(ctx.destination)` wires the output directly to the speakers.
- `source.start(startTime)` instructs the audio engine to schedule playback at exactly that timestamp on the audio clock. 

### CS lens
The JavaScript main thread is non-deterministic regarding execution timing; a heavy frame render can delay a `setTimeout` callback. The Web Audio API processes in blocks (typically 128 samples) on a dedicated audio thread. By scheduling via `source.start()`, we hand the timing responsibility to the audio hardware, which never drifts.

### SE lens
When building rhythm games or tight audio-visual synchronizations, you drive the visual timers and animations based on `ctx.currentTime`, not `Date.now()` or the visual delta time. Visuals can skip frames and catch up, but audio must remain perfectly continuous and accurately scheduled.

### Commands needed
Open lesson-28.html in a modern browser.

### Run it
Click the page. You will immediately hear the 3D positional ping pong sound begin, but the background 2D sound will wait precisely 2.0 seconds before starting.

### One sentence connecting to previous unit
You now have total control over 2D audio, 3D spatial audio, audio visualization, and exact playback timing.


## Closing
### Connect the pieces
Trace the lifecycle of our `PositionalAudio` on the `soundSphere` at `(3, 1, 0)`: as the camera moves from `(0, 0, 10)` to `(0, 0, 5)`, the distance to the sphere reduces from 10.44 units to 5.83 units. The Web Audio `PannerNode` distance calculation recognizes this closure, the volume increases according to the inverse distance model, and the stereo panning shifts further into the right ear—all while the `AudioAnalyser` continually pulls FFT data from that node to scale our visual bars in perfect harmony with the `AudioContext`'s high-precision clock.
