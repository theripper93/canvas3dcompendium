# Adding Properties & Behaviours
[Back to main page](https://github.com/theripper93/canvas3dcompendium/blob/master/wiki/ParticleSystem.md)

We can now add properties to the effect in any order to alter it's appearance

### `.alpha(start,end)`

This property requires start and end to be numbers between 0 and 1 - sets the starting and ending opacity of particles

### `.arc(integer)`

This property takes an integer and indicates how many times the projectile will curve before reaching it's destination. Default is 0

### `.color(start,end)`

This will determine the starting and ending color of the effect, only start can be provided. start and end can also be arrays of colors (eg `.color([color1,color2],[color3,color4])`.
If an array of colors is provided for start\end the system will pick one of those colors randomly as the starting\ending color - it will **NOT** create a multicolor gradient.
The colors can be in any format, HEX is recomended but you can use any CSS compatible color - even using `"red"` will work.

### `.delay(milliseconds)`

If `.repeat()` is set, this will be the delay between each repeat.

### `.duration(milliseconds)`

Duration in milliseconds of the effect, valid only for "ray". Default is 300 milliseconds

### `.emitterSize(number)`

Size of the area of emission, the larger the number the more spread out the particles will be in their starting point. Default is 0.0001

### `.force(number)`
If using an explosion, set the force of the explosion, default is 15.
This will determine the force with which the particles are propelled from the origin. Higher numbers will result in faster particles.

### `.gravity(number)`

Gravity affecting the particles - 1 is Earth gravity.
Higher numbers means particles will travel down faster depending on their mass.
Negative gravity is also possible if you want particles to go up instead.

### `.life(min, max)`

Range in milliseconds of the lifetime of a particle, bigger numbers will equal to longer trails. default (100,500). A single value is also accepted.

### `.mass(number)`

The Mass of the particle, this will affect how much gravity pulls down the particle. Default is 100.

### `.miss()`

If added to the effect, it will miss the target. You can also call `.miss(Boolean)` if you prefer.

### `.name(string)`

You can give a name to an effect, if you do so, you can call the `.stop()` method using this name and all effects with this name will be stopped.

### `.onEnd(particle3D)`

You can pass another particle3D or an array of particle3d to the `.onEnd` method, if you do so, these effects will be played when the main effect ends, you can nest this how many times you want but **DO NOT** call the `.start()` method on Particle3D inside the `.onEnd()` method. Does not trigger when the effect is terminated by `.stop()`

### `.push(dx,dy,dz)`

The pushing force affecting the particles, this is a method generally used internally for fixed emitters - it will create an effect on the particles as if a force was pushing them in a specific direction. Default is (0,0,0).

### `.rate(particles,milliseconds)`

The Rate of the emitter, where particles is the amount of particles in the system and milliseconds is how often the system creates a particle. Default (12, 16)

### `.repeat(integer)`

The number of times to repeat the effect

### `.scale(min,max)`

The minimum and maximum size in grid units of a single particle. Default is (0.1,0.2)

### `.speed(number)`

The speed of the projectile. Default is 10.

### `.sprite(pathToFile)`

The path to the image to be used as particle. Default is `"modules/levels-3d-preview/assets/particles/emberssmall.png"` you can find many particles in that same folder.
