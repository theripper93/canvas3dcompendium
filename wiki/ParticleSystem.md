# Particle System

3D Canvas includes a particle system meant for spell effects, the system is highly customizable but also very simple to use for basic projectiles

## Creating and effect

To start creating your effect simply call

```js
new Particle3D(type)
```
`type` is the type of particle effect, at the moment the options are:

| Effect     | type         | type(short) |
|------------|--------------|-------------|
| Projectile | "projectile" | "p"         |
| Sprite     | "sprite"     | "s"         |

If not type is provided the default is `"p"`

Now you can start chaining properties, similar to how Sequencer works.
First we must provide an origin and a destination.

```js
new Particle3D(type)
  .from(origin)
  .to(destination)
```

Origin and destination can be ether a placeable object (for example a token) or a position eg. `{ x:0, y:0, z:0 }` where z is in elevation units. The destination can also be an array of multiple destinations.

Let's set up our origin as the selected token and the destination as our targets

```js
new Particle3D(type)
  .from(_token)
  .to(Array.from(game.user.targets))
```

At this point we can `.start()` our Particle3D to play the effect and the default settings will be used (it will look like a firebolt)

```js
new Particle3D(type)
  .from(_token)
  .to(Array.from(game.user.targets))
.start()
```

We can now add properties to the effect in any order to alter it's appearance

### `.arc(integer)`
This propertie takes an integer and indicates how many times the projectile will curve before reaching it's destination. Default is 0

### `.color(start,end)`
This will determine the starting and ending color of the effect, only start can be provided. start and end can also be arrays of colors (eg `.color([color1,color2],[color3,color4])`
The colors can be in any format, HEX is recomended but you can use any CSS compatible color - even using `"red"` will work.

### `.delay(milliseconds)`
If `.repeat()` is set, this will be the delay between each repeat.

### `.emitterSize(integer)`
Size of the area of emission, the larger the number the more spread out the particles will be in their starting point. Default is 0.0001

### `.gravity(number)`
Gravity affecting the particles - 1 is Earth gravity.
