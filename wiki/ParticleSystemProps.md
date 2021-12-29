# Adding Properties & Behaviours

We can now add properties to the effect in any order to alter it's appearance

### `.arc(integer)`
This property takes an integer and indicates how many times the projectile will curve before reaching it's destination. Default is 0

### `.color(start,end)`
This will determine the starting and ending color of the effect, only start can be provided. start and end can also be arrays of colors (eg `.color([color1,color2],[color3,color4])`
The colors can be in any format, HEX is recomended but you can use any CSS compatible color - even using `"red"` will work.

### `.delay(milliseconds)`
If `.repeat()` is set, this will be the delay between each repeat.

### `.duration(milliseconds)`
Duration in milliseconds of the effect, valid only for "ray". Default is 2 seconds

### `.emitterSize(number)`
Size of the area of emission, the larger the number the more spread out the particles will be in their starting point. Default is 0.0001

### `.gravity(number)`
Gravity affecting the particles - 1 is Earth gravity.

### `.life(min, max)`
Range in seconds of the lifetime of a particle, bigger numbers will equal to longer trails. default (0.1,0.5). A single value is also accepted.

### `.mass(number)`
The Mass of the particle, this will affect how much gravity pulls down the particle. Default is 100.

### `.miss()`
If added to the effect will miss the target. You can also call `.miss(Boolean)` if you prefer.

### `.name(string)`
You can give a name to an effect, if you do so, you can call the `.stop()` method using this name and all effects with this name will be stopped.

### `.onEnd(particle3D)`
You can pass another particle3D or an array of particle3d to the `.onEnd` method, if you do so, these effects will be played when the main effect ends, you can nest this how many times you want but **DO NOT** call the `.start()` method on Particle3D inside the `.onEnd()` method. Does not trigger when the effect is terminated by `.stop()`

### `.rate(particles,seconds)`
The Rate of the emitter, where particles is the amount of particles in the system and seconds is how often the system creates a particle. Default (12, 0.016)

### `.repeat(integer)`
The number of times to repeat the effect

### `.scale(min,max)`

The minimum and maximum size of a single particle. Default is (0.1,0.2)

### `.speed(number)`

The speed of the projectile. Default is 10.

### `.sprite(pathToFile)`

The path to the image to be used as particle. Default is `"modules/levels-3d-preview/assets/particles/emberssmall.png"` you can find many particles in that same folder.