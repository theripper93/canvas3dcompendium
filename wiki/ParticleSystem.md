# Particle System

3D Canvas includes a particle system meant for spell effects, the system is highly customizable but also very simple to use for basic projectiles

## Creating an Effect

First create a `Script Macro`, then to start creating your effect simply call

```js
new Particle3D(type)
```
`type` is the type of particle effect, at the moment the options are:

| Effect     | type         | type(short) |
|------------|--------------|-------------|
| Projectile | "projectile" |     "p"     |
| Sprite     | "sprite"     |     "s"     |
| Ray        | "ray"        |     "r"     |
| Explosion  | "explosion"  |     "e"     |

If no type is provided the default is `"p"`

Now you can start chaining properties, similar to how Sequencer works. Every time you call a `.method()` on a `Particle3D` it will always return the `Particle3D` object, allowing for chaining. The only exception is the `.start()` method that will return the ID if the `Particle3D`
First we must provide an origin and a destination.

```js
new Particle3D(type)
  .from(origin)
  .to(destination)
```

### `.from()` & `.to()`

These two methods are required on every effects, each one can take a single `Token` or an array of `Tokens` or a single `Position` or an array of them. Non `Token` placeables are also supported.
A `Position` is defined by `{ x:0, y:0, z:0 }` where `z` is in elevation units.
`Explosion` effects are the exception as they do not require a `.from()`

**Note:** You can omit both `.from()` and `.to()` when creating an effect inside `.onEnd()`. In that case the `.to()` will be set as the target of that particular effect (usefull for exploding bolts for example)


Let's set up our origin as the selected token and the destination as our targets

```js
new Particle3D(type)
  .from(token)
  .to(Array.from(game.user.targets))
```

At this point we can `.start()` our Particle3D to play the effect and the default settings will be used (it will look like a firebolt)

```js
new Particle3D(type)
  .from(token)
  .to(Array.from(game.user.targets))
.start()
```

### `.start()`

The `.start()` method takes no arguments and will simply start the effect. After using this method you should **NOT** interact with the `Particle3D` anymore. Use the returned ID instead if you wish to stop the effect, see the `Stopping an Effect` section below.
If you wish you can call `.start(false)` to only play the effect locally.


## Adding Properties & Behaviours

### Check the [Properties & Behaviours Documentation](https://github.com/theripper93/canvas3dcompendium/blob/master/wiki/ParticleSystemProps.md)

## Stopping an Effect

When creating an effect, the effect will return it's id. You can use this Id later to stop the effect. You can also execute `Particle3D.stop("all")` to stop all effects.
If you used the `.name()` property on effect creation you can also `.stop(name)` to stop all effects with that name.

## Try it yourself!

These are several examples showcasing the Particle3D system that are a good starting point for understanding the system and creating your own custom effects. Create new `Script Macros` in your game with the code blocks below to try them out in 3DCanvas and see the different effects. You can adjust the variables to see how those influence the effects. These macros are also all available to import directly in the `3D Canvas Particle Effects` macro compendium!
Simply select a token, target some tokens and run the macros, you will see them in action!

## Examples:

### Frostbolt:

```js
new Particle3D("p")
  .from(token)
  .to(Array.from(game.user.targets))
  .sprite("modules/levels-3d-preview/assets/particles/star_09.png")
  .speed(10)
  .color("#0f4fff","#4dd5ff")
  .scale(0.7)
.start()
```

### Bouncing Frostbolt (onEnd Example):

`Note: the .onEnd() parameter accepts another Particle3D, don't forget that you must not call .start() on the Particle3D inside the .onEnd() - The Particle3D insde the .onEnd() can have an .onEnd() as well, allowing for infinite chaining`

```js
new Particle3D("p")
  .from(canvas.tokens.controlled)
  .to(Array.from(game.user.targets))
  .speed(10)
  .color("#0f4fff","#4dd5ff")
  .scale(0.8)
  .onEnd(
        new Particle3D("p")
          .from(Array.from(game.user.targets))
          .to(canvas.tokens.controlled)
          .speed(10)
          .color("#0f4fff","#4dd5ff")
          .scale(0.8)
  )
.start()
```

### Magic Missile:

`Note: The .arc() parameter will make each projectile curve in a different direction!`

```js
new Particle3D("p")
  .from(token)
  .to(Array.from(game.user.targets))
  .speed(8)
  .repeat(3)
  .arc(1)
  .delay(300)
  .color("#ffffff","#2e4aff")
  .scale(0.7)
.start()
```

### Shocking Grasp

`Note: Ray Effects tend to require a larger amount of particles, don't forget to set .rate()!`

```js
new Particle3D("r")
  .from(token)
  .to(Array.from(game.user.targets))
  .sprite("modules/levels-3d-preview/assets/particles/spark_04.png")
  .color("blue","#2e4aff")
  .scale(0.7)
  .rate(100,1)
.start()
```

### Scorching Ray

```js
new Particle3D("r")
  .from(token)
  .to(Array.from(game.user.targets))
  .sprite("modules/levels-3d-preview/assets/particles/flame_01.png")
  .color("red","orange")
  .scale(0.5)
  .repeat(3)
  .duration(250)
  .delay(600)
  .rate(100,1)
.start()
```

### Dubstep Gun:

`Note: The .color() parameter can accept Arrays of colors.`

```js
new Particle3D("p")
  .from(token)
  .to(Array.from(game.user.targets))
  .sprite("modules/levels-3d-preview/assets/particles/slash_03.png")
  .repeat(3)
  .delay(200)
  .speed(10)
  .color(["red","blue"],["green","yellow"])
.start()
```

### Fireball Explosion:

`Note: Explosion effects do not need a .from(), this is the only exception.`

```js
new Particle3D("e")
  .to(Array.from(game.user.targets))
  .sprite("modules/levels-3d-preview/assets/particles/dust.png")
  .speed(0)
  .color("red","orange")
  .scale(2,2)
  .gravity(2)
  .life(700)
  .rate(10,1)
  .emitterSize(1)
  .alpha(0.1,0)
  .mass(400)
.start()
```

### Wall of fire (stop example):

`Note: Notice how the new Particle3D() is assigned to a variable, then a set timeout stops the effect after 1000 milliseconds. With the same logic you could store the Id and stop an effect on concentration end.`

```js
const effectId = new Particle3D("r")
  .from(token)
  .to(Array.from(game.user.targets))
  .sprite("modules/levels-3d-preview/assets/particles/flame_01.png")
  .color("red","orange")
  .scale(1.5)
  .duration(Infinity)
  .rate(100,1)
  .gravity(-5)
.start()

setTimeout(()=>{Particle3D.stop(effectId)}, 1000)
```


### Wall of fire (stop with name example):

`Note: Once you assign a name you can stop the effect from a completely different macro.`

```js
const effectId = new Particle3D("r")
  .from(token)
  .to(Array.from(game.user.targets))
  .sprite("modules/levels-3d-preview/assets/particles/flame_01.png")
  .color("red","orange")
  .name("Wall of Fire")
  .scale(1.5)
  .duration(Infinity)
  .rate(100,1)
  .gravity(-5)
.start()

//In a different macro later on - we stop the effect
Particle3D.stop("Wall of Fire")
```

### Spirit Bolt (Explosion Chaining example)

`Note: The .to() is omitted from the .onEnd() explosion effect so that the explosion plays on the target hit.`

```js
new Particle3D("p")
  .from(token)
  .to(Array.from(game.user.targets))
  .speed(15)
  .arc(1)
  .color("#c034eb","#5819b5")
  .scale(1)
  .onEnd(
new Particle3D("e")
  .sprite("modules/levels-3d-preview/assets/particles/dust.png")
  .speed(0)
  .color("#c034eb","#291547")
  .scale(0.9,0.9)
  .gravity(-5)
  .life(1700)
  .force(3)
  .rate(50,1)
  .emitterSize(0.05)
  .alpha(0.1,0)
  .mass(200)
        )
.start()
```

### Magic Missile (MIDI-QOL on use Macro)

```js
const lastArg = args[args.length-1]
const casterToken = canvas.tokens.get(lastArg.tokenId)
const targets = lastArg.hitTargets
new Particle3D("p")
  .from(casterToken)
  .to(targets)
  .speed(8)
  .repeat(3)
  .arc(1)
  .delay(200)
  .color("#ffffff","#2e4aff")
  .scale(0.7)
.start()
```

