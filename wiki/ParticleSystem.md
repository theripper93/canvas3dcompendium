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
