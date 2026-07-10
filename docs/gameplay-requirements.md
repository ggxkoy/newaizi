# Video Defense Gameplay Requirements

## Core Experience

This project is a vertical 3D video-playable defense game. It is not a forward-running parkour game.

- The main character stays near the bridge entrance and only moves horizontally.
- The main character is the existing female character model. Do not use a cube or any other placeholder as the controllable character.
- The character faces forward toward the incoming enemies.
- The character shoots automatically in a straight forward direction.
- There is no auto-targeting and no fixed turret.

## Bridge Layout

The combat area is a bridge split into two separate parallel paths.

- The left path contains attackable upgrade props only.
- The right path is the enemy approach path.
- Enemies always approach from the front on the right path.
- The player can move horizontally between the paths to choose whether to attack props or enemies.

## Combat Rules

- Bullets travel only forward from the player position.
- Bullets expire after a fixed maximum travel distance.
- A bullet that collides with an enemy consumes the bullet and deals damage.
- Standard enemies have 1 HP and die from one damage.
- Boss HP must equal the numeric value shown above the boss at all times.

## Upgrade Props

- Left-path props have HP and can be hit by forward bullets.
- Destroying a prop grants its upgrade immediately.
- The initial upgrade increases bullet damage and reduces the firing interval.

## Presentation Direction

- Reuse the original project 3D character, road, prop, and enemy assets wherever possible.
- The provided vertical desert video is the visual reference and will be used as the basis for the later video presentation layer.
- Gameplay readability takes priority: left props, right enemies, player position, bullets, and boss HP must remain clear throughout.
