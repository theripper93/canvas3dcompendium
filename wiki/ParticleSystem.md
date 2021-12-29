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
